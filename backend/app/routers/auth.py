import os
from fastapi import APIRouter, HTTPException, Depends, status
from backend.app.auth.models import (
    LoginRequest,
    AuthTokenResponse,
    UserProfile,
    UserSettings,
    UserSettingsUpdate,
)
from backend.app.auth.storage import auth_storage
from backend.app.auth.jwt import create_access_token
from backend.app.auth.dependencies import get_current_user, get_optional_user

router = APIRouter(tags=["Authentication & User Management"])

@router.post("/auth/login", response_model=AuthTokenResponse)
def login(credentials: LoginRequest):
    """
    Authenticate user with email and password.
    Returns signed Bearer JWT token valid for 24 hours.
    """
    user = auth_storage.verify_password(credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "display_name": user.display_name,
    })

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        user=user,
    )

@router.get("/auth/me", response_model=UserProfile)
def get_me(user: UserProfile = Depends(get_current_user)):
    """Retrieve profile of the currently authenticated user."""
    return user

@router.get("/auth/status")
def get_auth_status(optional_user: UserProfile = Depends(get_optional_user)):
    """Check authentication configuration and current session."""
    supabase_configured = bool(
        os.getenv("SUPABASE_URL") and "placeholder" not in os.getenv("SUPABASE_URL", "").lower()
    )
    return {
        "status": "online",
        "authenticated": optional_user is not None,
        "user": optional_user.model_dump() if optional_user else None,
        "provider": "SUPABASE_AUTH" if supabase_configured else "LOCAL_BEARER_AUTH",
        "supabase_configured": supabase_configured,
    }

@router.get("/user/settings", response_model=UserSettings)
def get_user_settings(user: UserProfile = Depends(get_current_user)):
    """Retrieve active user configuration and interface preferences."""
    return auth_storage.get_user_settings(user.id)

@router.put("/user/settings", response_model=UserSettings)
def update_user_settings(update: UserSettingsUpdate, user: UserProfile = Depends(get_current_user)):
    """Update user configuration and trading preferences."""
    return auth_storage.update_user_settings(user.id, update)
