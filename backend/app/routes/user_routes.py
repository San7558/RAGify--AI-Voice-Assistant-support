from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.db.mongo import get_db
from app.schemas.user_schema import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    # Query database user record to ensure we have the latest info
    user_record = await db.users.find_one({"firebase_uid": current_user["firebase_uid"]})
    if not user_record:
        raise HTTPException(status_code=404, detail="User profile not found.")
        
    user_id_str = str(user_record["_id"])
    
    # Calculate document count for the user
    document_count = await db.documents.count_documents({"user_id": user_id_str})
    
    # Calculate question count (count of chat_history sessions where user_id matches)
    question_count = await db.chat_history.count_documents({"user_id": user_id_str})
    
    return UserResponse.from_mongo(user_record, document_count=document_count, question_count=question_count)

