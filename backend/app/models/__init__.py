from __future__ import annotations

from datetime import datetime
from typing import Optional, Literal, List, Dict

from pydantic import BaseModel, Field, EmailStr, HttpUrl, ConfigDict, field_validator

# Base configuration for all models
class BaseConfig:
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

# ------------------- Admin -------------------
class AdminCreate(BaseModel, BaseConfig):
    username: str = Field(..., min_length=1)
    hashed_password: str = Field(..., min_length=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdminUpdate(BaseModel, BaseConfig):
    username: Optional[str] = Field(None, min_length=1)
    hashed_password: Optional[str] = Field(None, min_length=1)
    created_at: Optional[datetime] = None

class AdminOut(BaseModel, BaseConfig):
    id: str
    username: str
    hashed_password: str
    created_at: datetime

# ------------------- Home -------------------
class HomeCreate(BaseModel, BaseConfig):
    name: str = Field(..., min_length=1)
    designation: str = Field(..., min_length=1)
    intro: str = Field(..., max_length=500, min_length=1)
    profile_image_url: HttpUrl
    resume_url: HttpUrl

class HomeUpdate(BaseModel, BaseConfig):
    name: Optional[str] = Field(None, min_length=1)
    designation: Optional[str] = Field(None, min_length=1)
    intro: Optional[str] = Field(None, max_length=500, min_length=1)
    profile_image_url: Optional[HttpUrl] = None
    resume_url: Optional[HttpUrl] = None

class HomeOut(BaseModel, BaseConfig):
    id: str
    name: str
    designation: str
    intro: str
    profile_image_url: HttpUrl
    resume_url: HttpUrl

# ------------------- About -------------------
class AboutCreate(BaseModel, BaseConfig):
    about_text: str = Field(..., min_length=1)
    career_goals: str = Field(..., min_length=1)
    technologies: List[str] = Field(..., min_items=1)
    experience_years: int = Field(..., ge=0)
    projects_count: int = Field(..., ge=0)
    clients_count: int = Field(..., ge=0)
    degree: str = Field(..., min_length=1)

class AboutUpdate(BaseModel, BaseConfig):
    about_text: Optional[str] = Field(None, min_length=1)
    career_goals: Optional[str] = Field(None, min_length=1)
    technologies: Optional[List[str]] = None
    experience_years: Optional[int] = Field(None, ge=0)
    projects_count: Optional[int] = Field(None, ge=0)
    clients_count: Optional[int] = Field(None, ge=0)
    degree: Optional[str] = Field(None, min_length=1)

class AboutOut(BaseModel, BaseConfig):
    id: str
    about_text: str
    career_goals: str
    technologies: List[str]
    experience_years: int
    projects_count: int
    clients_count: int
    degree: str

# ------------------- Skills -------------------
class SkillsCreate(BaseModel, BaseConfig):
    category: Literal["Frontend", "Backend", "Database", "Tools"]
    items: List[str] = Field(..., min_items=1)

class SkillsUpdate(BaseModel, BaseConfig):
    category: Optional[Literal["Frontend", "Backend", "Database", "Tools"]] = None
    items: Optional[List[str]] = None

class SkillsOut(BaseModel, BaseConfig):
    id: str
    category: Literal["Frontend", "Backend", "Database", "Tools"]
    items: List[str]

# ------------------- Projects -------------------
class ProjectsCreate(BaseModel, BaseConfig):
    title: str = Field(..., min_length=1)
    description: str = Field(..., max_length=300, min_length=1)
    technologies: List[str] = Field(..., min_items=1)
    image_url: HttpUrl
    github_url: Optional[HttpUrl] = None
    live_url: Optional[HttpUrl] = None
    featured: bool = Field(default=False)

class ProjectsUpdate(BaseModel, BaseConfig):
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=300, min_length=1)
    technologies: Optional[List[str]] = None
    image_url: Optional[HttpUrl] = None
    github_url: Optional[HttpUrl] = None
    live_url: Optional[HttpUrl] = None
    featured: Optional[bool] = None

class ProjectsOut(BaseModel, BaseConfig):
    id: str
    title: str
    description: str
    technologies: List[str]
    image_url: HttpUrl
    github_url: Optional[HttpUrl]
    live_url: Optional[HttpUrl]
    featured: bool

# ------------------- Contact -------------------
class ContactCreate(BaseModel, BaseConfig):
    social_links: Dict[str, HttpUrl] = Field(..., min_items=1)

class ContactUpdate(BaseModel, BaseConfig):
    social_links: Optional[Dict[str, HttpUrl]] = None

class ContactOut(BaseModel, BaseConfig):
    id: str
    social_links: Dict[str, HttpUrl]

# ------------------- Messages -------------------
class MessagesCreate(BaseModel, BaseConfig):
    name: str = Field(..., min_length=1)
    email: EmailStr
    message: str = Field(..., max_length=1000, min_length=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = Field(default=False)

class MessagesUpdate(BaseModel, BaseConfig):
    name: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = None
    message: Optional[str] = Field(None, max_length=1000, min_length=1)
    created_at: Optional[datetime] = None
    read: Optional[bool] = None

class MessagesOut(BaseModel, BaseConfig):
    id: str
    name: str
    email: EmailStr
    message: str
    created_at: datetime
    read: bool

# ------------------- SEO -------------------
class SeoCreate(BaseModel, BaseConfig):
    title: str = Field(..., min_length=1)
    meta_description: str = Field(..., max_length=160, min_length=1)
    og_image_url: Optional[HttpUrl] = None

class SeoUpdate(BaseModel, BaseConfig):
    title: Optional[str] = Field(None, min_length=1)
    meta_description: Optional[str] = Field(None, max_length=160, min_length=1)
    og_image_url: Optional[HttpUrl] = None

class SeoOut(BaseModel, BaseConfig):
    id: str
    title: str
    meta_description: str
    og_image_url: Optional[HttpUrl]

# ------------------- Theme -------------------
class ThemeCreate(BaseModel, BaseConfig):
    primary_color: str = Field(..., min_length=1)
    accent_color: str = Field(..., min_length=1)
    dark_mode_default: bool = Field(default=False)

class ThemeUpdate(BaseModel, BaseConfig):
    primary_color: Optional[str] = Field(None, min_length=1)
    accent_color: Optional[str] = Field(None, min_length=1)
    dark_mode_default: Optional[bool] = None

class ThemeOut(BaseModel, BaseConfig):
    id: str
    primary_color: str
    accent_color: str
    dark_mode_default: bool

# ------------------- Footer -------------------
class FooterCreate(BaseModel, BaseConfig):
    copyright_text: str = Field(..., min_length=1)
    social_links: Dict[str, HttpUrl] = Field(..., min_items=1)

class FooterUpdate(BaseModel, BaseConfig):
    copyright_text: Optional[str] = Field(None, min_length=1)
    social_links: Optional[Dict[str, HttpUrl]] = None

class FooterOut(BaseModel, BaseConfig):
    id: str
    copyright_text: str
    social_links: Dict[str, HttpUrl]
