import asyncio
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, status
from typing import List
from bson import ObjectId
from app.core.security import get_current_user
from app.db.mongo import get_db
from app.models.document_model import DocumentModel
from app.schemas.document_schema import DocumentResponse
from app.services.supabase_service import upload_file, delete_file
from app.services.background_tasks import process_document, delete_vectors_task
from datetime import datetime, timedelta
from app.core.config import settings
from app.services.usage_service import log_usage

router = APIRouter(prefix="/documents", tags=["Documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
]

from app.core.rate_limiter import check_rate_limit, upload_rate_limits

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    check_rate_limit(current_user['id'], upload_rate_limits)
    if file.content_type not in ALLOWED_MIME_TYPES:

        raise HTTPException(status_code=415, detail="Unsupported file type.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    # Generate unique filename for Supabase
    file_id = str(uuid.uuid4())
    ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    storage_name = f"{current_user['id']}/{file_id}.{ext}"

    # Upload to Supabase (optional backup storage)
    try:
        supabase_path = await upload_file(file_bytes, storage_name, file.content_type)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Supabase storage backup skipped: {e}")
        supabase_path = None
    db = get_db()

    # pinecone_namespace is set to a placeholder first; it will be updated to
    # the real document_id right after insert (Fix 1: namespace = document_id).
    doc = DocumentModel(
        user_id=current_user['id'],
        source_type="file",
        file_name=file.filename,
        file_type=ext,
        supabase_path=supabase_path,
        title=file.filename,
        pinecone_namespace="pending",   # updated below once we have the real doc_id
        status="processing",
        expires_at=datetime.utcnow() + timedelta(days=settings.DOCUMENT_RETENTION_DAYS)
    )

    result = await db.documents.insert_one(doc.dict())
    document_id = str(result.inserted_id)

    # Fix 1: record the actual document_id as the Pinecone namespace so it is
    # traceable in Mongo and consistent with what vectorstore.py uses.
    await db.documents.update_one(
        {"_id": result.inserted_id},
        {"$set": {"pinecone_namespace": document_id}}
    )

    log_usage(
        user_id=current_user['id'],
        action="upload",
        document_id=document_id,
        metadata={"file_name": file.filename, "file_type": ext, "source_type": "file"}
    )

    # Background task for LangChain ingestion
    background_tasks.add_task(
        process_document,
        document_id=document_id,
        file_bytes=file_bytes,
        file_name=file.filename,
        file_type=ext,
        user_id=current_user['id'],
        source_type="file",
    )

    new_doc = await db.documents.find_one({"_id": result.inserted_id})
    return DocumentResponse.from_mongo(new_doc)


@router.get("", response_model=List[DocumentResponse])
async def list_documents(current_user: dict = Depends(get_current_user)):
    db = get_db()
    docs_cursor = db.documents.find({"user_id": current_user['id']}).sort("created_at", -1)
    docs = await docs_cursor.to_list(length=100)
    return [DocumentResponse.from_mongo(doc) for doc in docs]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    try:
        object_id = ObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    try:
        doc = await asyncio.wait_for(
            db.documents.find_one({"_id": object_id, "user_id": current_user['id']}),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Database status query timed out")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error checking document status for {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document status")

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return DocumentResponse.from_mongo(doc)


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    # Fix 3: validate the ObjectId format first.
    try:
        object_id = ObjectId(document_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    db = get_db()
    doc = await db.documents.find_one({"_id": object_id, "user_id": current_user['id']})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    from app.services.cleanup_service import purge_document
    await purge_document(doc)

    log_usage(
        user_id=current_user['id'],
        action="delete",
        document_id=document_id,
        metadata={"title": doc.get("title"), "source_type": doc.get("source_type")}
    )

    return {"status": "deleted"}
