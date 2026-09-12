from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.api.deps import BillingServiceDep, CurrentUserDep
from app.billing.provider import (
    BillingProviderError,
    BillingSignatureError,
)
from app.billing.service import (
    BillingConsentRequiredError,
    BillingEventConflictError,
    BillingEventInvalidError,
    BillingStateError,
)
from app.schemas.billing import (
    BillingCheckoutCreate,
    BillingCheckoutRead,
    BillingPortalRead,
    BillingWebhookRead,
)
from app.services.permission import PermissionDeniedError
from app.services.workspace import WorkspaceNotFoundError


router = APIRouter()
workspace_router = APIRouter()


@workspace_router.post(
    "/{workspace_id}/billing/checkout",
    response_model=BillingCheckoutRead,
)
def create_checkout_session(
    workspace_id: UUID,
    payload: BillingCheckoutCreate,
    current_user: CurrentUserDep,
    service: BillingServiceDep,
) -> BillingCheckoutRead:
    try:
        redirect = service.create_checkout(
            current_user,
            workspace_id,
            immediate_service_requested=payload.immediate_service_requested,
        )
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can manage billing.",
        ) from exc
    except BillingConsentRequiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": "billing_immediate_service_consent_required",
                "message": (
                    "Explicit consent is required before starting Pro Checkout."
                ),
            },
        ) from exc
    except BillingStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "billing_state_conflict",
                "message": str(exc),
            },
        ) from exc
    except BillingProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "billing_provider_unavailable",
                "message": "Billing is temporarily unavailable. Please try again.",
            },
        ) from exc
    return BillingCheckoutRead(checkout_url=redirect.url)


@workspace_router.post(
    "/{workspace_id}/billing/portal",
    response_model=BillingPortalRead,
)
def create_billing_portal_session(
    workspace_id: UUID,
    current_user: CurrentUserDep,
    service: BillingServiceDep,
) -> BillingPortalRead:
    try:
        redirect = service.create_portal(current_user, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        ) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can manage billing.",
        ) from exc
    except BillingStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "billing_state_conflict",
                "message": str(exc),
            },
        ) from exc
    except BillingProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "billing_provider_unavailable",
                "message": "Billing is temporarily unavailable. Please try again.",
            },
        ) from exc
    return BillingPortalRead(portal_url=redirect.url)


@router.post(
    "/stripe/webhook",
    response_model=BillingWebhookRead,
)
async def stripe_webhook(
    request: Request,
    service: BillingServiceDep,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
) -> BillingWebhookRead:
    payload = await request.body()
    try:
        event = service.provider.parse_webhook(payload, stripe_signature)
        result = service.handle_webhook(event)
    except BillingSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_webhook_signature",
                "message": "Invalid webhook signature.",
            },
        ) from exc
    except BillingEventInvalidError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_billing_event",
                "message": "Invalid billing event.",
            },
        ) from exc
    except BillingEventConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "billing_event_conflict",
                "message": "Billing event conflicts with persisted workspace state.",
            },
        ) from exc
    except BillingProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "billing_provider_unavailable",
                "message": "Billing synchronization is temporarily unavailable.",
            },
        ) from exc
    return BillingWebhookRead(
        duplicate=result.duplicate,
        handled=result.handled,
    )
