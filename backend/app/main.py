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

# Enable debug mode for detailed tracebacks
app = FastAPI(title="RAGify AI Backend", debug=True)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
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
    init_firebase()
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "db": "connected"}

app.include_router(document_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")
app.include_router(speech_routes.router, prefix="/api")
app.include_router(dashboard_routes.router, prefix="/api")
app.include_router(auth_routes.router, prefix="/api")
app.include_router(user_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")


