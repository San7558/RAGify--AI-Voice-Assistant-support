import sys
import os

# Ensure backend root and app package are in sys.path so both 'uvicorn app.main:app' and 'uvicorn main:app' work seamlessly
app_dir = os.path.dirname(__file__)
parent_dir = os.path.abspath(os.path.join(app_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from app.core.config import settings
from app.db.mongo import connect_to_mongo, close_mongo_connection
from app.services.firebase_service import init_firebase
from app.routes import document_routes, chat_routes, dashboard_routes, auth_routes, user_routes, admin_routes, speech_routes

# Initialize logger
logger = logging.getLogger(__name__)

# FastAPI app instance
app = FastAPI(title="RAGify AI Backend", debug=settings.DEBUG)

def get_cors_origins():
    origins = set()
    raw = settings.FRONTEND_URL
    if raw:
        for item in raw.split(","):
            cleaned = item.strip().rstrip("/")
            if cleaned:
                origins.add(cleaned)
    return list(origins)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler to ensure JSON response on unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

@app.on_event("startup")
async def startup_db_client():
    try:
        init_firebase()
    except Exception as e:
        logger.error(f"Firebase initialization error during startup: {e}", exc_info=True)

    try:
        await connect_to_mongo()
    except Exception as e:
        logger.error(f"MongoDB connection error during startup: {e}", exc_info=True)

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"status": "ok", "message": "RAGify AI Backend API is running", "docs": "/docs"}

@app.get("/api/health")
async def health_check():
    db = get_db()
    db_status = "connected" if db is not None else "disconnected"
    return {"status": "ok", "db": db_status}

app.include_router(document_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")
app.include_router(speech_routes.router, prefix="/api")
app.include_router(dashboard_routes.router, prefix="/api")
app.include_router(auth_routes.router, prefix="/api")
app.include_router(user_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")


