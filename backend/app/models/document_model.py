from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class DocumentModel(BaseModel):
    user_id: str
    source_type: str = Field(..., pattern="^(file|website)$")
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    supabase_path: Optional[str] = None
    website_url: Optional[str] = None
    title: str
    chunk_count: int = 0
    pinecone_namespace: str
    status: str = Field(default="processing", pattern="^(processing|ready|failed)$")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
