import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.firebase_service import verify_id_token
from app.db.mongo import get_db

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        logger.warning("Auth failure: Missing Authorization header or Bearer scheme")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    decoded_token = verify_id_token(token)
    
    if not decoded_token:
        logger.warning("Auth failure: Invalid or expired Firebase ID token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    firebase_uid = decoded_token.get("uid")
    logger.info(f"Firebase token verified successfully for UID: {firebase_uid}")
    
    db = get_db()
    if db is None:
        logger.error("Auth failure: Database connection is unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
        
    user = await db.users.find_one({"firebase_uid": firebase_uid})
    
    if not user:
        logger.warning(f"Auth failure: User record with firebase_uid {firebase_uid} not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in database. Please sync auth first.",
        )
        
    # Return a user dict with a string ID for easy access
    user["id"] = str(user["_id"])
    return user
