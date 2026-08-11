import sys
import time
import socket
import logging
from urllib.parse import urlparse
import httpx

# Ensure project root is on sys.path when executed as a module
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.core.config import settings
from app.rag.embeddings import RemoteHuggingFaceEmbeddings

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

DEFAULT_ENDPOINT = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
EXPECTED_DIM = 384


def print_header():
    print("=== Hugging Face Embedding Diagnostic ===\n")


def get_endpoint():
    return settings.HUGGINGFACE_EMBEDDING_URL.strip() or DEFAULT_ENDPOINT


def check_api_key():
    configured = bool(settings.HUGGINGFACE_API_KEY)
    print(f"API key configured: {configured}")
    return configured


def check_dns(endpoint: str):
    hostname = urlparse(endpoint).hostname
    print(f"Hostname: {hostname}")
    try:
        socket.gethostbyname(hostname)
        print("DNS resolution: OK")
        return True
    except socket.gaierror:
        print("DNS resolution: FAILED")
        return False


def test_embedding():
    embedder = RemoteHuggingFaceEmbeddings()
    try:
        vec = embedder.embed_query("What is this document about?")
        print("Embedding request: OK")
    except RuntimeError as e:
        print(f"Embedding request: FAIL\nReason: {e}")
        return None
    except Exception as e:
        print(f"Embedding request: FAIL\nReason: Unexpected error: {e}")
        return None
    if not isinstance(vec, list) or len(vec) != EXPECTED_DIM:
        actual = len(vec) if isinstance(vec, list) else "invalid"
        print(f"Embedding dimension: FAIL\nReason: EMBEDDING_DIMENSION_ERROR\nExpected: {EXPECTED_DIM}\nActual: {actual}")
        return None
    print(f"Embedding dimension: {EXPECTED_DIM}")
    return vec


def main():
    print_header()
    endpoint = get_endpoint()
    print(f"Endpoint: {endpoint}")
    check_api_key()
    if not check_dns(endpoint):
        print("Embedding diagnostic: FAIL")
        sys.exit(1)
    vec = test_embedding()
    if vec is None:
        print("Embedding diagnostic: FAIL")
        sys.exit(1)
    print("\nEmbedding diagnostic: PASS")
    sys.exit(0)

if __name__ == "__main__":
    main()
