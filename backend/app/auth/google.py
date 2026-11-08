from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol, cast

from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request
from google.oauth2 import id_token


class GoogleCredentialInvalidError(Exception):
    """Raised when Google did not issue a usable credential for this app."""


@dataclass(frozen=True)
class GoogleIdentityClaims:
    subject: str
    email: str
    full_name: str | None


class GoogleCredentialVerifier(Protocol):
    def verify(self, credential: str, *, nonce: str) -> GoogleIdentityClaims: ...


class GoogleIDTokenVerifier:
    """Verify Google ID tokens with Google's maintained signing-key client."""

    def __init__(self, client_id: str) -> None:
        self.client_id = client_id
        self.request = Request()

    def verify(self, credential: str, *, nonce: str) -> GoogleIdentityClaims:
        try:
            payload = cast(
                dict[str, object],
                id_token.verify_oauth2_token(
                    credential,
                    self.request,
                    audience=self.client_id,
                ),
            )
        except (GoogleAuthError, ValueError) as exc:
            raise GoogleCredentialInvalidError from exc

        issuer = payload.get("iss")
        audience = payload.get("aud")
        expiration = payload.get("exp")
        subject = payload.get("sub")
        email = payload.get("email")
        email_verified = payload.get("email_verified")
        token_nonce = payload.get("nonce")
        if (
            issuer not in {"accounts.google.com", "https://accounts.google.com"}
            or audience != self.client_id
            or not isinstance(expiration, (int, float))
            or expiration <= datetime.now(timezone.utc).timestamp()
            or not isinstance(subject, str)
            or not subject.strip()
            or not isinstance(email, str)
            or not email.strip()
            or email_verified is not True
            or token_nonce != nonce
        ):
            raise GoogleCredentialInvalidError

        name = payload.get("name")
        return GoogleIdentityClaims(
            subject=subject,
            email=email.strip().lower(),
            full_name=name.strip() if isinstance(name, str) and name.strip() else None,
        )
