from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    filename: str
    content_type: str
    file_size: int
    task_id: UUID
    created_at: datetime
    updated_at: datetime
