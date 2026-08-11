from app.core.config import settings

_embeddings_model = None

def get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        from langchain_huggingface import HuggingFaceEmbeddings
        _embeddings_model = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL
        )
    return _embeddings_model
