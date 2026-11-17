import os
import sys
import time
import tempfile
import shutil

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.auth.jwt import create_access_token, verify_and_decode_token
from backend.app.auth.storage import AuthStorage
from backend.app.auth.models import UserSettingsUpdate

client = TestClient(app)

def test_jwt_token_creation_and_verification():
    print("Testing JWT Token Creation, Signature & Expiration...")
    payload = {"sub": "USR-123", "email": "test@example.com", "role": "trader"}
    token = create_access_token(payload, expires_delta_sec=3600)
    assert token is not None
    assert len(token.split(".")) == 3

    decoded = verify_and_decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == "USR-123"
    assert decoded["email"] == "test@example.com"

    # Expired token test
    expired_token = create_access_token(payload, expires_delta_sec=-10)
    assert verify_and_decode_token(expired_token) is None
    print("  -> JWT signing, HMAC-SHA256 signature and expiration: PASSED")

def test_auth_storage_and_passwords():
    print("Testing User Profile Storage & Password Hashing...")
    temp_dir = tempfile.mkdtemp()
    try:
        storage = AuthStorage(db_path=os.path.join(temp_dir, "test.db"))
        # Seeded user verification
        user = storage.verify_password("trader@psxsignals.com", "admin123")
        assert user is not None
        assert user.email == "trader@psxsignals.com"
        assert user.role == "trader"

        # Invalid password
        assert storage.verify_password("trader@psxsignals.com", "wrongpass") is None

        # User settings
        settings = storage.get_user_settings(user.id)
        assert settings.default_capital == 1000000.0
        assert settings.default_risk_pct == 1.5

        # Update settings
        updated = storage.update_user_settings(user.id, UserSettingsUpdate(default_capital=2500000.0, default_risk_pct=2.0))
        assert updated.default_capital == 2500000.0
        assert updated.default_risk_pct == 2.0
        print("  -> User profile authentication and settings persistence: PASSED")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_security_headers():
    print("Testing Production Security Headers Injection...")
    res = client.get("/api/health/live")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert "strict-origin-when-cross-origin" in headers.get("referrer-policy", "")
    print("  -> Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS): PASSED")

def test_rate_limiter():
    print("Testing API Rate Limiting Middleware...")
    res = client.get("/api/health")
    assert res.status_code == 200
    # Live route rate limiting
    res_quotes = client.get("/api/market-data/quotes")
    assert res_quotes.status_code == 200
    assert "x-ratelimit-limit" in res_quotes.headers
    assert "x-ratelimit-remaining" in res_quotes.headers
    print(f"  -> Rate limit headers present: Limit={res_quotes.headers.get('x-ratelimit-limit')}, Remaining={res_quotes.headers.get('x-ratelimit-remaining')}: PASSED")

def test_auth_endpoints():
    print("Testing FastAPI Auth Endpoints...")
    # 1. Status
    res_status = client.get("/api/auth/status")
    assert res_status.status_code == 200

    # 2. Login
    res_login = client.post("/api/auth/login", json={
        "email": "trader@psxsignals.com",
        "password": "admin123"
    })
    assert res_login.status_code == 200
    token_data = res_login.json()
    token = token_data["access_token"]
    assert token is not None

    # 3. Access protected /api/auth/me
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "trader@psxsignals.com"

    # 4. Access user settings with token
    res_settings = client.get("/api/user/settings", headers={"Authorization": f"Bearer {token}"})
    assert res_settings.status_code == 200
    assert "default_capital" in res_settings.json()

    # 5. Unauthorized access should return 401
    res_unauth = client.get("/api/auth/me")
    assert res_unauth.status_code == 401
    print("  -> FastAPI login, me, and settings endpoints: ALL PASSED")

if __name__ == "__main__":
    print("==================================================================")
    print("RUNNING AUTHENTICATION, SECURITY & RATE LIMITING TEST SUITE")
    print("==================================================================")
    test_jwt_token_creation_and_verification()
    test_auth_storage_and_passwords()
    test_security_headers()
    test_rate_limiter()
    test_auth_endpoints()
    print("==================================================================")
    print("ALL AUTH & SECURITY TESTS PASSED SUCCESSFULLY! (100% OK)")
    print("==================================================================")
