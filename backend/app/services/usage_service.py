import logging
from datetime import datetime
from typing import Optional
from app.db.mongo import get_db

logger = logging.getLogger(__name__)

async def log_usage_async(
    user_id: str,
    action: str,
    document_id: Optional[str] = None,
    metadata: Optional[dict] = None
):
    try:
        db = get_db()
        if db is None:
            logger.warning("Database client not initialized. Cannot log usage.")
            return
        log_record = {
            "user_id": user_id,
            "action": action,
            "document_id": document_id,
            "created_at": datetime.utcnow(),
            "metadata": metadata or {}
        }
        await db.usage_logs.insert_one(log_record)
    except Exception as e:
        logger.warning(f"Failed to write usage log to MongoDB: {e}")

def log_usage(
    user_id: str,
    action: str,
    document_id: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """
    Spawns log_usage_async as a fire-and-forget background task.
    Failure inside logging is caught and logged as a warning so it never interrupts
    the main user-facing request.
    """
    import asyncio
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(log_usage_async(user_id, action, document_id, metadata))
        else:
            asyncio.run(log_usage_async(user_id, action, document_id, metadata))
    except RuntimeError:
        # Fallback if no event loop is running (e.g. startup/testing environments)
        try:
            asyncio.run(log_usage_async(user_id, action, document_id, metadata))
        except Exception as e:
            logger.warning(f"Failed to execute usage logging in synchronous fallback: {e}")
    except Exception as e:
        logger.warning(f"Failed to spawn usage log task: {e}")
