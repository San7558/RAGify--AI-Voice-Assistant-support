from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class ChatRequest(BaseModel):
    query: str

class SourceSchema(BaseModel):
    page_content: str
    source: Optional[str] = None
    page: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceSchema] = []

class MessageSchema(BaseModel):
    role: str
    content: str
    sources: Optional[List[Dict]] = None
    # model_name is populated for assistant messages; null for user messages.
    # Tracks which Groq model generated the answer (auditing/debugging).
    model_name: Optional[str] = None
    created_at: datetime

class ChatHistoryResponse(BaseModel):
    messages: List[MessageSchema]
