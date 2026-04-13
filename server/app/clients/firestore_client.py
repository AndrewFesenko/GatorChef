from __future__ import annotations

import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]

_firebase_app = None
_firestore_client = None


def _find_default_credentials_path() -> Path | None:
    secret_dir = PROJECT_ROOT.parent / "secret"
    return next(secret_dir.glob("*.json"), None)


def get_firestore_client():
    global _firebase_app, _firestore_client

    if _firestore_client is not None:
        return _firestore_client

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError as exc:
        raise RuntimeError(
            "firebase-admin is not installed. Run 'python -m pip install -r requirements.txt' "
            "from the server folder."
        ) from exc

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not credentials_path:
        default_path = _find_default_credentials_path()
        if default_path is not None:
            credentials_path = str(default_path)

    if not credentials_path:
        raise RuntimeError(
            "No Firebase service account key found. Set GOOGLE_APPLICATION_CREDENTIALS or "
            "place the JSON key in the project's 'secret' folder."
        )

    if not Path(credentials_path).exists():
        raise RuntimeError(f"Firebase credentials file not found: {credentials_path}")

    if _firebase_app is None:
        cred = credentials.Certificate(credentials_path)
        _firebase_app = firebase_admin.initialize_app(cred)

    _firestore_client = firestore.client()
    return _firestore_client
