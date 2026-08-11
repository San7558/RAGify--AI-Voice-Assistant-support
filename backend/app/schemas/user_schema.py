from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    """
    API response schema for a user profile.
    Mirrors UserModel fields but serialises _id → id.
    """
    id: str
    firebase_uid: str
    email: Optional[str]
    name: Optional[str]
    photo_url: Optional[str]
    status: str
    created_at: Optional[datetime]
    last_login_at: Optional[datetime]
    document_count: int = 0
    question_count: int = 0

    @classmethod
    def from_mongo(cls, doc: dict, document_count: int = 0, question_count: int = 0) -> "UserResponse":
        return cls(
            id=str(doc["_id"]),
            firebase_uid=doc.get("firebase_uid", ""),
            email=doc.get("email"),
            name=doc.get("name"),
            photo_url=doc.get("photo_url"),
            status=doc.get("status", "active"),
            created_at=doc.get("created_at"),
            last_login_at=doc.get("last_login_at"),
            document_count=document_count,
            question_count=question_count,
        )
