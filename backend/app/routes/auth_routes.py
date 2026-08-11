from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from app.db.mongo import get_db
from app.services.firebase_service import verify_id_token

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer()

@router.post("/sync")
async def sync_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    decoded_token = verify_id_token(token)
    
    if not decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token"
        )
        
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    name = decoded_token.get("name")
    picture = decoded_token.get("picture")
    
    db = get_db()
    
    # Ensure DB connection is available
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    # Upsert user record.
    # $set   — mutable fields updated on every login
    # $setOnInsert — written only when the document is first created
    update_res = await db.users.update_one(
        {"firebase_uid": firebase_uid},
        {
            "$set": {
                "email": email,
                "name": name,            # was: display_name
                "photo_url": picture,
                "last_login_at": datetime.utcnow(),  # was: last_login (dead logic)
            },
            "$setOnInsert": {
                "firebase_uid": firebase_uid,
                "created_at": datetime.utcnow(),
                "status": "active",
            },
        },
        upsert=True
    )
    
    user = await db.users.find_one({"firebase_uid": firebase_uid})
    return {"status": "synced", "user_id": str(user["_id"])}

