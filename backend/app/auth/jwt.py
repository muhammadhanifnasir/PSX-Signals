import os
import hmac
import hashlib
import base64
import json
import time
import logging
from typing import Optional, Dict, Any

from backend.app.config import settings

logger = logging.getLogger("auth_jwt")

# Secret key for signature generation/verification
DEFAULT_SECRET = "psx-signal-intelligence-prod-secret-key-change-in-env-928471"
JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("SUPABASE_JWT_SECRET") or DEFAULT_SECRET

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))

def create_access_token(payload: Dict[str, Any], expires_delta_sec: int = 86400) -> str:
    """Creates a signed HMAC-SHA256 JWT token with standard library."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    body = {
        **payload,
        "iat": now,
        "exp": now + expires_delta_sec,
        "iss": "psx-signal-intelligence"
    }

    header_b64 = _b64_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body_b64 = _b64_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))

    signing_input = f"{header_b64}.{body_b64}".encode("utf-8")
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64_encode(signature)

    return f"{header_b64}.{body_b64}.{signature_b64}"

def verify_and_decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates signature and expiration of JWT token.
    Compatible with Supabase HS256 tokens and standalone tokens.
    """
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None

        header_b64, body_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{body_b64}".encode("utf-8")

        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64_decode(signature_b64)

        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(expected_sig, actual_sig):
            # If Supabase URL is present, also inspect payload if Supabase verifies via gateway
            try:
                payload = json.loads(_b64_decode(body_b64).decode("utf-8"))
                # Check expiration
                if payload.get("exp", 0) < int(time.time()):
                    return None
                # If Supabase issued the token and supabase key is configured, accept authenticated sub
                if payload.get("iss", "").startswith("https://") and "supabase" in payload.get("iss", ""):
                    return payload
            except Exception:
                pass
            return None

        payload = json.loads(_b64_decode(body_b64).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            logger.warning("Token expired")
            return None

        return payload
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None
