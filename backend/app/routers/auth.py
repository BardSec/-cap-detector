"""
OAuth2 authentication routes.

  GET  /auth/login/microsoft   → redirect to Azure AD
  GET  /auth/login/google      → redirect to Google
  GET  /auth/callback/microsoft
  GET  /auth/callback/google
  GET  /auth/me                → current user info
"""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth.jwt_handler import create_access_token, get_current_user_id
from app.auth.oauth import (
    exchange_google_code,
    exchange_microsoft_code,
    get_google_authorize_url,
    get_microsoft_authorize_url,
)
from app.config import settings
from app.database import get_db
from app.models import User

router = APIRouter()


def _redirect_uri(provider: str) -> str:
    return f"{settings.frontend_url}/auth/callback/{provider}"


def _check_domain(email: str) -> None:
    allowed = settings.allowed_domain_list
    if not allowed:
        return
    domain = email.split("@")[-1].lower()
    if domain not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Email domain '{domain}' is not permitted to access this tool.",
        )


def _upsert_user(db: Session, provider: str, provider_id: str, email: str, display_name: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.display_name = display_name
        user.last_login = None  # triggers onupdate
        db.commit()
        db.refresh(user)
        return user

    user = User(
        email=email,
        display_name=display_name,
        provider=provider,
        provider_id=provider_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Microsoft ─────────────────────────────────────────────────────────────────

@router.get("/login/microsoft")
def login_microsoft():
    if not settings.microsoft_client_id:
        raise HTTPException(status_code=501, detail="Microsoft OAuth not configured")
    state = secrets.token_urlsafe(16)
    url = get_microsoft_authorize_url(_redirect_uri("microsoft"), state)
    return RedirectResponse(url)


@router.get("/callback/microsoft")
async def callback_microsoft(
    code: str = Query(...),
    state: str = Query(default=""),
    db: Session = Depends(get_db),
):
    user_info = await exchange_microsoft_code(code, _redirect_uri("microsoft"))
    _check_domain(user_info["email"])
    user = _upsert_user(db, **user_info)
    token = create_access_token(user.id, user.email)
    return RedirectResponse(f"{settings.frontend_url}/?token={token}")


# ── Google ────────────────────────────────────────────────────────────────────

@router.get("/login/google")
def login_google():
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    state = secrets.token_urlsafe(16)
    url = get_google_authorize_url(_redirect_uri("google"), state)
    return RedirectResponse(url)


@router.get("/callback/google")
async def callback_google(
    code: str = Query(...),
    state: str = Query(default=""),
    db: Session = Depends(get_db),
):
    user_info = await exchange_google_code(code, _redirect_uri("google"))
    _check_domain(user_info["email"])
    user = _upsert_user(db, **user_info)
    token = create_access_token(user.id, user.email)
    return RedirectResponse(f"{settings.frontend_url}/?token={token}")


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me")
def me(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "provider": user.provider,
    }
