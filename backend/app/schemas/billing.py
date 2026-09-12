from pydantic import BaseModel, ConfigDict, StrictBool


class BillingCheckoutCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    immediate_service_requested: StrictBool


class BillingCheckoutRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    checkout_url: str


class BillingPortalRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    portal_url: str


class BillingWebhookRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    received: bool = True
    duplicate: bool
    handled: bool
