import logging
import firebase_admin
from firebase_admin import credentials, auth
from app.core.config import settings

logger = logging.getLogger(__name__)

def init_firebase():
    if not firebase_admin._apps:
        private_key = settings.FIREBASE_PRIVATE_KEY
        if private_key:
            # Strip surrounding quotes and convert escaped \n literals to real newlines
            private_key = private_key.strip('"\'').replace('\\n', '\n')
        
        cred_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": "dummy",
            "private_key": private_key,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": "dummy",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{settings.FIREBASE_CLIENT_EMAIL}"
        }
        
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        logger.info(f"Firebase Admin SDK initialized for project: {settings.FIREBASE_PROJECT_ID}")

def verify_id_token(token: str):
    try:
        return auth.verify_id_token(token)
    except Exception as e:
        logger.warning(f"Firebase ID token verification failed ({type(e).__name__}): {e}")
        return None
