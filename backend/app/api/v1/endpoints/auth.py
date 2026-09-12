from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.deps import (
    AccountLifecycleServiceDep,
    AuthRateLimitServiceDep,
    UserServiceDep,
)
from app.models.user import User
from app.schemas.auth import (
    AccountActionResponse,
    AccountEmailRequest,
    AccountTokenRequest,
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
    RequestRateLimitExceededError,
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
