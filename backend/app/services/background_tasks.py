import asyncio
import logging
from bson import ObjectId
from app.db.mongo import get_db
from app.rag.loaders import load_document
from app.rag.chunker import chunk_documents
from app.rag.vectorstore import upsert_chunks, delete_document_vectors

logger = logging.getLogger(__name__)

_processing_semaphore = asyncio.Semaphore(1)

async def process_document(
    *,
    document_id: str,
    file_bytes: bytes,
    file_name: str,
    file_type: str,
    user_id: str,
    source_type: str = "file",
):
    db = get_db()
    
    async with _processing_semaphore:
        try:
            logger.info(f"Processing document {document_id} ({file_name})")
            logger.info("PDF extraction started")
            # Load
            docs = load_document(file_bytes, file_name, file_type)
            
            # Chunk
            chunks = chunk_documents(docs)
            logger.info(f"Created {len(chunks)} chunks for document {document_id}")
            
            # Upsert vectors via ThreadPoolExecutor
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None, 
                upsert_chunks, chunks, user_id, document_id, file_name, source_type
            )
            logger.info(f"Pinecone upsert completed for document {document_id}")
            
            # Update Mongo status
            await db.documents.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": {
                    "status": "ready",
                    "chunk_count": len(chunks)
                }}
            )
            logger.info(f"Document indexing completed for document {document_id}")
            
        except Exception as e:
            err_msg = str(e)
            if "Embedding service unavailable" in err_msg or "Hugging Face" in err_msg:
                logger.error(f"Embedding service unavailable for document {document_id}: {err_msg}")
            else:
                logger.error(f"Error processing document {document_id}: {err_msg}")
            
            # Mark as failed
            await db.documents.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": {
                    "status": "failed",
                    "error": f"Embedding service unavailable: {err_msg}" if "Embedding service unavailable" in err_msg else err_msg
                }}
            )

async def delete_vectors_task(document_id: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, delete_document_vectors, document_id)

async def reprocess_document_from_supabase(document_id: str):
    """
    Re-embed a document using the content stored in Supabase Storage.
    For website documents this avoids hitting the live URL again.
    For file documents this re-embeds the original uploaded file.
    Raises ValueError if the document has no supabase_path.
    """
    from app.services.supabase_service import download_file

    db = get_db()
    doc = await db.documents.find_one({"_id": ObjectId(document_id)})
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    supabase_path = doc.get("supabase_path")
    if not supabase_path:
        raise ValueError(
            f"Document {document_id} has no supabase_path — "
            "cannot re-process without re-uploading the original file."
        )

    file_bytes = download_file(supabase_path)
    source_type = doc.get("source_type", "file")
    file_name = doc.get("website_url") or doc.get("file_name") or supabase_path
    file_type = doc.get("file_type") or "txt"
    user_id = doc.get("user_id")

    # Reset status to processing before re-ingesting
    await db.documents.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": {"status": "processing", "chunk_count": 0}}
    )

    # Delete old vectors first
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, delete_document_vectors, document_id)

    # Re-ingest
    await process_document(
        document_id=document_id,
        file_bytes=file_bytes,
        file_name=file_name,
        file_type=file_type,
        user_id=user_id,
        source_type=source_type,
    )
