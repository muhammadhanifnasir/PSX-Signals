from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from backend.app.auth.jwt import verify_and_decode_token
from backend.app.auth.models import UserProfile
from backend.app.auth.storage import auth_storage

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[UserProfile]:
    """Extracts and verifies user from Authorization header if present, otherwise returns None."""
    if not authorization:
        return None

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1]
    payload = verify_and_decode_token(token)
    if not payload:
        return None

    user_id = payload.get("sub") or payload.get("id")
    email = payload.get("email", "")

    # Look up in database or construct profile from verified JWT claims
    user = auth_storage.get_user_by_id(user_id) if user_id else None
    if user:
        return user

    if user_id and email:
        return UserProfile(
            id=user_id,
            email=email,
            role=payload.get("role", "trader"),
            display_name=payload.get("user_metadata", {}).get("display_name") or email.split("@")[0],
            created_at=payload.get("created_at", "2026-11-16 00:00:00"),
            is_active=True,
        )
    return None

def get_current_user(user: Optional[UserProfile] = Depends(get_optional_user)) -> UserProfile:
    """Enforces authentication. Raises HTTP 401 if token is missing or invalid."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_admin(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    """Enforces administrator role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required",
        )
    return current_user
