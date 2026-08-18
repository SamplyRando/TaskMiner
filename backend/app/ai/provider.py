from typing import Protocol

from app.ai.schemas import (
    AIProjectChangePlanRequest,
    AIProjectChangePlanResponse,
    AIProjectContext,
    AIProjectPlanRequest,
    AIProjectPlanResponse,
)


class AIProvider(Protocol):
    """Provider-neutral contract for project-plan generation."""

    async def generate_project_plan(
        self,
        request: AIProjectPlanRequest,
    ) -> AIProjectPlanResponse:
        """Generate a structured draft without mutating TaskMiner resources."""
        ...

    async def generate_project_change_plan(
        self,
        request: AIProjectChangePlanRequest,
        context: AIProjectContext,
    ) -> AIProjectChangePlanResponse:
        """Generate task changes from a safe server-owned project snapshot."""
        ...
