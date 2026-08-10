"""
Google OAuth2
=============

Handles the authorisation of a Google account and keeps its access token fresh.

Google does not accept a password. A credential holds a refresh token instead,
obtained once when the account owner grants access, and that token is exchanged
for a short-lived access token whenever a node needs one.

The exchange happens here rather than in each node, so a node asks for a token
and gets one without knowing how it was come by. Everything Google-facing lives
in this module: the URL the browser is sent to, the two token exchanges, and the
list of scopes a service needs.
"""

from __future__ import annotations

import os
import json
import time
import base64
import logging
import secrets
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# An access token is asked for again a minute before it expires, so a request
# that starts just under the wire does not fail halfway through.
EXPIRY_MARGIN_SECONDS = 60

# What each service needs. Narrow scopes are chosen on purpose: a credential
# meant for reading mail should not be able to empty a Drive.
SERVICE_SCOPES: Dict[str, List[str]] = {
    "gmail": [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/userinfo.email",
    ],
    "gmail_readonly": [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
    ],
    "google_drive": [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/userinfo.email",
    ],
    "google_sheets": [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
    ],
    "google_calendar": [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/userinfo.email",
    ],
}


class GoogleOAuthError(Exception):
    """Raised when Google refuses a request or the setup is incomplete."""


# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------


def _application_client() -> Tuple[str, str]:
    """
    Read the OAuth client this installation registered with Google.

    One client covers every account that connects, which is why it belongs to
    the installation rather than to a credential. Without it the browser has
    nowhere to be sent.
    """
    client_id = (os.getenv("GOOGLE_CLIENT_ID") or "").strip()
    client_secret = (os.getenv("GOOGLE_CLIENT_SECRET") or "").strip()

    if not client_id or not client_secret:
        raise GoogleOAuthError(
            "This installation has no Google OAuth client. Set GOOGLE_CLIENT_ID and "
            "GOOGLE_CLIENT_SECRET, then restart the server. They come from a project in "
            "the Google Cloud console."
        )
    return client_id, client_secret


def redirect_uri() -> str:
    """
    The address Google sends the browser back to.

    It has to match one of the redirect URIs registered against the OAuth client
    exactly, down to the scheme and the trailing path.
    """
    configured = (os.getenv("GOOGLE_OAUTH_REDIRECT_URI") or "").strip()
    if configured:
        return configured

    base = (os.getenv("BACKEND_PUBLIC_URL") or "http://localhost:23056").rstrip("/")
    return f"{base}/api/v1/credentials/google/callback"


def is_configured() -> bool:
    """Whether an OAuth client has been set up for this installation."""
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


def scopes_for(service_type: str) -> List[str]:
    """The scopes a service needs, falling back to read-only where unknown."""
    return SERVICE_SCOPES.get(service_type, SERVICE_SCOPES["gmail_readonly"])


# ----------------------------------------------------------------------
# State
# ----------------------------------------------------------------------


def pack_state(credential_id: str, user_id: str) -> str:
    """
    Build the state Google hands back with the authorisation code.

    It carries the credential the tokens belong to and a random value, which is
    compared on return so a code cannot be replayed against someone else's
    credential.
    """
    payload = {
        "credential_id": str(credential_id),
        "user_id": str(user_id),
        "nonce": secrets.token_urlsafe(16),
        "issued_at": int(time.time()),
    }
    raw = json.dumps(payload, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def unpack_state(state: str) -> Dict[str, Any]:
    """Read the state back, refusing one that is too old to be genuine."""
    try:
        padded = state + "=" * (-len(state) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    except Exception as exc:
        raise GoogleOAuthError("The authorisation response could not be read.") from exc

    issued_at = payload.get("issued_at", 0)
    if time.time() - issued_at > 600:
        raise GoogleOAuthError(
            "The authorisation took too long and has expired. Start it again."
        )

    if not payload.get("credential_id"):
        raise GoogleOAuthError("The authorisation response names no credential.")

    return payload


# ----------------------------------------------------------------------
# The flow
# ----------------------------------------------------------------------


def authorization_url(service_type: str, state: str) -> str:
    """
    Build the URL the browser is sent to.

    access_type=offline is what makes Google return a refresh token, and
    prompt=consent makes it do so again on a repeat authorisation. Without the
    second, connecting an account twice yields no refresh token and the
    credential silently stops working when the first one is revoked.
    """
    client_id, _ = _application_client()

    parameters = {
        "client_id": client_id,
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": " ".join(scopes_for(service_type)),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{AUTHORIZATION_URL}?{urlencode(parameters)}"


def exchange_code(code: str) -> Dict[str, Any]:
    """Turn the authorisation code into the tokens a credential will hold."""
    client_id, client_secret = _application_client()

    response = requests.post(
        TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri(),
            "grant_type": "authorization_code",
        },
        timeout=20,
    )

    if response.status_code != 200:
        raise GoogleOAuthError(_describe_failure(response))

    payload = response.json()
    refresh_token = payload.get("refresh_token")

    if not refresh_token:
        raise GoogleOAuthError(
            "Google returned no refresh token, so the connection would stop working within "
            "the hour. This happens when the account has already granted access; remove the "
            "app under your Google account's security settings and try again."
        )

    return {
        "refresh_token": refresh_token,
        "access_token": payload.get("access_token", ""),
        "expires_at": int(time.time()) + int(payload.get("expires_in", 3600)),
        "scope": payload.get("scope", ""),
        "token_type": payload.get("token_type", "Bearer"),
    }


def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """Ask Google for a fresh access token."""
    client_id, client_secret = _application_client()

    response = requests.post(
        TOKEN_URL,
        data={
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
        },
        timeout=20,
    )

    if response.status_code != 200:
        detail = _describe_failure(response)
        if "invalid_grant" in detail:
            raise GoogleOAuthError(
                "Google no longer accepts this connection. The access was revoked, the "
                "password changed, or the credential sat unused for six months. Connect the "
                "account again."
            )
        raise GoogleOAuthError(detail)

    payload = response.json()
    return {
        "access_token": payload.get("access_token", ""),
        "expires_at": int(time.time()) + int(payload.get("expires_in", 3600)),
        "scope": payload.get("scope", ""),
    }


def account_email(access_token: str) -> str:
    """Read the address of the connected account, so the credential can name it."""
    try:
        response = requests.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        if response.status_code == 200:
            return response.json().get("email", "")
    except Exception as exc:
        logger.warning(f"Could not read the account address: {exc}")
    return ""


def revoke(refresh_token: str) -> None:
    """Tell Google the connection is over."""
    try:
        requests.post(REVOKE_URL, data={"token": refresh_token}, timeout=15)
    except Exception as exc:
        logger.warning(f"Could not revoke the token: {exc}")


# ----------------------------------------------------------------------
# What a node calls
# ----------------------------------------------------------------------


def access_token_for(secret: Dict[str, Any]) -> str:
    """
    Return a usable access token for a credential.

    The one stored alongside the refresh token is reused while it lasts, and a
    new one is fetched when it does not. A node calls this and gets a token; how
    old the last one was is not its concern.

    The refreshed token is not written back, because a node holds a copy of the
    secret rather than the record. That costs one extra call to Google per run,
    which is a fair price for keeping nodes out of the credential store.
    """
    if not isinstance(secret, dict):
        raise GoogleOAuthError("The credential could not be read.")

    stored = secret.get("access_token")
    expires_at = secret.get("expires_at")

    if stored and expires_at:
        try:
            if int(expires_at) - EXPIRY_MARGIN_SECONDS > time.time():
                return stored
        except (TypeError, ValueError):
            pass

    refresh_token = (secret.get("refresh_token") or "").strip()
    if not refresh_token:
        raise GoogleOAuthError(
            "This credential is not connected to a Google account yet. Open it and use "
            "Connect to Google."
        )

    return refresh_access_token(refresh_token)["access_token"]


def _describe_failure(response: "requests.Response") -> str:
    """Turn a Google error response into something worth showing."""
    try:
        payload = response.json()
        error = payload.get("error", "")
        description = payload.get("error_description", "")
        if error and description:
            return f"Google refused the request: {error} ({description})"
        if error:
            return f"Google refused the request: {error}"
    except Exception:
        pass
    return f"Google refused the request with status {response.status_code}."


__all__ = [
    "GoogleOAuthError",
    "SERVICE_SCOPES",
    "is_configured",
    "redirect_uri",
    "scopes_for",
    "pack_state",
    "unpack_state",
    "authorization_url",
    "exchange_code",
    "refresh_access_token",
    "access_token_for",
    "account_email",
    "revoke",
]
