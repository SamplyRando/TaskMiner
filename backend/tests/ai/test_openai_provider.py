import asyncio
from datetime import date, datetime, timezone
import json
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
from openai import (
    APIConnectionError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    RateLimitError,
)
from pydantic import BaseModel, ValidationError
import pytest

from app.ai.openai_provider import OpenAIProvider
from app.ai.provider import (
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderRefusalError,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
)
from app.ai.schemas import (
    AIGeneratedMilestone,
    AIGeneratedTask,
    AIProjectChangePlanRequest,
    AIProjectContext,
    AIProjectPlanRequest,
    AIProjectPlanningContext,
    AIProjectPlanResponse,
    AIProjectTaskContext,
    AITaskChangeState,
    AIWorkspaceMemberContext,
)
from app.models.task import TaskPriority, TaskStatus
from app.models.workspace_member import WorkspaceMemberRole


def valid_plan() -> AIProjectPlanResponse:
    return AIProjectPlanResponse(
        summary="A concise launch proposal for review.",
        tasks=[
            AIGeneratedTask(
                title="Define launch scope",
                description="Confirm scope and constraints.",
                priority=TaskPriority.HIGH,
                status=TaskStatus.TODO,
                suggested_due_date=date(2026, 8, 20),
                milestone="Planning",
                order=1,
                depends_on=[],
            ),
            AIGeneratedTask(
                title="Run launch validation",
                description="Validate the release candidate.",
                priority=TaskPriority.URGENT,
                status=TaskStatus.TODO,
                suggested_due_date=date(2026, 8, 30),
                milestone="Launch",
                order=2,
                depends_on=[1],
            ),
        ],
        milestones=[
            AIGeneratedMilestone(
                name="Planning",
                description="Scope is approved.",
                suggested_due_date=date(2026, 8, 20),
                order=1,
            ),
            AIGeneratedMilestone(
                name="Launch",
                description="Release is ready.",
                suggested_due_date=date(2026, 9, 1),
                order=2,
            ),
        ],
        warnings=[],
    )


def recommendation_first_plan(
    *,
    summary: str,
    task_specs: list[tuple[str, str]],
    warnings: list[str],
) -> AIProjectPlanResponse:
    return AIProjectPlanResponse(
        summary=summary,
        tasks=[
            AIGeneratedTask(
                title=title,
                description=description,
                priority=TaskPriority.HIGH if order == 1 else TaskPriority.MEDIUM,
                status=TaskStatus.TODO,
                suggested_due_date=None,
                milestone="Exécution",
                order=order,
                depends_on=[] if order == 1 else [order - 1],
                suggested_assignee_id=None,
            )
            for order, (title, description) in enumerate(task_specs, start=1)
        ],
        milestones=[
            AIGeneratedMilestone(
                name="Exécution",
                description="Le déroulement recommandé a été réalisé et vérifié.",
                suggested_due_date=None,
                order=1,
            )
        ],
        warnings=warnings,
    )


def project_context() -> AIProjectContext:
    return AIProjectContext(
        id=uuid4(),
        name="API launch",
        description="Prepare the API release.",
        tasks=[
            AIProjectTaskContext(
                id=uuid4(),
                state=AITaskChangeState(
                    title="API authentication",
                    description="Complete the authentication API.",
                    status=TaskStatus.TODO,
                    priority=TaskPriority.MEDIUM,
                    due_date=datetime(2026, 9, 20, 12, tzinfo=timezone.utc),
                ),
                assigned_user_id=uuid4(),
                assigned_user_name="Private member name",
            )
        ],
    )


def provider_with_result(result: object) -> tuple[OpenAIProvider, AsyncMock]:
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=result, output=[]))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )
    return provider, parse


def test_project_plan_uses_responses_structured_output_without_storage() -> None:
    plan = valid_plan()
    provider, parse = provider_with_result(plan)
    request = AIProjectPlanRequest(
        workspace_id=uuid4(),
        prompt="Prepare a six-week ecommerce launch plan.",
        target_date=date(2026, 9, 1),
    )

    result = asyncio.run(provider.generate_project_plan(request))

    assert result.value == plan
    assert result.usage is None
    assert parse.await_args is not None
    kwargs = parse.await_args.kwargs
    assert kwargs["model"] == "gpt-5.6-luna"
    assert kwargs["text_format"] is AIProjectPlanResponse
    assert kwargs["store"] is False
    assert kwargs["timeout"] == 30.0
    sent = json.loads(kwargs["input"])
    assert sent == {
        "available_members": [],
        "brief": request.prompt,
        "current_project": None,
        "current_workspace": None,
        "target_date": "2026-09-01",
        "planning_mode": "new_project",
    }
    assert str(request.workspace_id) not in kwargs["input"]
    assert "Never state or imply" in kwargs["instructions"]
    assert "Never invent people, organizations" in kwargs["instructions"]
    assert "smallest sufficient set" in kwargs["instructions"]
    assert "Safe recommendation" in kwargs["instructions"]
    assert "language used by the user's brief" in kwargs["instructions"]
    assert 'Do not use "To determine"' in kwargs["instructions"]
    assert "An operational choice is not a missing fact" in kwargs["instructions"]
    assert (
        "you MUST provide a context-specific recommended approach"
        in kwargs["instructions"]
    )
    assert "relative execution windows" in kwargs["instructions"]
    assert "Do not add a warning merely because" in kwargs["instructions"]
    warnings_schema = AIProjectPlanResponse.model_json_schema()["properties"][
        "warnings"
    ]
    assert "unresolved factual inputs" in warnings_schema["description"]
    assert "Do not warn merely" in warnings_schema["description"]


def test_project_plan_sends_minimal_member_context_and_accepts_known_assignee() -> None:
    member_id = uuid4()
    context = AIProjectPlanningContext(
        workspace_name="Payments team",
        project_name="Production billing",
        project_description="Validate the existing Stripe integration.",
        assignable_members=[
            AIWorkspaceMemberContext(
                user_id=member_id,
                display_name="Ada Lovelace",
                role=WorkspaceMemberRole.MEMBER,
            )
        ],
    )
    plan = valid_plan()
    plan.tasks[
        0
    ].description = (
        "Validate the existing Stripe integration and record the review outcome."
    )
    plan.tasks[0].suggested_assignee_id = member_id
    provider, parse = provider_with_result(plan)
    request = AIProjectPlanRequest(
        workspace_id=uuid4(),
        prompt="Prepare a six-week ecommerce launch plan.",
    )

    result = asyncio.run(provider.generate_project_plan(request, context))

    assert result.value.tasks[0].suggested_assignee_id == member_id
    assert "Stripe" in (result.value.tasks[0].description or "")
    assert parse.await_args is not None
    sent = json.loads(parse.await_args.kwargs["input"])
    assert sent["available_members"] == [
        {
            "display_name": "Ada Lovelace",
            "role": "member",
            "user_id": str(member_id),
        }
    ]
    assert sent["current_workspace"] == {"name": "Payments team"}
    assert sent["current_project"] == {
        "description": "Validate the existing Stripe integration.",
        "name": "Production billing",
    }
    assert "email" not in parse.await_args.kwargs["input"]
    assert "provider/tool category" in parse.await_args.kwargs["instructions"]


def test_project_plan_accepts_external_details_only_when_supplied() -> None:
    plan = valid_plan()
    plan.tasks[0].description = (
        "Verify the supplied resource and record the result. "
        "Success criterion: https://docs.example.test/runbook is reviewed."
    )
    provider, _ = provider_with_result(plan)

    result = asyncio.run(
        provider.generate_project_plan(
            AIProjectPlanRequest(
                workspace_id=uuid4(),
                prompt=(
                    "Prepare an execution plan using the existing runbook at "
                    "https://docs.example.test/runbook."
                ),
            )
        )
    )

    assert "https://docs.example.test/runbook" in (
        result.value.tasks[0].description or ""
    )


def test_french_plan_normalizes_legacy_english_unknown_placeholders() -> None:
    plan = valid_plan()
    plan.summary = "Plan de lancement ; modalités exactes : To determine."
    plan.tasks[
        0
    ].description = "Sélectionner les utilisateurs pilotes. Canal : To be determined."
    plan.warnings = ["Format de collecte : to determine."]
    provider, _ = provider_with_result(plan)

    result = asyncio.run(
        provider.generate_project_plan(
            AIProjectPlanRequest(
                workspace_id=uuid4(),
                prompt=(
                    "Organise le lancement de mon application auprès de mes dix "
                    "premiers utilisateurs."
                ),
            )
        )
    )

    serialized = result.value.model_dump_json()
    assert "To determine" not in serialized
    assert "to determine" not in serialized
    assert "À confirmer" in serialized


def test_project_plan_accepts_safe_recommendations_without_invented_facts() -> None:
    plan = valid_plan()
    plan.tasks[0].description = (
        "Constituer une liste de dix profils correspondant à l’usage décrit. "
        "Recommandation : prioriser les profils selon leur pertinence et leur "
        "disponibilité, puis confirmer la sélection avant invitation. "
        "Terminé lorsque dix candidats sont prêts à recevoir l’onboarding."
    )
    plan.tasks[0].suggested_due_date = None
    plan.tasks[0].suggested_assignee_id = None
    provider, _ = provider_with_result(plan)

    result = asyncio.run(
        provider.generate_project_plan(
            AIProjectPlanRequest(
                workspace_id=uuid4(),
                prompt=(
                    "Organise le lancement de mon application auprès de mes dix "
                    "premiers utilisateurs."
                ),
            )
        )
    )

    first_task = result.value.tasks[0]
    assert first_task.description is not None
    assert "Recommandation" in first_task.description
    assert first_task.suggested_due_date is None
    assert first_task.suggested_assignee_id is None


def test_taskminer_first_users_launch_is_recommendation_first() -> None:
    prompt = (
        "Organise le lancement de mon application SaaS TaskMiner auprès de mes "
        "10 premiers utilisateurs"
    )
    plan = recommendation_first_plan(
        summary=(
            "Plan recommandé pour sélectionner, accompagner et écouter les dix "
            "premiers utilisateurs de TaskMiner."
        ),
        task_specs=[
            (
                "Sélectionner dix utilisateurs pilotes",
                "Constituer une liste de dix profils pertinents. Recommandation : "
                "prioriser leur adéquation avec l’usage visé et leur disponibilité. "
                "Terminé lorsque dix profils sont prêts à être contactés.",
            ),
            (
                "Préparer l’onboarding TaskMiner",
                "Dans les deux premiers jours, préparer un parcours court couvrant "
                "l’accès, la première action utile et le canal d’aide recommandé. "
                "Terminé lorsqu’un utilisateur peut suivre le parcours sans aide.",
            ),
            (
                "Préparer les accès et invitations",
                "Après validation de la liste, vérifier les accès puis préparer un "
                "message individuel précisant l’objectif du test et les prochaines "
                "étapes. Terminé lorsque les dix invitations sont prêtes.",
            ),
            (
                "Envoyer les invitations",
                "Le jour suivant la préparation, contacter chaque pilote via son "
                "canal de recrutement. Recommandation : centraliser les réponses "
                "pour suivre les confirmations. Terminé lorsque chaque envoi est "
                "tracé.",
            ),
            (
                "Accompagner la première utilisation",
                "Pendant les trois à cinq jours suivant l’invitation, répondre aux "
                "blocages et noter les étapes incomprises. Terminé lorsque chaque "
                "pilote actif a pu réaliser le parcours principal.",
            ),
            (
                "Recueillir les retours",
                "À l’issue de la période d’essai, recommander un questionnaire court "
                "complété par un échange bref avec les volontaires. Terminé lorsque "
                "les retours exploitables sont regroupés.",
            ),
            (
                "Prioriser les améliorations",
                "Après la collecte, classer les retours par fréquence, impact et "
                "caractère bloquant. Recommandation : retenir d’abord les problèmes "
                "qui empêchent l’usage principal. Terminé avec une liste ordonnée.",
            ),
        ],
        warnings=[
            "À confirmer : l’identité des dix utilisateurs cibles n’a pas été fournie."
        ],
    )
    provider, parse = provider_with_result(plan)

    result = asyncio.run(
        provider.generate_project_plan(
            AIProjectPlanRequest(workspace_id=uuid4(), prompt=prompt)
        )
    )

    serialized = result.value.model_dump_json()
    descriptions = " ".join(task.description or "" for task in result.value.tasks)
    assert parse.await_args is not None
    assert json.loads(parse.await_args.kwargs["input"])["brief"] == prompt
    assert "TaskMiner" in serialized
    assert serialized.casefold().count("à confirmer") == 1
    assert "to determine" not in serialized.casefold()
    assert descriptions.count("Recommandation") >= 2
    assert "deux premiers jours" in descriptions
    assert "trois à cinq jours" in descriptions
    assert "Après la collecte" in descriptions
    assert all(task.suggested_due_date is None for task in result.value.tasks)
    assert all(task.suggested_assignee_id is None for task in result.value.tasks)
    assert all(
        milestone.suggested_due_date is None for milestone in result.value.milestones
    )
    assert result.value.warnings == [
        "À confirmer : l’identité des dix utilisateurs cibles n’a pas été fournie."
    ]


def test_unrelated_project_brief_uses_the_same_recommendation_hierarchy() -> None:
    prompt = "Organise la migration de notre base documentaire vers un nouvel outil."
    plan = recommendation_first_plan(
        summary="Plan recommandé pour migrer les documents avec un contrôle progressif.",
        task_specs=[
            (
                "Inventorier les documents à migrer",
                "Pendant la première étape, classer les documents par usage, "
                "sensibilité et propriétaire. Terminé avec un inventaire vérifiable.",
            ),
            (
                "Tester un lot pilote",
                "Recommandation : migrer d’abord un petit lot représentatif, puis "
                "contrôler l’accès, la lisibilité et la recherche avant de poursuivre.",
            ),
            (
                "Migrer et contrôler le solde",
                "Après validation du lot pilote, migrer les documents restants par "
                "lots et consigner les écarts. Terminé lorsque chaque lot est vérifié.",
            ),
        ],
        warnings=[
            "À confirmer : l’outil de destination et les accès autorisés ne sont pas "
            "précisés."
        ],
    )
    provider, _ = provider_with_result(plan)

    result = asyncio.run(
        provider.generate_project_plan(
            AIProjectPlanRequest(workspace_id=uuid4(), prompt=prompt)
        )
    )

    serialized = result.value.model_dump_json()
    assert serialized.casefold().count("à confirmer") == 1
    assert "Recommandation" in serialized
    assert "première étape" in serialized
    assert "Après validation" in serialized
    assert "http" not in serialized.casefold()
    assert "@" not in serialized
    assert all(task.suggested_due_date is None for task in result.value.tasks)
    assert all(task.suggested_assignee_id is None for task in result.value.tasks)


def test_project_plan_rejects_fabricated_contact_details() -> None:
    plan = valid_plan()
    plan.tasks[
        0
    ].description = (
        "Contact made-up@example.test and obtain written approval before delivery."
    )
    provider, _ = provider_with_result(plan)

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a concrete launch plan with accountable reviews.",
                )
            )
        )


@pytest.mark.parametrize(
    "title",
    [
        "Contact suppliers",
        "Prepare communication",
        "Find partners",
        "Configure a service",
        "Check integration",
    ],
)
def test_project_plan_rejects_generic_filler_titles(title: str) -> None:
    plan = valid_plan()
    plan.tasks[0].title = title
    provider, _ = provider_with_result(plan)

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a concrete and execution-ready launch plan.",
                )
            )
        )


def test_project_plan_rejects_repeated_tasks() -> None:
    plan = valid_plan()
    plan.tasks[1].title = f"  {plan.tasks[0].title.upper()}  "
    provider, _ = provider_with_result(plan)

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a concrete and execution-ready launch plan.",
                )
            )
        )


def test_project_plan_rejects_an_assignee_outside_supplied_context() -> None:
    plan = valid_plan()
    plan.tasks[0].suggested_assignee_id = uuid4()
    provider, _ = provider_with_result(plan)

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a six-week ecommerce launch plan.",
                ),
                AIProjectPlanningContext(assignable_members=[]),
            )
        )


def test_project_plan_returns_provider_token_usage_for_server_metering() -> None:
    plan = valid_plan()
    parse = AsyncMock(
        return_value=SimpleNamespace(
            output_parsed=plan,
            output=[],
            usage=SimpleNamespace(
                input_tokens=321,
                input_tokens_details=SimpleNamespace(
                    cached_tokens=120,
                    cache_write_tokens=80,
                ),
                output_tokens=123,
                total_tokens=444,
            ),
        )
    )
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    result = asyncio.run(
        provider.generate_project_plan(
            AIProjectPlanRequest(
                workspace_id=uuid4(),
                prompt="Prepare a valid structured project proposal.",
            )
        )
    )

    assert result.usage is not None
    assert result.usage.input_tokens == 321
    assert result.usage.output_tokens == 123
    assert result.usage.total_tokens == 444
    assert result.usage.cached_input_tokens == 120
    assert result.usage.cache_write_input_tokens == 80


def test_project_change_uses_only_safe_context_and_server_owned_identity() -> None:
    context = project_context()
    task = context.tasks[0]
    assert task is not None

    async def parse_response(**kwargs: object) -> object:
        response_model = cast(type[BaseModel], kwargs["text_format"])
        parsed = response_model.model_validate(
            {
                "summary": "One API task should be updated.",
                "changes": [
                    {
                        "task_id": str(task.id),
                        "after": {
                            **task.state.model_dump(mode="json"),
                            "priority": "high",
                        },
                        "reason": "The instruction targets the API task.",
                    }
                ],
                "warnings": [],
            }
        )
        return SimpleNamespace(output_parsed=parsed, output=[])

    parse = AsyncMock(side_effect=parse_response)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )
    request = AIProjectChangePlanRequest(
        workspace_id=uuid4(),
        project_id=context.id,
        instruction="Mets toutes les tâches API en priorité haute.",
    )

    result = asyncio.run(provider.generate_project_change_plan(request, context))

    assert result.value.project_id == context.id
    assert len(result.value.changes) == 1
    change = result.value.changes[0]
    assert change is not None
    assert change.task_id == task.id
    assert change.task_title == task.state.title
    assert change.before == task.state
    assert change.after.priority == TaskPriority.HIGH
    assert change.changed_fields == ["priority"]
    assert parse.await_args is not None
    sent = parse.await_args.kwargs["input"]
    assert str(task.id) in sent
    assert "Private member name" not in sent
    assert str(task.assigned_user_id) not in sent


def test_french_change_plan_normalizes_legacy_english_placeholder() -> None:
    context = project_context()
    task = context.tasks[0]

    async def parse_response(**kwargs: object) -> object:
        response_model = cast(type[BaseModel], kwargs["text_format"])
        parsed = response_model.model_validate(
            {
                "summary": "Une modification est proposée.",
                "changes": [
                    {
                        "task_id": str(task.id),
                        "after": {
                            **task.state.model_dump(mode="json"),
                            "description": "Modalités exactes : To determine.",
                        },
                        "reason": "Recommandation à confirmer avant application.",
                    }
                ],
                "warnings": ["Responsable : To be determined."],
            }
        )
        return SimpleNamespace(output_parsed=parsed, output=[])

    parse = AsyncMock(side_effect=parse_response)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    result = asyncio.run(
        provider.generate_project_change_plan(
            AIProjectChangePlanRequest(
                workspace_id=uuid4(),
                project_id=context.id,
                instruction="Précise la description de la tâche API existante.",
            ),
            context,
        )
    )

    assert result.value.changes[0].after.description == (
        "Modalités exactes : À confirmer."
    )
    assert result.value.warnings == ["Responsable : À confirmer."]


def test_unknown_task_id_in_change_output_fails_safely() -> None:
    context = project_context()

    async def parse_response(**kwargs: object) -> object:
        response_model = cast(type[BaseModel], kwargs["text_format"])
        parsed = response_model.model_validate(
            {
                "summary": "Unsafe proposal.",
                "changes": [
                    {
                        "task_id": str(uuid4()),
                        "after": context.tasks[0].state.model_dump(mode="json"),
                        "reason": "Unknown task.",
                    }
                ],
                "warnings": [],
            }
        )
        return SimpleNamespace(output_parsed=parsed, output=[])

    parse = AsyncMock(side_effect=parse_response)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_change_plan(
                AIProjectChangePlanRequest(
                    workspace_id=uuid4(),
                    project_id=context.id,
                    instruction="Mets la tâche inconnue en priorité haute.",
                ),
                context,
            )
        )


def test_model_refusal_fails_without_exposing_refusal_content() -> None:
    parse = AsyncMock(
        return_value=SimpleNamespace(
            output_parsed=None,
            output=[
                SimpleNamespace(
                    type="message",
                    content=[SimpleNamespace(type="refusal", refusal="private")],
                )
            ],
        )
    )
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(AIProviderRefusalError) as exc_info:
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a valid structured project proposal.",
                )
            )
        )

    assert "private" not in str(exc_info.value)


def test_invalid_structured_output_fails_safely() -> None:
    with pytest.raises(ValidationError) as validation_error:
        AIProjectPlanResponse.model_validate({"summary": "incomplete"})
    parse = AsyncMock(side_effect=validation_error.value)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(AIProviderResponseError):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a valid structured project proposal.",
                )
            )
        )


@pytest.mark.parametrize(
    ("sdk_error", "expected_error"),
    [
        (
            APITimeoutError(httpx.Request("POST", "https://api.openai.com")),
            AIProviderTimeoutError,
        ),
        (
            APIConnectionError(request=httpx.Request("POST", "https://api.openai.com")),
            AIProviderUnavailableError,
        ),
        (
            AuthenticationError(
                "invalid credential",
                response=httpx.Response(
                    401,
                    request=httpx.Request("POST", "https://api.openai.com"),
                ),
                body=None,
            ),
            AIProviderAuthenticationError,
        ),
        (
            RateLimitError(
                "rate limited",
                response=httpx.Response(
                    429,
                    request=httpx.Request("POST", "https://api.openai.com"),
                ),
                body=None,
            ),
            AIProviderRateLimitError,
        ),
    ],
)
def test_provider_errors_are_mapped_to_taskminer_errors(
    sdk_error: Exception,
    expected_error: type[Exception],
) -> None:
    parse = AsyncMock(side_effect=sdk_error)
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    provider = OpenAIProvider(
        api_key="tests-only-key",
        model="gpt-5.6-luna",
        client=cast(AsyncOpenAI, client),
    )

    with pytest.raises(expected_error):
        asyncio.run(
            provider.generate_project_plan(
                AIProjectPlanRequest(
                    workspace_id=uuid4(),
                    prompt="Prepare a valid structured project proposal.",
                )
            )
        )
