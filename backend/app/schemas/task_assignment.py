from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TaskAssignmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assigned_user_id: UUID
