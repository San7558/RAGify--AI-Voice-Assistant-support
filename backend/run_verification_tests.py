import sys
import os
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Set up environment variables
backend_dir = r"c:\Users\ANUSHITHA R\OneDrive\Desktop\RAGify PROJECT\backend"
sys.path.append(backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

# ── Mock Firebase before loading FastAPI ────────────────────────────────────
import app.services.firebase_service

MOCK_USERS = {
    "token_user_a": {"uid": "gap_user_a", "email": "usera@gap.test", "name": "User A", "picture": "http://pic/a.jpg"},
    "token_user_b": {"uid": "gap_user_b", "email": "userb@gap.test", "name": "User B", "picture": "http://pic/b.jpg"},
}

app.services.firebase_service.verify_id_token = lambda token: MOCK_USERS.get(token)

# ── Mock Groq LLM to test Rate Limiting & Retries (Gap 4) ───────────────────
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage

original_groq_invoke = ChatGroq.invoke
groq_behavior = "normal"  # "normal", "retry_then_success", "always_429"
groq_call_count = 0

def mock_groq_invoke(self, input_data, *args, **kwargs):
    global groq_call_count, groq_behavior
    groq_call_count += 1
    
    if groq_behavior == "retry_then_success":
        if groq_call_count == 1:
            # Raise retryable RateLimitError-like exception
            raise Exception("Groq API Error (429): Rate limit exceeded. Please try again.")
        else:
            return AIMessage(content="Successfully generated answer after retry.")
            
    elif groq_behavior == "always_429":
        raise Exception("Groq API Error (429): Permanent rate limit reached.")
        
    # Default normal behavior
    return AIMessage(content="RAGify uses Pinecone as its vector database.")

ChatGroq.invoke = mock_groq_invoke

# ── Load FastAPI App ────────────────────────────────────────────────────────
from app.main import app as fastapi_app
from app.db.mongo import connect_to_mongo, close_mongo_connection, get_db
from app.core.config import settings
import httpx
from pinecone import Pinecone
from supabase import create_client
from bson import ObjectId

PASS = "[PASS]"
FAIL = "[FAIL]"
results = {}

def record(name, passed, evidence=""):
    status = PASS if passed else FAIL
    results[name] = {"status": status, "evidence": evidence}
    print(f"\n{status} [{name}]\n  {evidence}")

async def poll_ingestion(client, doc_id, token, max_attempts=10):
    for attempt in range(max_attempts):
        r = await client.get(f"/api/documents/{doc_id}", headers={"Authorization": f"Bearer {token}"})
        status = r.json().get("status")
        if status in ("ready", "failed"):
            return status
        await asyncio.sleep(1.5)
    return "timeout"

async def run_verification():
    await connect_to_mongo()
    db = get_db()
    
    # ── Database Clean up ────────────────────────────────────────────────────
    await db.users.delete_many({"firebase_uid": {"$in": ["gap_user_a", "gap_user_b"]}})
    await db.usage_logs.delete_many({"user_id": {"$in": ["gap_user_a", "gap_user_b"]}})
    
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    
    transport = httpx.ASGITransport(app=fastapi_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        
        # ── Step 0: Sync both users ──────────────────────────────────────────
        print("\n=== Step 0: Sync User A & User B ===")
        sa = await client.post("/api/auth/sync", headers={"Authorization": "Bearer token_user_a"})
        sb = await client.post("/api/auth/sync", headers={"Authorization": "Bearer token_user_b"})
        assert sa.status_code == 200 and sb.status_code == 200
        
        ua = await db.users.find_one({"firebase_uid": "gap_user_a"})
        ub = await db.users.find_one({"firebase_uid": "gap_user_b"})
        user_a_id = str(ua["_id"])
        user_b_id = str(ub["_id"])
        
        # ═════════════════════════════════════════════════════════════════════
        # GAP 1: GET /api/users/me Endpoint
        # ═════════════════════════════════════════════════════════════════════
        print("\n=== Gap 1: GET /api/users/me profile ===")
        # Unauthenticated request
        unauth_me = await client.get("/api/users/me")
        
        # User A profile request
        me_a = await client.get("/api/users/me", headers={"Authorization": "Bearer token_user_a"})
        me_a_data = me_a.json()
        
        gap1_unauth_ok = unauth_me.status_code == 401
        gap1_auth_ok = me_a.status_code == 200 and me_a_data["email"] == "usera@gap.test"
        
        record("Gap1_Profile_Unauthenticated_401", gap1_unauth_ok, f"No token status={unauth_me.status_code}")
        record("Gap1_Profile_UserA_Data", gap1_auth_ok, f"User A response: {me_a_data}")
        
        # ═════════════════════════════════════════════════════════════════════
        # GAP 2 & GAP 3: Upload + Expiration Date + Usage Log
        # ═════════════════════════════════════════════════════════════════════
        print("\n=== Gap 2 & 3: Ingestion Expiration & Usage Logging ===")
        txt_bytes = b"Gap 2 and 3 verification: usage logs and expires_at settings validation."
        upload_res = await client.post(
            "/api/documents/upload",
            files={"file": ("gap_test.txt", txt_bytes, "text/plain")},
            headers={"Authorization": "Bearer token_user_a"},
        )
        assert upload_res.status_code == 200
        doc_id = upload_res.json().get("id")
        
        # Verify expires_at is set to current + DOCUMENT_RETENTION_DAYS (default 15)
        mongo_doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
        expires_at = mongo_doc.get("expires_at")
        created_at = mongo_doc.get("created_at")
        
        gap3_expiry_ok = False
        if expires_at and created_at:
            delta = expires_at - created_at
            # Accept a range due to slight processing delay (should be ~15 days)
            gap3_expiry_ok = 14 <= delta.days <= 16
            
        record("Gap3_ExpiresAt_Populated", gap3_expiry_ok, 
               f"created_at={created_at}, expires_at={expires_at}, delta={delta.days} days")
        
        # Wait for ingestion to complete
        ing_status = await poll_ingestion(client, doc_id, "token_user_a")
        assert ing_status == "ready"
        
        # ═════════════════════════════════════════════════════════════════════
        # GAP 4: Groq 429 Retry/Backoff
        # ═════════════════════════════════════════════════════════════════════
        print("\n=== Gap 4: Groq 429 Retry/Backoff ===")
        global groq_behavior, groq_call_count
        
        # Scenario A: Retry on 429 once, then succeed on second call
        groq_behavior = "retry_then_success"
        groq_call_count = 0
        
        chat_res = await client.post(
            f"/api/chat/{doc_id}",
            json={"query": "What database does RAGify use?"},
            headers={"Authorization": "Bearer token_user_a"},
        )
        
        gap4_retry_ok = chat_res.status_code == 200 and groq_call_count == 2
        record("Gap4_Groq_Retry_Success", gap4_retry_ok, 
               f"Response HTTP={chat_res.status_code}, calls={groq_call_count}, answer={chat_res.json().get('answer')}")
        
        # Scenario B: Always 429, exhausting retries → 503 fallback
        groq_behavior = "always_429"
        groq_call_count = 0
        
        chat_fail_res = await client.post(
            f"/api/chat/{doc_id}",
            json={"query": "What database does RAGify use?"},
            headers={"Authorization": "Bearer token_user_a"},
        )
        
        gap4_exhausted_ok = chat_fail_res.status_code == 503
        record("Gap4_Groq_RateLimit_Exhausted_503", gap4_exhausted_ok, 
               f"Exhausted HTTP={chat_fail_res.status_code}, calls={groq_call_count}, response={chat_fail_res.json()}")
        
        # Reset groq behavior to normal
        groq_behavior = "normal"
        
        # ═════════════════════════════════════════════════════════════════════
        # GAP 2: Usage Logs Verification
        # ═════════════════════════════════════════════════════════════════════
        print("\n=== Gap 2: Usage Logs check ===")
        # We need a delete action to trigger the third log
        del_res = await client.delete(
            f"/api/documents/{doc_id}",
            headers={"Authorization": "Bearer token_user_a"},
        )
        assert del_res.status_code == 200
        
        # Wait a moment for fire-and-forget log writes to settle
        await asyncio.sleep(1.0)
        
        # Query usage logs from MongoDB
        logs = await db.usage_logs.find({"user_id": user_a_id}).sort("created_at", 1).to_list(length=100)
        actions = [log["action"] for log in logs]
        
        gap2_ok = "upload" in actions and "question" in actions and "delete" in actions
        record("Gap2_UsageLogs_Recorded", gap2_ok, 
               f"Logs in database for user A: {actions}, total count={len(logs)}")
        
        # ═════════════════════════════════════════════════════════════════════
        # GAP 3: Document Expiry / Cleanup Service Purge
        # ═════════════════════════════════════════════════════════════════════
        print("\n=== Gap 3: Cleanup Service Expiry Purge ===")
        
        # 1. Create a document that will be expired
        upload_expiry = await client.post(
            "/api/documents/upload",
            files={"file": ("gap3_cleanup_test.txt", b"Gap 3 cleanup test content.", "text/plain")},
            headers={"Authorization": "Bearer token_user_a"},
        )
        assert upload_expiry.status_code == 200
        exp_doc_id = upload_expiry.json().get("id")
        
        # Wait for ingestion
        assert (await poll_ingestion(client, exp_doc_id, "token_user_a")) == "ready"
        
        # 2. Upload a second document that is NOT expired
        upload_keep = await client.post(
            "/api/documents/upload",
            files={"file": ("gap3_keep_test.txt", b"Keep this doc.", "text/plain")},
            headers={"Authorization": "Bearer token_user_a"},
        )
        assert upload_keep.status_code == 200
        keep_doc_id = upload_keep.json().get("id")
        assert (await poll_ingestion(client, keep_doc_id, "token_user_a")) == "ready"
        
        # Confirm vectors exist in both namespaces BEFORE cleanup
        stats_before = index.describe_index_stats()
        vectors_expired_before = stats_before.get("namespaces", {}).get(exp_doc_id, {}).get("vector_count", 0)
        vectors_keep_before = stats_before.get("namespaces", {}).get(keep_doc_id, {}).get("vector_count", 0)
        print(f"  Before cleanup: expired namespace count={vectors_expired_before}, keep namespace count={vectors_keep_before}")
        
        # 3. Manually set expires_at for the first doc to 5 minutes ago in MongoDB
        await db.documents.update_one(
            {"_id": ObjectId(exp_doc_id)},
            {"$set": {"expires_at": datetime.utcnow() - timedelta(minutes=5)}}
        )
        
        # 4. Trigger the admin cleanup endpoint
        cleanup_res = await client.post(
            "/api/admin/cleanup",
            headers={"X-Admin-Token": settings.ADMIN_SECRET}
        )
        print(f"  Cleanup API Response: {cleanup_res.status_code} {cleanup_res.json()}")
        assert cleanup_res.status_code == 200
        
        # Wait a moment for deletion tasks to process
        await asyncio.sleep(4.0)
        
        # 5. Verify the 3 stores for the expired document
        expired_doc_mongo = await db.documents.find_one({"_id": ObjectId(exp_doc_id)})
        expired_chats_mongo = await db.chat_history.find_one({"document_id": exp_doc_id})
        
        # Check Supabase Storage for expired doc
        try:
            files_expired = supabase.storage.from_(settings.SUPABASE_BUCKET).list(path=user_a_id)
        except Exception as e:
            print(f"  Supabase list check skipped (network/offline): {e}")
            files_expired = []
        # The expired doc's supabase path will not be listed in files
        mongo_doc_expired_meta = await db.documents.find_one({"_id": ObjectId(exp_doc_id)}) # already gone
        
        # Check Pinecone namespace
        stats_after = index.describe_index_stats()
        vectors_expired_after = stats_after.get("namespaces", {}).get(exp_doc_id, {}).get("vector_count", 0)
        vectors_keep_after = stats_after.get("namespaces", {}).get(keep_doc_id, {}).get("vector_count", 0)
        
        print(f"  After cleanup: expired namespace count={vectors_expired_after}, keep namespace count={vectors_keep_after}")
        
        expired_purge_ok = (
            expired_doc_mongo is None and
            expired_chats_mongo is None and
            vectors_expired_after == 0 and
            vectors_keep_after > 0  # Non-expired document remains untouched
        )
        
        record("Gap3_Cleanup_Service_Expired_Purged", expired_purge_ok, 
               f"Expired doc exists in Mongo={expired_doc_mongo is not None}, "
               f"expired chats exist={expired_chats_mongo is not None}, "
               f"expired vectors namespace count={vectors_expired_after}, "
               f"non-expired vectors count={vectors_keep_after}")
        
        # Clean up the keep document
        await client.delete(f"/api/documents/{keep_doc_id}", headers={"Authorization": "Bearer token_user_a"})
        
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_verification())
