import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from app.db.mongo import get_db
from app.services.firebase_service import verify_id_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)

@router.post("/sync")
async def sync_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    logger.info("AUTH SYNC START: Request received")
    
    if not credentials or not credentials.credentials:
        logger.warning("AUTH SYNC FAILED: Missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
        
    token = credentials.credentials
    logger.info("AUTH SYNC: TOKEN RECEIVED")
    
    decoded_token = verify_id_token(token)
    if not decoded_token:
        logger.warning("AUTH SYNC FAILED: Token verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token"
        )
        
    firebase_uid = decoded_token.get("uid")
    logger.info(f"AUTH SYNC: TOKEN VERIFIED for UID: {firebase_uid}")
    
    email = decoded_token.get("email")
    name = decoded_token.get("name")
    picture = decoded_token.get("picture")
    
    db = get_db()
    if db is None:
        logger.error("AUTH SYNC FAILED: Database connection unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database connection unavailable")
    
    logger.info("AUTH SYNC: DATABASE QUERY START")
    try:
        await asyncio.wait_for(
            db.users.update_one(
                {"firebase_uid": firebase_uid},
                {
                    "$set": {
                        "email": email,
                        "name": name,
                        "photo_url": picture,
                        "last_login_at": datetime.utcnow(),
                    },
                    "$setOnInsert": {
                        "firebase_uid": firebase_uid,
                        "created_at": datetime.utcnow(),
                        "status": "active",
                    },
                },
                upsert=True
            ),
            timeout=8.0
        )
        logger.info("AUTH SYNC: DATABASE QUERY COMPLETE")
        
        user = await asyncio.wait_for(
            db.users.find_one({"firebase_uid": firebase_uid}),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        logger.error(f"AUTH SYNC ERROR: MongoDB operation timed out for UID: {firebase_uid}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Database operation timed out. Please check MongoDB connection."
        )
        
    if not user:
        logger.error("AUTH SYNC ERROR: User record could not be retrieved after upsert")
        raise HTTPException(status_code=500, detail="Failed to retrieve user record")

    logger.info("AUTH SYNC RESPONSE: User successfully synchronized")
    return {"status": "synced", "user_id": str(user["_id"])}

