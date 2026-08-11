from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.db.mongo import get_db
from app.schemas.document_schema import DocumentResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    # 1. Total Documents
    doc_count = await db.documents.count_documents({"user_id": current_user['id']})
    
    # 2. Total Questions Asked
    # We sum the 'question_count' field from all documents
    docs_cursor = db.documents.find({"user_id": current_user['id']})
    docs = await docs_cursor.to_list(length=1000)
    
    question_count = sum(doc.get("question_count", 0) for doc in docs)
    total_chunks = sum(doc.get("chunk_count", 0) for doc in docs)
    
    # 3. Recent documents
    recent_docs_cursor = db.documents.find({"user_id": current_user['id']}).sort("created_at", -1).limit(5)
    recent_docs = await recent_docs_cursor.to_list(length=5)
    
    return {
        "document_count": doc_count,
        "question_count": question_count,
        "total_chunks": total_chunks,
        "recent_documents": [DocumentResponse.from_mongo(doc).dict() for doc in recent_docs]
    }
