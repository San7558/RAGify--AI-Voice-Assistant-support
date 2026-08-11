import firebase_admin
from firebase_admin import credentials, auth
from app.core.config import settings
import json

def init_firebase():
    if not firebase_admin._apps:
        # Reconstruct private key correctly (handle literal \n from env vars)
        private_key = settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n')
        
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

def verify_id_token(token: str):
    try:
        return auth.verify_id_token(token)
    except Exception as e:
        return None
