from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class MessageModel(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    sources: Optional[List[Dict]] = None
    # model_name is set on assistant messages for auditing which Groq model answered.
    # Not set on user messages.
    model_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatSessionModel(BaseModel):
    user_id: str
    document_id: str
    messages: List[MessageModel] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
