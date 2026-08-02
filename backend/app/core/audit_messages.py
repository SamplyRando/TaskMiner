from typing import Any

from app.core.activity_messages import build_activity_message
from app.core.events import ActivityEventType


def build_audit_message(
    event_type: ActivityEventType,
    metadata: dict[str, Any],
    *,
    success: bool,
) -> str:
    """Build a stable audit description without storing mutable UI text."""

    message = build_activity_message(event_type, metadata)
    return message if success else f"{message} — échec"
