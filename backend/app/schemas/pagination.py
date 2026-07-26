from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


ItemT = TypeVar("ItemT")


class PaginatedResponse(BaseModel, Generic[ItemT]):
    model_config = ConfigDict(extra="forbid")

    items: list[ItemT]
    total: int = Field(ge=0)
    skip: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
