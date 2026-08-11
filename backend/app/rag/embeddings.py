import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)
_embeddings_model = None

def get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        api_key = settings.HUGGINGFACE_API_KEY or os.getenv("HUGGINGFACE_API_KEY", "") or os.getenv("HF_TOKEN", "")
        if api_key:
            logger.info("Initializing zero-PyTorch remote Hugging Face Inference API embeddings")
            from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
            _embeddings_model = HuggingFaceInferenceAPIEmbeddings(
                api_key=api_key,
                model_name=settings.EMBEDDING_MODEL
            )
        else:
            logger.info("Initializing local Hugging Face embeddings")
            from langchain_huggingface import HuggingFaceEmbeddings
            _embeddings_model = HuggingFaceEmbeddings(
                model_name=settings.EMBEDDING_MODEL
            )
    return _embeddings_model
