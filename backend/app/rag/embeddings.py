import os
import time
import logging
import socket
from typing import List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# Default router endpoint for the required model
_DEFAULT_ROUTER_ENDPOINT = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"

class RemoteHuggingFaceEmbeddings:
    """Zero‑PyTorch remote embedding client.

    Reads the endpoint from ``HUGGINGFACE_EMBEDDING_URL`` (settings) and falls back to the official router URL.
    Authentication is performed via ``HUGGINGFACE_API_KEY`` when provided.
    Errors are classified into explicit error codes as required.
    """

    def __init__(self, api_key: str = "", model_name: str = None):
        self.model_name = model_name or getattr(settings, "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        # API key – never logged
        self.api_key = api_key or getattr(settings, "HUGGINGFACE_API_KEY", "")
        # Endpoint – may be empty; use default router URL
        self.endpoint = getattr(settings, "HUGGINGFACE_EMBEDDING_URL", "").strip() or _DEFAULT_ROUTER_ENDPOINT
        
        # Ensure standard pipeline suffix
        if not self.endpoint.endswith("/pipeline/feature-extraction"):
            self.endpoint = self.endpoint.rstrip("/") + "/pipeline/feature-extraction"

        # Safe diagnostics logging (no secrets)
        logger.info(f"Embedding endpoint: {self.endpoint}")
        logger.info(f"Hugging Face API key configured: {'True' if self.api_key else 'False'}")
        logger.info(f"Embedding model: {self.model_name}")

    def _classify_error(self, exc: Exception) -> str:
        """Map exceptions / HTTP status to predefined error identifiers."""
        if isinstance(exc, httpx.HTTPStatusError):
            status = exc.response.status_code
            if status == 400:
                return "EMBEDDING_INVALID_REQUEST"
            if status in (401, 403):
                return "EMBEDDING_AUTH_ERROR"
            if status == 429:
                return "EMBEDDING_RATE_LIMITED"
            if status in (500, 502, 503, 504):
                return "EMBEDDING_PROVIDER_ERROR"
        if isinstance(exc, httpx.ConnectError):
            # DNS resolution or network unreachable
            if isinstance(exc.__cause__, socket.gaierror):
                return "EMBEDDING_NETWORK_ERROR"
            return "EMBEDDING_NETWORK_ERROR"
        # Any other unexpected error
        return "EMBEDDING_INVALID_RESPONSE"

    def _call_api(self, texts: List[str]) -> List[List[float]]:
        """Make a request to the configured Hugging Face endpoint with retries."""
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        timeout = httpx.Timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)

        max_retries = 3
        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.post(
                        self.endpoint,
                        headers=headers,
                        json={"inputs": texts, "options": {"wait_for_model": True}},
                    )
                    response.raise_for_status()
                    data = response.json()

                    if not isinstance(data, list) or not data:
                        raise ValueError("EMBEDDING_INVALID_RESPONSE")

                    # Handle model router vs standard inference API formats
                    # Standard API returns list of lists.
                    # Some router formats might return dict with 'embeddings' key.
                    if isinstance(data, dict) and "embeddings" in data:
                        return data["embeddings"]
                    
                    return data if isinstance(data[0], list) else [data]

            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                if isinstance(e, httpx.HTTPStatusError):
                    logger.error(
                        f"Embedding API HTTP error: {e.response.status_code} | "
                        f"Headers: {dict(e.response.headers)} | "
                        f"Body: {e.response.text}"
                    )
                
                error_code = self._classify_error(e)
                if error_code in ("EMBEDDING_RATE_LIMITED", "EMBEDDING_PROVIDER_ERROR") and attempt < max_retries - 1:
                    sleep_time = (2 ** attempt)
                    logger.warning(f"Retrying embedding API in {sleep_time}s due to {error_code}")
                    time.sleep(sleep_time)
                    continue
                logger.error(f"Embedding API call failed: {error_code} | {str(e)}")
                raise RuntimeError(error_code) from e
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                raise RuntimeError("EMBEDDING_INVALID_RESPONSE") from e

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding of multiple texts (batch size 32)."""
        if not texts:
            return []
        batch_size = 32
        all_embeddings: List[List[float]] = []
        total_batches = (len(texts) + batch_size - 1) // batch_size
        logger.info(f"Generating embeddings for {len(texts)} chunks across {total_batches} batch(es)...")
        for i in range(0, len(texts), batch_size):
            batch_num = (i // batch_size) + 1
            batch = texts[i : i + batch_size]
            logger.info(f"Embedding batch {batch_num}/{total_batches} ({len(batch)} chunks)")
            embeddings = self._call_api(batch)
            all_embeddings.extend(embeddings)
        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query string, returning a flat list of floats."""
        res = self._call_api([text])
        if not res:
            raise RuntimeError("EMBEDDING_INVALID_RESPONSE")
        return res[0]

# Singleton accessor used throughout the codebase
_embeddings_model = None

def get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        _embeddings_model = RemoteHuggingFaceEmbeddings()
    return _embeddings_model

