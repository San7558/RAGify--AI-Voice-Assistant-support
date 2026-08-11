import logging
import urllib.parse
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

def _get_supabase_host() -> str:
    url = (getattr(settings, "SUPABASE_URL", "") or "").strip()
    if not url:
        return "unconfigured"
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.netloc or parsed.path or "invalid-url"
    except Exception:
        return "invalid-url"

def get_supabase_client() -> Client:
    url = (getattr(settings, "SUPABASE_URL", "") or "").strip()
    key = (getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "") or "").strip()
    if not url or not key:
        raise ValueError(f"Supabase configuration missing (has_url={bool(url)}, has_key={bool(key)})")
    
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
    return create_client(url, key)

def _format_exception(e: Exception) -> str:
    cause = getattr(e, "__cause__", None)
    if cause:
        return f"{type(e).__name__} (caused by {type(cause).__name__}: {cause})"
    
    err_str = str(e)
    if "cannot access local variable 'response'" in err_str:
        return f"{type(e).__name__}: Connection/network failure before HTTP response received"
    
    return f"{type(e).__name__}: {err_str}" if err_str else type(e).__name__

async def upload_file(file_bytes: bytes, file_name: str, content_type: str) -> str:
    bucket = getattr(settings, "SUPABASE_BUCKET", "ragify-files")
    host = _get_supabase_host()
    has_key = bool((getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "") or "").strip())
    
    try:
        supabase = get_supabase_client()
        supabase.storage.from_(bucket).upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        logger.info(f"Supabase Storage diagnostic: operation=upload status=success host={host} bucket={bucket} file={file_name}")
        return file_name
    except Exception as e:
        formatted_err = _format_exception(e)
        logger.warning(
            f"Supabase Storage diagnostic:\n"
            f"  operation=upload\n"
            f"  host={host}\n"
            f"  has_url={bool(getattr(settings, 'SUPABASE_URL', ''))}\n"
            f"  has_key={has_key}\n"
            f"  bucket={bucket}\n"
            f"  file={file_name}\n"
            f"  error_type={type(e).__name__}\n"
            f"  error={formatted_err}"
        )
        raise ValueError(f"Supabase storage upload failed: {formatted_err}")

def delete_file(file_name: str):
    if not file_name:
        return
    bucket = getattr(settings, "SUPABASE_BUCKET", "ragify-files")
    host = _get_supabase_host()
    try:
        supabase = get_supabase_client()
        supabase.storage.from_(bucket).remove([file_name])
        logger.info(f"Supabase Storage diagnostic: operation=delete status=success host={host} bucket={bucket} file={file_name}")
    except Exception as e:
        formatted_err = _format_exception(e)
        logger.warning(
            f"Supabase Storage diagnostic:\n"
            f"  operation=delete\n"
            f"  host={host}\n"
            f"  bucket={bucket}\n"
            f"  file={file_name}\n"
            f"  error_type={type(e).__name__}\n"
            f"  error={formatted_err}"
        )

def download_file(file_name: str) -> bytes:
    """
    Download a file from Supabase Storage and return its raw bytes.
    Used to re-process a document (re-embed) from the stored backup without
    re-scraping the live URL.
    """
    bucket = getattr(settings, "SUPABASE_BUCKET", "ragify-files")
    host = _get_supabase_host()
    try:
        supabase = get_supabase_client()
        data = supabase.storage.from_(bucket).download(file_name)
        logger.info(f"Supabase Storage diagnostic: operation=download status=success host={host} bucket={bucket} file={file_name}")
        return data
    except Exception as e:
        formatted_err = _format_exception(e)
        logger.error(
            f"Supabase Storage diagnostic:\n"
            f"  operation=download\n"
            f"  host={host}\n"
            f"  bucket={bucket}\n"
            f"  file={file_name}\n"
            f"  error_type={type(e).__name__}\n"
            f"  error={formatted_err}"
        )
        raise ValueError(f"Supabase file download failed: {formatted_err}")

