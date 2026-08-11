from fastapi import APIRouter, Header, HTTPException, status
from app.core.config import settings
from app.services.cleanup_service import run_expiry_cleanup

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/cleanup")
async def trigger_cleanup(x_admin_token: str = Header(None, alias="X-Admin-Token")):
    # Validate the secret token to protect the endpoint
    if not x_admin_token or x_admin_token != settings.ADMIN_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized admin token."
        )
        
    cleaned_count = await run_expiry_cleanup()
    return {
        "status": "success",
        "message": f"Cleanup executed successfully. Purged {cleaned_count} expired documents."
    }
