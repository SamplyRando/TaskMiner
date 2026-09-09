from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import AuthRateLimitServiceDep, UserServiceDep
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.services.user import InvalidCredentialsError, UserAlreadyExistsError
from app.services.request_rate_limit import RequestRateLimitExceededError


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
) -> User:
    try:
        rate_limiter.enforce(
            "register",
            email=str(data.email),
            peer_host=request.client.host if request.client is not None else None,
            forwarded_for=request.headers.get("X-Forwarded-For"),
        )
        return service.register(data)
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

    return TokenResponse(access_token=access_token)


def _rate_limit_response(error: RequestRateLimitExceededError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "code": "auth_rate_limit_exceeded",
            "message": "Too many authentication attempts. Please try again later.",
        },
        headers={"Retry-After": str(error.retry_after_seconds)},
    )
