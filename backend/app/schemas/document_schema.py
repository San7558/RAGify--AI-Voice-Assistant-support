from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    source_type: str
    title: str
    file_name: Optional[str]
    file_type: Optional[str]
    website_url: Optional[str]
    chunk_count: int
    status: str
    created_at: datetime
    
    @classmethod
    def from_mongo(cls, doc: dict):
        return cls(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            source_type=doc.get("source_type", "file"),
            title=doc.get("title", "Untitled"),
            file_name=doc.get("file_name"),
            file_type=doc.get("file_type"),
            website_url=doc.get("website_url"),
            chunk_count=doc.get("chunk_count", 0),
            status=doc.get("status", "processing"),
            created_at=doc.get("created_at")
        )
