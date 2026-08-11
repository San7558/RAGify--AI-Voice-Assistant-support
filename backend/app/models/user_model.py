from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserModel(BaseModel):
    """
    MongoDB user document shape.

    Field mapping (audit-aligned):
      - `name`          → display name from Firebase (was `display_name`)
      - `last_login_at` → timestamp of most recent login (was `last_login`)
      - `created_at`    → set once on first sync via $setOnInsert, never overwritten
      - `status`        → account status, default "active"
    """
    firebase_uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None
    last_login_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active", pattern="^(active|suspended|deleted)$")
