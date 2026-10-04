from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _unique_user_ids(values: list[UUID]) -> list[UUID]:
    return list(dict.fromkeys(values))


class CommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=2000)
    mentioned_user_ids: list[UUID] = Field(default_factory=list, max_length=50)

    _deduplicate_mentions = field_validator("mentioned_user_ids")(_unique_user_ids)


class CommentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    content: str | None = Field(default=None, min_length=1, max_length=2000)
    mentioned_user_ids: list[UUID] | None = Field(default=None, max_length=50)

    @field_validator("mentioned_user_ids")
    @classmethod
    def deduplicate_mentions(cls, values: list[UUID] | None) -> list[UUID] | None:
        return _unique_user_ids(values) if values is not None else None

    @model_validator(mode="after")
    def reject_null_content(self) -> Self:
        if "content" in self.model_fields_set and self.content is None:
            raise ValueError("content cannot be null")
        return self


class CommentMentionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    display_name: str


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    task_id: UUID
    author_id: UUID
    author_name: str
    content: str
    mentions: list[CommentMentionRead]
    created_at: datetime
    updated_at: datetime
