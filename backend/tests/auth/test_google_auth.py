from collections.abc import Generator
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import cast
from uuid import UUID

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_google_credential_verifier
from app.auth.google import (
    GoogleCredentialInvalidError,
    GoogleIdentityClaims,
)
from app.models.external_auth import ExternalAuthAttempt, ExternalAuthIdentity
from app.models.user import User
from app.models.workspace_subscription import WorkspaceSubscription
from app.subscriptions.plans import PlanCode, SubscriptionSource, SubscriptionStatus
from app.main import app
from tests.factories.users import RegisteredUser
from tests.factories.workspaces import WorkspaceFactory


ORIGIN_HEADERS = {"Origin": "http://localhost:3000"}


def normalized_credential(value: str) -> str:
    return value.ljust(32, ".")


class FakeGoogleVerifier:
    def __init__(self) -> None:
        self.claims_by_credential: dict[str, GoogleIdentityClaims] = {}
        self.expected_nonce: str | None = None

    def add(
        self,
        credential: str,
        *,
        subject: str,
        email: str,
        full_name: str | None = "Google User",
    ) -> None:
        self.claims_by_credential[normalized_credential(credential)] = (
            GoogleIdentityClaims(
                subject=subject,
                email=email,
                full_name=full_name,
            )
        )

    def verify(self, credential: str, *, nonce: str) -> GoogleIdentityClaims:
        self.expected_nonce = nonce
        try:
            return self.claims_by_credential[credential]
        except KeyError as exc:
            raise GoogleCredentialInvalidError from exc


@pytest.fixture
def google_verifier() -> Generator[FakeGoogleVerifier, None, None]:
    verifier = FakeGoogleVerifier()
    app.dependency_overrides[get_google_credential_verifier] = lambda: verifier
    yield verifier
    app.dependency_overrides.pop(get_google_credential_verifier, None)


def create_attempt(
    client: TestClient,
    *,
    headers: dict[str, str] | None = None,
    link: bool = False,
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/google/link/attempt" if link else "/api/v1/auth/google/attempt",
        headers={**(headers or {}), **ORIGIN_HEADERS},
    )
    assert response.status_code == 200, response.text
    return cast(dict[str, str], response.json())


def exchange(
    client: TestClient,
    attempt: dict[str, str],
    credential: str,
    *,
    headers: dict[str, str] | None = None,
    link: bool = False,
):
    return client.post(
        "/api/v1/auth/google/link" if link else "/api/v1/auth/google",
        headers={**(headers or {}), **ORIGIN_HEADERS},
        json={
            "attempt_id": attempt["attempt_id"],
            "nonce": attempt["nonce"],
            "credential": normalized_credential(credential),
        },
    )


def test_google_registration_creates_verified_user_and_normal_session(
    client: TestClient,
    database_session: Session,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "new-google-token",
        subject="google-subject-1",
        email="new-google@example.com",
        full_name="New Google User",
    )
    attempt = create_attempt(client)

    response = exchange(client, attempt, "new-google-token")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["is_new_user"] is True
    assert payload["user"]["email"] == "new-google@example.com"
    assert payload["user"]["email_verified_at"] is not None
    assert google_verifier.expected_nonce == attempt["nonce"]
    user_id = payload["user"]["id"]
    identity = database_session.scalar(
        select(ExternalAuthIdentity).where(
            ExternalAuthIdentity.provider_subject == "google-subject-1"
        )
    )
    assert identity is not None
    assert str(identity.user_id) == user_id
    assert database_session.scalar(select(func.count(User.id))) == 1

    auth_headers = {"Authorization": f"Bearer {payload['access_token']}"}
    workspace = client.post(
        "/api/v1/workspaces",
        headers=auth_headers,
        json={"name": "Google workspace", "description": None},
    )
    assert workspace.status_code == 201
    summary = client.get(
        f"/api/v1/workspaces/{workspace.json()['id']}/subscription",
        headers=auth_headers,
    )
    assert summary.status_code == 200
    assert summary.json()["plan"] == "free"


def test_existing_google_identity_restores_same_taskminer_account(
    client: TestClient,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "google-token",
        subject="stable-google-subject",
        email="stable@example.com",
    )
    first = exchange(client, create_attempt(client), "google-token")
    second = exchange(client, create_attempt(client), "google-token")

    assert first.status_code == second.status_code == 200
    assert first.json()["is_new_user"] is True
    assert second.json()["is_new_user"] is False
    assert second.json()["user"]["id"] == first.json()["user"]["id"]


def test_existing_password_email_is_not_automatically_merged(
    client: TestClient,
    user: RegisteredUser,
    database_session: Session,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "collision-token",
        subject="unlinked-subject",
        email=user.email,
    )

    response = exchange(client, create_attempt(client), "collision-token")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "google_account_link_required"
    assert database_session.scalar(select(func.count(User.id))) == 1
    assert database_session.scalar(select(func.count(ExternalAuthIdentity.id))) == 0


def test_authenticated_user_can_securely_link_matching_google_account(
    client: TestClient,
    user: RegisteredUser,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "link-token",
        subject="linked-google-subject",
        email=user.email,
    )
    attempt = create_attempt(client, headers=user.headers, link=True)

    linked = exchange(
        client,
        attempt,
        "link-token",
        headers=user.headers,
        link=True,
    )

    assert linked.status_code == 200
    assert linked.json()["linked"] is True
    status_response = client.get("/api/v1/auth/google/link", headers=user.headers)
    assert status_response.status_code == 200
    assert status_response.json() == {"linked": True}

    login = exchange(client, create_attempt(client), "link-token")
    assert login.status_code == 200
    assert login.json()["user"]["id"] == str(user.id)


def test_link_requires_same_verified_email(
    client: TestClient,
    user: RegisteredUser,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "wrong-email-token",
        subject="other-google-subject",
        email="different@example.com",
    )
    attempt = create_attempt(client, headers=user.headers, link=True)

    response = exchange(
        client,
        attempt,
        "wrong-email-token",
        headers=user.headers,
        link=True,
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "google_account_email_mismatch"


def test_google_attempt_is_one_time_and_replay_is_rejected(
    client: TestClient,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "one-time-token",
        subject="one-time-subject",
        email="one-time@example.com",
    )
    attempt = create_attempt(client)

    assert exchange(client, attempt, "one-time-token").status_code == 200
    replay = exchange(client, attempt, "one-time-token")

    assert replay.status_code == 400
    assert replay.json()["detail"]["code"] == "google_auth_attempt_invalid"


def test_simultaneous_google_callbacks_create_one_account(
    client: TestClient,
    database_session: Session,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "concurrent-token",
        subject="concurrent-subject",
        email="concurrent@example.com",
    )
    attempt = create_attempt(client)

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(
            executor.map(
                lambda _: exchange(client, attempt, "concurrent-token"),
                range(2),
            )
        )

    assert sorted(response.status_code for response in responses) == [200, 400]
    assert database_session.scalar(select(func.count(User.id))) == 1
    assert database_session.scalar(select(func.count(ExternalAuthIdentity.id))) == 1


def test_google_reconnection_preserves_existing_stripe_subscription(
    client: TestClient,
    user: RegisteredUser,
    workspace_factory: WorkspaceFactory,
    database_session: Session,
    google_verifier: FakeGoogleVerifier,
) -> None:
    workspace = workspace_factory.create(user)
    subscription = database_session.scalar(
        select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace.id
        )
    )
    assert subscription is not None
    subscription.plan_code = PlanCode.PRO
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.source = SubscriptionSource.STRIPE
    subscription.stripe_customer_id = "cus_google_auth_preserved"
    subscription.stripe_subscription_id = "sub_google_auth_preserved"
    database_session.commit()
    google_verifier.add(
        "subscription-token",
        subject="subscription-subject",
        email=user.email,
    )
    link_attempt = create_attempt(client, headers=user.headers, link=True)
    linked = exchange(
        client,
        link_attempt,
        "subscription-token",
        headers=user.headers,
        link=True,
    )
    assert linked.status_code == 200

    login = exchange(client, create_attempt(client), "subscription-token")

    assert login.status_code == 200
    database_session.expire_all()
    preserved = database_session.get(WorkspaceSubscription, subscription.id)
    assert preserved is not None
    assert preserved.plan_code == PlanCode.PRO
    assert preserved.stripe_customer_id == "cus_google_auth_preserved"
    assert preserved.stripe_subscription_id == "sub_google_auth_preserved"


def test_google_link_endpoints_require_taskminer_authentication(
    client: TestClient,
    google_verifier: FakeGoogleVerifier,
) -> None:
    status_response = client.get("/api/v1/auth/google/link")
    attempt_response = client.post(
        "/api/v1/auth/google/link/attempt",
        headers=ORIGIN_HEADERS,
    )

    assert status_response.status_code == 401
    assert attempt_response.status_code == 401


def test_invalid_google_credential_and_untrusted_origin_are_rejected(
    client: TestClient,
    google_verifier: FakeGoogleVerifier,
) -> None:
    attempt = create_attempt(client)
    invalid = exchange(client, attempt, "invalid-token")
    untrusted = client.post(
        "/api/v1/auth/google/attempt",
        headers={"Origin": "https://attacker.example"},
    )

    assert invalid.status_code == 401
    assert invalid.json()["detail"]["code"] == "google_credential_invalid"
    assert untrusted.status_code == 403
    assert untrusted.json()["detail"]["code"] == "google_auth_origin_not_allowed"


def test_expired_google_attempt_is_rejected(
    client: TestClient,
    database_session: Session,
    google_verifier: FakeGoogleVerifier,
) -> None:
    google_verifier.add(
        "expired-token",
        subject="expired-subject",
        email="expired@example.com",
    )
    attempt = create_attempt(client)
    database_attempt = database_session.get(
        ExternalAuthAttempt,
        UUID(attempt["attempt_id"]),
    )
    assert database_attempt is not None
    database_attempt.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    database_session.commit()

    response = exchange(client, attempt, "expired-token")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "google_auth_attempt_expired"
