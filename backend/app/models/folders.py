from __future__ import annotations

from pydantic import BaseModel, Field


class ReceiptFolder(BaseModel):
    id: str
    name: str
    createdAt: int
    updatedAt: int


class CreateFolderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class UpdateFolderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
