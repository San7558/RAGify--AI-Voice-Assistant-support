import os
import time
import logging
import httpx
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)

class RemoteHuggingFaceEmbeddings:
    """
    Lightweight, zero-PyTorch remote Hugging Face Inference API embedding client.
    Generates 384-dimensional vectors matching sentence-transformers/all-MiniLM-L6-v2.
    """
    def __init__(self, api_key: str = "", model_name: str = None):
        self.model_name = model_name or getattr(settings, "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        self.api_key = api_key or getattr(settings, "HUGGINGFACE_API_KEY", "") or os.getenv("HUGGINGFACE_API_KEY", "") or os.getenv("HF_TOKEN", "")
        self.url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model_name}"

    def _call_api(self, texts: List[str]) -> List[List[float]]:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        max_retries = 3
        backoff = 1.0
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                with httpx.Client(timeout=30.0) as client:
                    res = client.post(
                        self.url,
                        headers=headers,
                        json={"inputs": texts, "options": {"wait_for_model": True}}
                    )
                    
                    if res.status_code == 200:
                        data = res.json()
                        if isinstance(data, list):
                            return data
                        raise ValueError(f"Unexpected response payload format from Hugging Face API: {type(data)}")
                    elif res.status_code in (429, 503, 504):
                        logger.warning(f"Hugging Face API temporary error (HTTP {res.status_code}), retrying attempt {attempt}/{max_retries} in {backoff}s...")
                    else:
                        raise ValueError(f"Hugging Face API returned HTTP {res.status_code}: {res.text[:200]}")
            except Exception as e:
                last_error = e
                logger.warning(f"Hugging Face API request failed (attempt {attempt}/{max_retries}): {e}")

            if attempt < max_retries:
                time.sleep(backoff)
                backoff *= 2.0

        logger.error(f"Embedding service unavailable: {last_error}")
        
        # In test environments without internet connection, allow controlled local fallback if requested by environment
        if os.getenv("ALLOW_LOCAL_EMBEDDING_FALLBACK", "").lower() in ("true", "1", "yes"):
            logger.warning("ALLOW_LOCAL_EMBEDDING_FALLBACK is active; falling back to local model for offline execution.")
            from langchain_huggingface import HuggingFaceEmbeddings
            return HuggingFaceEmbeddings(model_name=self.model_name).embed_documents(texts)
            
        raise RuntimeError(f"Embedding service unavailable: {last_error}")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        batch_size = 32
        all_embeddings = []
        total_batches = (len(texts) + batch_size - 1) // batch_size
        
        logger.info(f"Generating embeddings for {len(texts)} chunks across {total_batches} batch(es)...")
        for i in range(0, len(texts), batch_size):
            batch_num = (i // batch_size) + 1
            batch = texts[i:i + batch_size]
            logger.info(f"Embedding batch {batch_num}/{total_batches} ({len(batch)} chunks)")
            embeddings = self._call_api(batch)
            all_embeddings.extend(embeddings)
        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        res = self._call_api([text])
        return res[0]

_embeddings_model = None

def get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        _embeddings_model = RemoteHuggingFaceEmbeddings()
    return _embeddings_model
