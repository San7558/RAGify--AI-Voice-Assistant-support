import logging
from datetime import datetime
from bson import ObjectId
from app.db.mongo import get_db
from app.services.supabase_service import delete_file
from app.rag.vectorstore import delete_document_vectors

logger = logging.getLogger(__name__)

async def purge_document(doc: dict) -> bool:
    """
    Purges a single document from all 3 stores:
    1. Deletes the raw file from Supabase Storage
    2. Deletes the vector namespace from Pinecone
    3. Deletes document metadata and chat histories from MongoDB
    """
    try:
        db = get_db()
        doc_id = str(doc["_id"])
        
        # 1. Delete file from Supabase Storage
        supabase_path = doc.get("supabase_path")
        if supabase_path:
            try:
                delete_file(supabase_path)
            except Exception as e:
                logger.warning(f"Cleanup: Failed to delete Supabase file '{supabase_path}': {e}")
                
        # 2. Delete vectors from Pinecone using document_id namespace
        try:
            delete_document_vectors(doc_id)
        except Exception as e:
            logger.warning(f"Cleanup: Failed to delete Pinecone namespace '{doc_id}': {e}")
            
        # 3. Delete metadata and chat history from MongoDB
        await db.documents.delete_one({"_id": doc["_id"]})
        await db.chat_history.delete_many({"document_id": doc_id})
        
        logger.info(f"Cleanup: Successfully purged document '{doc_id}'")
        return True
    except Exception as e:
        logger.error(f"Cleanup: Unexpected error purging document '{doc.get('_id')}': {e}")
        return False

async def run_expiry_cleanup() -> int:
    """
    Queries for all documents where expires_at < current time,
    and purges them. Returns the count of successfully cleaned documents.
    """
    db = get_db()
    if db is None:
        logger.warning("Cleanup: Database client not connected. Skipping cleanup.")
        return 0
        
    now = datetime.utcnow()
    # Find all documents that have expired
    expired_cursor = db.documents.find({"expires_at": {"$lt": now}})
    expired_docs = await expired_cursor.to_list(length=1000)
    
    count = 0
    for doc in expired_docs:
        success = await purge_document(doc)
        if success:
            count += 1
            
    logger.info(f"Cleanup: Processed {len(expired_docs)} expired documents. Successfully purged {count}.")
    return count
