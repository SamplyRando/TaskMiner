from typing import Protocol

from app.ai.schemas import AIProjectPlanRequest, AIProjectPlanResponse


class AIProvider(Protocol):
    """Provider-neutral contract for project-plan generation."""

    async def generate_project_plan(
        self,
        request: AIProjectPlanRequest,
    ) -> AIProjectPlanResponse:
        """Generate a structured draft without mutating TaskMiner resources."""
        ...
