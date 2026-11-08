from datetime import datetime, timedelta, timezone

import pytest

from app.auth.google import GoogleCredentialInvalidError, GoogleIDTokenVerifier


def valid_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "iss": "https://accounts.google.com",
        "aud": "web-client-id",
        "exp": (datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp(),
        "sub": "stable-google-subject",
        "email": "person@example.com",
        "email_verified": True,
        "nonce": "server-nonce",
        "name": "Google Person",
    }
    payload.update(overrides)
    return payload


def test_google_verifier_returns_minimal_verified_claims(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda credential, request, audience: valid_payload(),
    )

    claims = GoogleIDTokenVerifier("web-client-id").verify(
        "credential",
        nonce="server-nonce",
    )

    assert claims.subject == "stable-google-subject"
    assert claims.email == "person@example.com"
    assert claims.full_name == "Google Person"


@pytest.mark.parametrize(
    "override",
    [
        {"aud": "another-client"},
        {"iss": "https://issuer.example"},
        {"exp": (datetime.now(timezone.utc) - timedelta(seconds=1)).timestamp()},
        {"nonce": "another-nonce"},
        {"email_verified": False},
        {"sub": ""},
    ],
)
def test_google_verifier_rejects_wrong_audience_issuer_expiry_and_nonce(
    monkeypatch,
    override: dict[str, object],
) -> None:
    monkeypatch.setattr(
        "app.auth.google.id_token.verify_oauth2_token",
        lambda credential, request, audience: valid_payload(**override),
    )

    with pytest.raises(GoogleCredentialInvalidError):
        GoogleIDTokenVerifier("web-client-id").verify(
            "credential",
            nonce="server-nonce",
        )
