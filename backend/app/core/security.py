from datetime import datetime, timedelta, timezone
from typing import cast

from jose import jwt
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    if settings.secret_key is None or settings.algorithm is None:
        raise RuntimeError("JWT security settings are not configured")

    if expires_delta is None:
        if settings.access_token_expire_minutes is None:
            raise RuntimeError("JWT expiration is not configured")
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)

    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": issued_at,
        "exp": issued_at + expires_delta,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict[str, object]:
    if settings.secret_key is None or settings.algorithm is None:
        raise RuntimeError("JWT security settings are not configured")

    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm],
    )
    return cast(dict[str, object], payload)
