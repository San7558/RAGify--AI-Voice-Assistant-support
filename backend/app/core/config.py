import os
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    DOCUMENT_RETENTION_DAYS: int = 15
    ADMIN_SECRET: str = "ragify-secret-admin-token"

    # MongoDB
    MONGODB_URI: str
    # Set MONGO_TLS_INSECURE=true ONLY if you are behind a corporate proxy that intercepts TLS.
    # Never enable in production.
    MONGO_TLS_INSECURE: bool = False

    # Firebase
    FIREBASE_PROJECT_ID: str
    FIREBASE_CLIENT_EMAIL: str
    FIREBASE_PRIVATE_KEY: str

    # Pinecone
    PINECONE_API_KEY: str
    PINECONE_INDEX_NAME: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_BUCKET: str = "ragify-files"

    # Groq & Embeddings
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @field_validator("MONGO_TLS_INSECURE", mode="before")
    @classmethod
    def _parse_mongo_tls_insecure(cls, v: str | bool) -> bool:
        """Coerce common environment string values to a real boolean."""
        if isinstance(v, bool):
            return v
        return str(v).lower() in {"true", "1", "yes", "y"}

settings = Settings()
