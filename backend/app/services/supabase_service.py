import logging
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    url = settings.SUPABASE_URL or ""
    if not url or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration is missing.")
    bad_suffixes = ("/rest/v1", "/storage", "/auth")
    for suffix in bad_suffixes:
        if suffix in url:
            raise ValueError(
                f"SUPABASE_URL must be the bare project URL "
                f"(e.g. https://xxxx.supabase.co), not '{url}'. "
                f"Remove the '{suffix}' path suffix."
            )
    if url.endswith("/"):
        url = url.rstrip("/")
    return create_client(url, settings.SUPABASE_SERVICE_ROLE_KEY)

async def upload_file(file_bytes: bytes, file_name: str, content_type: str) -> str:
    supabase = get_supabase_client()
    bucket = settings.SUPABASE_BUCKET
    
    # Upload to Supabase Storage
    try:
        supabase.storage.from_(bucket).upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        return file_name
    except Exception as e:
        raw_err = str(e) if str(e) else type(e).__name__
        err_detail = "Storage network or URL configuration error" if "cannot access local variable" in raw_err else raw_err
        logger.warning(f"Supabase storage upload failed for file '{file_name}': {err_detail}")
        raise ValueError(f"Supabase storage upload failed: {err_detail}")

def delete_file(file_name: str):
    if not file_name:
        return
    try:
        supabase = get_supabase_client()
        supabase.storage.from_(settings.SUPABASE_BUCKET).remove([file_name])
        logger.info(f"Successfully deleted Supabase file '{file_name}'.")
    except Exception as e:
        err_detail = str(e) if str(e) else type(e).__name__
        logger.warning(f"Failed to delete Supabase file '{file_name}': {err_detail}")

def download_file(file_name: str) -> bytes:
    """
    Download a file from Supabase Storage and return its raw bytes.
    Used to re-process a document (re-embed) from the stored backup without
    re-scraping the live URL.
    """
    supabase = get_supabase_client()
    try:
        return supabase.storage.from_(settings.SUPABASE_BUCKET).download(file_name)
    except Exception as e:
        err_detail = str(e) if str(e) else type(e).__name__
        logger.error(f"Failed to download Supabase file '{file_name}': {err_detail}")
        raise ValueError(f"Supabase file download failed: {err_detail}")

