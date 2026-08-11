from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document
from typing import List
import uuid
import logging
from app.core.config import settings
from app.rag.embeddings import get_embeddings

logger = logging.getLogger(__name__)
_pinecone_client = None


def get_pinecone_index():
    global _pinecone_client
    if _pinecone_client is None:
        if not settings.PINECONE_API_KEY:
            raise ValueError("Pinecone API key is missing")
        _pinecone_client = Pinecone(api_key=settings.PINECONE_API_KEY)
    return _pinecone_client.Index(settings.PINECONE_INDEX_NAME)


def _sanitize_metadata(metadata: dict) -> dict:
    """
    Strip any key whose value is None before sending to Pinecone.
    Pinecone rejects null / None values in metadata outright
    (error code 3: 'Metadata value must be a string, number, boolean or list').
    Centralising this here means no ingestion path can miss it.
    """
    return {k: v for k, v in metadata.items() if v is not None}


def get_vectorstore(document_id: str) -> PineconeVectorStore:
    """
    Return a LangChain Pinecone vectorstore scoped to *document_id* namespace.
    Namespace isolation gives us:
      - Correct retrieval (only the right document's chunks)
      - Reliable deletion on all Pinecone tiers (delete_all=True, namespace=…)
    """
    return PineconeVectorStore(
        index=get_pinecone_index(),
        embedding=get_embeddings(),
        text_key="chunk_text",
        namespace=document_id,
    )


def upsert_chunks(
    chunks: List[Document],
    user_id: str,
    document_id: str,
    file_name: str,
    source_type: str = "file",
):
    """
    Embed and upsert document chunks into Pinecone.

    Isolation strategy
    ------------------
    * namespace = document_id  → primary isolation boundary; used for deletion
    * metadata user_id        → secondary / defence-in-depth filter

    Fix 1: Every upsert now goes into namespace=document_id.
    Fix 2: _sanitize_metadata strips None values before upsert.
    """
    index = get_pinecone_index()
    embeddings = get_embeddings()

    batch_size = 32
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]

        texts = [c.page_content for c in batch]
        embeds = embeddings.embed_documents(texts)

        vectors = []
        for j, chunk in enumerate(batch):
            chunk_id = str(uuid.uuid4())
            vector_id = f"{user_id}__{document_id}__{chunk_id}"

            page_number = chunk.metadata.get("page", None)
            website_url = chunk.metadata.get("source") if source_type == "website" else None

            metadata = {
                "user_id": user_id,
                "document_id": document_id,
                "chunk_id": chunk_id,
                "source_type": source_type,
                "file_name": file_name,
                # Fix 2: None values are stripped by _sanitize_metadata below
                "page_number": page_number,
                "website_url": website_url,
                "source": website_url if source_type == "website" else file_name,
                "chunk_text": chunk.page_content,
            }

            logger.debug(f"Upserting chunk {chunk_id} with metadata keys: {list(metadata.keys())}")

            vectors.append({
                "id": vector_id,
                "values": embeds[j],
                # Fix 2: strip None values before sending to Pinecone
                "metadata": _sanitize_metadata(metadata),
            })

        # Fix 1: upsert into namespace=document_id
        index.upsert(vectors=vectors, namespace=document_id)


def delete_document_vectors(document_id: str):
    """
    Delete ALL vectors that belong to this document.

    Fix 1: Use namespace-based delete (delete_all=True, namespace=document_id).
    This works on ALL Pinecone tiers — including free pod indexes — unlike
    the old metadata-filter delete which is unsupported on starter indexes
    and was confirmed to silently no-op.
    """
    index = get_pinecone_index()
    try:
        index.delete(delete_all=True, namespace=document_id)
    except Exception as e:
        print(f"Failed to delete vectors for document {document_id}: {e}")
