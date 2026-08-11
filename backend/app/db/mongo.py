import logging
import urllib.parse
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure the TLS‑insecure warning is emitted only once per process
_tls_insecure_warning_emitted = False

client: AsyncIOMotorClient | None = None
_db = None


def get_escaped_uri(uri: str) -> str:
    """Return a MongoDB URI with username/password URL‑encoded.
    Handles passwords that contain special characters such as '@', ':' or '/'.
    """
    if not uri.startswith("mongodb"):
        return uri
    try:
        scheme, rest = uri.split("://", 1)
        # Split credentials from host/path
        cred_host, *path_parts = rest.split("/", 1)
        path_rest = f"/{path_parts[0]}" if path_parts else ""
        if "@" in cred_host:
            # The last '@' separates credentials from host
            creds, host = cred_host.rsplit("@", 1)
            if ":" in creds:
                username, password = creds.split(":", 1)
                username_esc = urllib.parse.quote_plus(username)
                password_esc = urllib.parse.quote_plus(password)
                escaped = f"{scheme}://{username_esc}:{password_esc}@{host}{path_rest}"
                logger.info("MongoDB URI escaped for special characters.")
                return escaped
    except Exception as e:  # pragma: no cover
        logger.error(f"Error escaping MongoDB URI: {e}")
    return uri


async def connect_to_mongo():
    global client, _db, _tls_insecure_warning_emitted
    escaped_uri = get_escaped_uri(settings.MONGODB_URI)

    # TLS options – secure by default, insecure only on explicit opt‑in
    tls_kwargs = {"tlsCAFile": certifi.where()}
    if settings.MONGO_TLS_INSECURE:
        tls_kwargs["tlsAllowInvalidCertificates"] = True
        if not _tls_insecure_warning_emitted:
            logger.warning(
                "\n" + "=" * 70 + "\n"
                "  ⚠  MONGO_TLS_INSECURE=true is ENABLED.\n"
                "  Certificate validation is DISABLED for this MongoDB connection.\n"
                "  This is only acceptable for local dev behind a TLS‑intercepting corporate proxy.\n"
                "  NEVER set this in production / Render / Cloud.\n"
                + "=" * 70
            )
            _tls_insecure_warning_emitted = True

    client = AsyncIOMotorClient(
        escaped_uri,
        **tls_kwargs,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    _db = client.ragify

    # Verify connectivity with a ping before proceeding
    try:
        await client.admin.command("ping")
        logger.info("MongoDB ping successful.")
    except Exception as e:  # pragma: no cover
        logger.error(f"MongoDB ping failed: {e}")
        # Continue – routes will handle missing DB gracefully
        return

    # Create essential indexes (non‑fatal if Atlas is unreachable)
    try:
        await _db.users.create_index("firebase_uid", unique=True)
        await _db.documents.create_index([("user_id", 1), ("status", 1)])
        await _db.chat_history.create_index([("user_id", 1), ("document_id", 1)])
        logger.info("MongoDB indexes created successfully.")
    except Exception as e:  # pragma: no cover
        logger.warning(
            f"MongoDB index creation failed ({type(e).__name__}): {e}. "
            "Server will start, but DB‑dependent routes may fail until Atlas is reachable."
        )


async def close_mongo_connection():
    if client:
        client.close()


def get_db():
    return _db
