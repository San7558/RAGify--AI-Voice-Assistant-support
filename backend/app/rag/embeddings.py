import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class RobustEmbeddings:
    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name
        self._remote_model = None
        self._local_model = None

    def _get_remote(self):
        if self._remote_model is None:
            from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
            self._remote_model = HuggingFaceInferenceAPIEmbeddings(
                api_key=self.api_key,
                model_name=self.model_name
            )
        return self._remote_model

    def _get_local(self):
        if self._local_model is None:
            from langchain_huggingface import HuggingFaceEmbeddings
            self._local_model = HuggingFaceEmbeddings(model_name=self.model_name)
        return self._local_model

    def embed_documents(self, texts):
        if self.api_key:
            try:
                return self._get_remote().embed_documents(texts)
            except Exception as e:
                logger.warning(f"Remote Hugging Face embed_documents failed ({e}), using local embeddings fallback")
                return self._get_local().embed_documents(texts)
        return self._get_local().embed_documents(texts)

    def embed_query(self, text):
        if self.api_key:
            try:
                return self._get_remote().embed_query(text)
            except Exception as e:
                logger.warning(f"Remote Hugging Face embed_query failed ({e}), using local embeddings fallback")
                return self._get_local().embed_query(text)
        return self._get_local().embed_query(text)

_embeddings_model = None

def get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        api_key = settings.HUGGINGFACE_API_KEY or os.getenv("HUGGINGFACE_API_KEY", "") or os.getenv("HF_TOKEN", "")
        _embeddings_model = RobustEmbeddings(api_key=api_key, model_name=settings.EMBEDDING_MODEL)
    return _embeddings_model
