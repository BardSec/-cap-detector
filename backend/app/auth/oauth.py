"""
OAuth2 helpers for Microsoft 365 (Azure AD) and Google Workspace.
Both providers use the authorization-code flow.
"""
import httpx
from app.config import settings

# ── Microsoft ─────────────────────────────────────────────────────────────────
MS_AUTH_BASE = f"https://login.microsoftonline.com/{settings.microsoft_tenant_id}/oauth2/v2.0"
MS_SCOPES = "openid email profile User.Read"

MS_GRAPH_ME = "https://graph.microsoft.com/v1.0/me"


def get_microsoft_authorize_url(redirect_uri: str, state: str) -> str:
    import urllib.parse
    params = {
        "client_id": settings.microsoft_client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": MS_SCOPES,
        "state": state,
        "response_mode": "query",
    }
    return f"{MS_AUTH_BASE}/authorize?" + urllib.parse.urlencode(params)


async def exchange_microsoft_code(code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{MS_AUTH_BASE}/token",
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        token_data = resp.json()

        me_resp = await client.get(
            MS_GRAPH_ME,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        me_resp.raise_for_status()
        me = me_resp.json()

    return {
        "provider": "microsoft",
        "provider_id": me.get("id", ""),
        "email": (me.get("mail") or me.get("userPrincipalName") or "").lower(),
        "display_name": me.get("displayName", me.get("mail", "User")),
    }


# ── Google ────────────────────────────────────────────────────────────────────
GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_SCOPES = "openid email profile"


def get_google_authorize_url(redirect_uri: str, state: str) -> str:
    import urllib.parse
    params = {
        "client_id": settings.google_client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": GOOGLE_SCOPES,
        "state": state,
        "access_type": "online",
    }
    return GOOGLE_AUTH_BASE + "?" + urllib.parse.urlencode(params)


async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        token_data = resp.json()

        info_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        info_resp.raise_for_status()
        info = info_resp.json()

    return {
        "provider": "google",
        "provider_id": info.get("sub", ""),
        "email": info.get("email", "").lower(),
        "display_name": info.get("name", info.get("email", "User")),
    }
