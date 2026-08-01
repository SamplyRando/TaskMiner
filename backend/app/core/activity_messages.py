from typing import Any

from app.core.events import ActivityEventType


ACTIVITY_EVENT_LABELS: dict[ActivityEventType, str] = {
    ActivityEventType.WORKSPACE_CREATED: "Workspace créé",
    ActivityEventType.WORKSPACE_UPDATED: "Workspace modifié",
    ActivityEventType.PROJECT_CREATED: "Projet créé",
    ActivityEventType.PROJECT_UPDATED: "Projet modifié",
    ActivityEventType.PROJECT_DELETED: "Projet supprimé",
    ActivityEventType.TASK_CREATED: "Tâche créée",
    ActivityEventType.TASK_UPDATED: "Tâche modifiée",
    ActivityEventType.TASK_DELETED: "Tâche supprimée",
    ActivityEventType.TASK_ASSIGNED: "Tâche assignée",
    ActivityEventType.COMMENT_CREATED: "Commentaire ajouté",
    ActivityEventType.ATTACHMENT_UPLOADED: "Pièce jointe ajoutée",
    ActivityEventType.INVITATION_CREATED: "Invitation créée",
    ActivityEventType.INVITATION_ACCEPTED: "Invitation acceptée",
    ActivityEventType.MEMBER_ROLE_UPDATED: "Rôle d’un membre modifié",
}


def build_activity_message(
    event_type: ActivityEventType,
    metadata: dict[str, Any],
) -> str:
    """Build a stable human-readable description from event metadata."""

    label = ACTIVITY_EVENT_LABELS[event_type]
    for key in ("name", "title", "email", "filename"):
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return f"{label} : {value.strip()}"
    return label
