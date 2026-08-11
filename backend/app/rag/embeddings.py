from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import settings

_embeddings_model = None

def get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        _embeddings_model = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL
        )
    return _embeddings_model
