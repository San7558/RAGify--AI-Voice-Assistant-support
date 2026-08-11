from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    url = settings.SUPABASE_URL or ""
    if not url or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration is missing.")
    # Fix 4: guard against the common misconfiguration where the URL includes
    # a path suffix like /rest/v1/ or /storage/. The SDK must receive the bare
    # project root URL (e.g. https://xxxx.supabase.co) or storage endpoints will
    # return 404 with 'Invalid path specified in request URL'.
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
        res = supabase.storage.from_(bucket).upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        return file_name
    except Exception as e:
        raise ValueError(f"Supabase storage upload failed: {str(e)}")

def delete_file(file_name: str):
    try:
        supabase = get_supabase_client()
        supabase.storage.from_(settings.SUPABASE_BUCKET).remove([file_name])
    except Exception as e:
        print(f"Error deleting file from Supabase: {e}")

def download_file(file_name: str) -> bytes:
    """
    Download a file from Supabase Storage and return its raw bytes.
    Used to re-process a document (re-embed) from the stored backup without
    re-scraping the live URL.
    """
    supabase = get_supabase_client()
    response = supabase.storage.from_(settings.SUPABASE_BUCKET).download(file_name)
    return response

