from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.deps import (
    AccountLifecycleServiceDep,
    AuthRateLimitServiceDep,
    CurrentUserDep,
    GoogleAuthServiceDep,
    RequestRateLimitServiceDep,
    UserServiceDep,
)
from app.auth.google import GoogleCredentialInvalidError
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    AccountActionResponse,
    AccountEmailRequest,
    AccountTokenRequest,
    GoogleAuthAttemptResponse,
    GoogleAuthResponse,
    GoogleCredentialRequest,
    GoogleLinkResponse,
    GoogleLinkStatusResponse,
    LoginRequest,
    PasswordResetConfirmRequest,
    TokenResponse,
)
from app.schemas.user import UserCreate, UserRead
from app.services.account_lifecycle import (
    AccountActionTokenExpiredError,
    AccountActionTokenInvalidError,
    PasswordResetReuseError,
)
from app.services.user import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
)
from app.services.request_rate_limit import (
    AuthRateLimitAction,
    AuthRateLimitService,
    RateLimitScope,
    RequestRateLimitExceededError,
    RequestRateLimitService,
    resolve_client_address,
)
from app.services.external_auth import (
    ExternalAuthAttemptExpiredError,
    ExternalAuthAttemptInvalidError,
    GoogleAccountLinkMismatchError,
    GoogleAccountLinkRequiredError,
    GoogleAccountUnavailableError,
    GoogleIdentityAlreadyLinkedError,
)


router = APIRouter()


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    request: Request,
    data: UserCreate,
    rate_limiter: AuthRateLimitServiceDep,
    service: UserServiceDep,
    lifecycle_service: AccountLifecycleServiceDep,
) -> User:
    try:
        rate_limiter.enforce(
            "register",
            email=str(data.email),
            peer_host=request.client.host if request.client is not None else None,
            real_ip=request.headers.get("X-Real-IP"),
            forwarded_for=request.headers.get("X-Forwarded-For"),
        )
        user = service.register(data)
        lifecycle_service.send_initial_verification(user)
        return user
    except RequestRateLimitExceededError as exc:
        raise _rate_limit_response(exc) from exc
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from exc


@router.post("/login", response_model=TokenResponse)
def login_user(
    request: Request,
    data: LoginRequest,
    rate_limiter: AuthRateLimitServiceDep,
    service: UserServiceDep,
) -> TokenResponse:
    try:
        rate_limiter.enforce(
            "login",
            email=str(data.email),
            peer_host=request.client.host if request.client is not None else None,
            real_ip=request.headers.get("X-Real-IP"),
            forwarded_for=request.headers.get("X-Forwarded-For"),
        )
        access_token = service.authenticate(str(data.email), data.password)
    except RequestRateLimitExceededError as exc:
        raise _rate_limit_response(exc) from exc
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except EmailNotVerifiedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "email_not_verified",
                "message": "Please verify your email address before signing in.",
            },
        ) from exc

    return TokenResponse(access_token=access_token)


@router.post("/google/attempt", response_model=GoogleAuthAttemptResponse)
def create_google_auth_attempt(
    request: Request,
    rate_limiter: RequestRateLimitServiceDep,
    service: GoogleAuthServiceDep,
) -> GoogleAuthAttemptResponse:
    _require_allowed_google_origin(request)
    _enforce_google_rate_limit(request, rate_limiter, action="attempt")
    result = service.issue_attempt(purpose="authenticate")
    return GoogleAuthAttemptResponse(
        attempt_id=result.attempt_id,
        nonce=result.nonce,
        expires_at=result.expires_at,
    )


@router.post("/google", response_model=GoogleAuthResponse)
def authenticate_with_google(
    request: Request,
    data: GoogleCredentialRequest,
    rate_limiter: RequestRateLimitServiceDep,
    service: GoogleAuthServiceDep,
) -> GoogleAuthResponse:
    _require_allowed_google_origin(request)
    _enforce_google_rate_limit(
        request,
        rate_limiter,
        action="exchange",
        attempt_id=str(data.attempt_id),
    )
    try:
        result = service.authenticate(
            attempt_id=data.attempt_id,
            nonce=data.nonce,
            credential=data.credential,
        )
    except GoogleCredentialInvalidError as exc:
        raise _google_error(
            status.HTTP_401_UNAUTHORIZED,
            "google_credential_invalid",
            "La réponse Google est invalide ou a expiré.",
        ) from exc
    except ExternalAuthAttemptExpiredError as exc:
        raise _google_error(
            status.HTTP_400_BAD_REQUEST,
            "google_auth_attempt_expired",
            "La tentative de connexion Google a expiré. Réessayez.",
        ) from exc
    except ExternalAuthAttemptInvalidError as exc:
        raise _google_error(
            status.HTTP_400_BAD_REQUEST,
            "google_auth_attempt_invalid",
            "La tentative de connexion Google n’est plus valide. Réessayez.",
        ) from exc
    except GoogleAccountLinkRequiredError as exc:
        raise _google_error(
            status.HTTP_409_CONFLICT,
            "google_account_link_required",
            (
                "Un compte TaskMiner existe déjà avec cette adresse. "
                "Connectez-vous avec votre mot de passe, puis liez Google "
                "depuis Paramètres > Sécurité."
            ),
        ) from exc
    except GoogleAccountUnavailableError as exc:
        raise _google_error(
            status.HTTP_403_FORBIDDEN,
            "google_account_unavailable",
            "Ce compte TaskMiner n’est pas disponible.",
        ) from exc
    return GoogleAuthResponse(
        access_token=result.access_token,
        user=UserRead.model_validate(result.user),
        is_new_user=result.is_new_user,
    )


@router.get("/google/link", response_model=GoogleLinkStatusResponse)
def get_google_link_status(
    current_user: CurrentUserDep,
    service: GoogleAuthServiceDep,
) -> GoogleLinkStatusResponse:
    return GoogleLinkStatusResponse(linked=service.is_linked(current_user))


@router.post("/google/link/attempt", response_model=GoogleAuthAttemptResponse)
def create_google_link_attempt(
    request: Request,
    current_user: CurrentUserDep,
    rate_limiter: RequestRateLimitServiceDep,
    service: GoogleAuthServiceDep,
) -> GoogleAuthAttemptResponse:
    _require_allowed_google_origin(request)
    _enforce_google_rate_limit(
        request,
        rate_limiter,
        action="link_attempt",
        attempt_id=str(current_user.id),
    )
    result = service.issue_attempt(purpose="link", user=current_user)
    return GoogleAuthAttemptResponse(
        attempt_id=result.attempt_id,
        nonce=result.nonce,
        expires_at=result.expires_at,
    )


@router.post("/google/link", response_model=GoogleLinkResponse)
def link_google_account(
    request: Request,
    data: GoogleCredentialRequest,
    current_user: CurrentUserDep,
    rate_limiter: RequestRateLimitServiceDep,
    service: GoogleAuthServiceDep,
) -> GoogleLinkResponse:
    _require_allowed_google_origin(request)
    _enforce_google_rate_limit(
        request,
        rate_limiter,
        action="link",
        attempt_id=str(current_user.id),
    )
    try:
        result = service.link(
            current_user,
            attempt_id=data.attempt_id,
            nonce=data.nonce,
            credential=data.credential,
        )
    except GoogleCredentialInvalidError as exc:
        raise _google_error(
            status.HTTP_401_UNAUTHORIZED,
            "google_credential_invalid",
            "La réponse Google est invalide ou a expiré.",
        ) from exc
    except ExternalAuthAttemptExpiredError as exc:
        raise _google_error(
            status.HTTP_400_BAD_REQUEST,
            "google_auth_attempt_expired",
            "La tentative de liaison Google a expiré. Réessayez.",
        ) from exc
    except ExternalAuthAttemptInvalidError as exc:
        raise _google_error(
            status.HTTP_400_BAD_REQUEST,
            "google_auth_attempt_invalid",
            "La tentative de liaison Google n’est plus valide. Réessayez.",
        ) from exc
    except GoogleAccountLinkMismatchError as exc:
        raise _google_error(
            status.HTTP_409_CONFLICT,
            "google_account_email_mismatch",
            "Utilisez le compte Google qui porte la même adresse e-mail.",
        ) from exc
    except GoogleIdentityAlreadyLinkedError as exc:
        raise _google_error(
            status.HTTP_409_CONFLICT,
            "google_identity_already_linked",
            "Ce compte Google est déjà lié à un compte TaskMiner.",
        ) from exc
    return GoogleLinkResponse(
        linked=result.linked,
        message=(
            "Google est déjà lié à votre compte."
            if result.already_linked
            else "Google a été lié à votre compte TaskMiner."
        ),
    )


@router.post(
    "/email-verification/request",
    response_model=AccountActionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_email_verification(
    request: Request,
    data: AccountEmailRequest,
    background_tasks: BackgroundTasks,
    rate_limiter: AuthRateLimitServiceDep,
    service: AccountLifecycleServiceDep,
) -> AccountActionResponse:
    try:
        _enforce_rate_limit(request, rate_limiter, "email_verification", data.email)
    except RequestRateLimitExceededError as exc:
        raise _rate_limit_response(exc) from exc
    background_tasks.add_task(service.request_email_verification, str(data.email))
    return AccountActionResponse(
        message=("Si ce compte peut être vérifié, un e-mail vient de lui être envoyé.")
    )


@router.post(
    "/email-verification/confirm",
    response_model=AccountActionResponse,
)
def confirm_email_verification(
    data: AccountTokenRequest,
    service: AccountLifecycleServiceDep,
) -> AccountActionResponse:
    try:
        result = service.verify_email(data.token)
    except AccountActionTokenExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "email_verification_token_expired",
                "message": "Ce lien de vérification a expiré.",
            },
        ) from exc
    except AccountActionTokenInvalidError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "email_verification_token_invalid",
                "message": "Ce lien de vérification est invalide.",
            },
        ) from exc
    return AccountActionResponse(
        message="Votre adresse e-mail est vérifiée.",
        already_completed=result.already_verified,
    )


@router.post(
    "/password-reset/request",
    response_model=AccountActionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_password_reset(
    request: Request,
    data: AccountEmailRequest,
    background_tasks: BackgroundTasks,
    rate_limiter: AuthRateLimitServiceDep,
    service: AccountLifecycleServiceDep,
) -> AccountActionResponse:
    try:
        _enforce_rate_limit(request, rate_limiter, "password_reset", data.email)
    except RequestRateLimitExceededError as exc:
        raise _rate_limit_response(exc) from exc
    background_tasks.add_task(service.request_password_reset, str(data.email))
    return AccountActionResponse(
        message=(
            "Si un compte actif correspond à cette adresse, un e-mail de "
            "réinitialisation vient d’être envoyé."
        )
    )


@router.post(
    "/password-reset/confirm",
    response_model=AccountActionResponse,
)
def confirm_password_reset(
    data: PasswordResetConfirmRequest,
    service: AccountLifecycleServiceDep,
) -> AccountActionResponse:
    try:
        service.reset_password(data.token, data.new_password)
    except AccountActionTokenExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "password_reset_token_expired",
                "message": "Ce lien de réinitialisation a expiré.",
            },
        ) from exc
    except AccountActionTokenInvalidError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "password_reset_token_invalid",
                "message": (
                    "Ce lien de réinitialisation est invalide ou a déjà été utilisé."
                ),
            },
        ) from exc
    except PasswordResetReuseError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "password_reset_password_reused",
                "message": (
                    "Le nouveau mot de passe doit être différent du mot de passe actuel."
                ),
            },
        ) from exc
    return AccountActionResponse(message="Votre mot de passe a été réinitialisé.")


def _enforce_rate_limit(
    request: Request,
    rate_limiter: AuthRateLimitService,
    action: AuthRateLimitAction,
    email: object,
) -> None:
    rate_limiter.enforce(
        action,
        email=str(email),
        peer_host=request.client.host if request.client is not None else None,
        real_ip=request.headers.get("X-Real-IP"),
        forwarded_for=request.headers.get("X-Forwarded-For"),
    )


def _rate_limit_response(error: RequestRateLimitExceededError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "code": "auth_rate_limit_exceeded",
            "message": "Too many authentication attempts. Please try again later.",
        },
        headers={"Retry-After": str(error.retry_after_seconds)},
    )


def _require_allowed_google_origin(request: Request) -> None:
    origin = request.headers.get("Origin", "").rstrip("/")
    if not origin or origin not in settings.cors_origin_list:
        raise _google_error(
            status.HTTP_403_FORBIDDEN,
            "google_auth_origin_not_allowed",
            "Cette origine n’est pas autorisée pour la connexion Google.",
        )


def _enforce_google_rate_limit(
    request: Request,
    rate_limiter: RequestRateLimitService,
    *,
    action: str,
    attempt_id: str | None = None,
) -> None:
    address = resolve_client_address(
        request.client.host if request.client is not None else None,
        request.headers.get("X-Forwarded-For"),
        real_ip=request.headers.get("X-Real-IP"),
        trusted_proxy_hops=settings.trusted_proxy_hops,
    )
    scopes = [RateLimitScope("ip", address)]
    if attempt_id is not None:
        scopes.append(RateLimitScope("attempt", attempt_id))
    try:
        rate_limiter.enforce(
            action=f"auth_google_{action}",
            scopes=scopes,
            limit=settings.google_auth_rate_limit_requests,
            window_seconds=settings.google_auth_rate_limit_window_seconds,
        )
    except RequestRateLimitExceededError as exc:
        raise _rate_limit_response(exc) from exc


def _google_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message},
    )
