from datetime import datetime, timezone
from html import escape
from urllib.parse import urlencode

from app.email.provider import EmailDeliveryResult, EmailMessage, EmailProvider
from app.models.workspace_member import WorkspaceMemberRole


ROLE_LABELS: dict[WorkspaceMemberRole, str] = {
    WorkspaceMemberRole.OWNER: "Propriétaire",
    WorkspaceMemberRole.ADMIN: "Administrateur",
    WorkspaceMemberRole.MEMBER: "Membre",
    WorkspaceMemberRole.VIEWER: "Lecteur",
}


class EmailService:
    """Build and deliver provider-neutral TaskMiner transactional messages."""

    def __init__(
        self,
        provider: EmailProvider,
        *,
        sender: str,
        frontend_url: str,
    ) -> None:
        self.provider = provider
        self.sender = sender
        self.frontend_url = frontend_url.rstrip("/")

    def send_workspace_invitation(
        self,
        *,
        recipient: str,
        token: str,
        workspace_name: str,
        inviter_name: str,
        inviter_email: str,
        role: WorkspaceMemberRole,
        expires_at: datetime,
        idempotency_key: str,
    ) -> EmailDeliveryResult:
        """Send an invitation without exposing its token outside the message."""

        invitation_url = self._invitation_url(token)
        role_label = ROLE_LABELS[role]
        expiration = self._format_expiration(expires_at)
        subject = f"Invitation à rejoindre {workspace_name} sur TaskMiner"
        safe_workspace = escape(workspace_name)
        safe_inviter_name = escape(inviter_name)
        safe_inviter_email = escape(inviter_email)
        safe_role = escape(role_label)
        safe_expiration = escape(expiration)
        safe_url = escape(invitation_url, quote=True)
        html = f"""<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#0b0b10;color:#f7f7fb;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:40px 24px">
      <p style="margin:0 0 28px;color:#a78bfa;font-size:18px;font-weight:700">TaskMiner</p>
      <div style="border:1px solid #2a2735;border-radius:16px;background:#14131a;padding:32px">
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Rejoignez {safe_workspace}</h1>
        <p style="margin:0 0 16px;color:#c9c6d4;line-height:1.6">
          {safe_inviter_name} ({safe_inviter_email}) vous invite à rejoindre ce workspace
          avec le rôle <strong style="color:#f7f7fb">{safe_role}</strong>.
        </p>
        <p style="margin:0 0 24px;color:#c9c6d4;line-height:1.6">
          Cette invitation expire le {safe_expiration}.
        </p>
        <p style="margin:0 0 28px">
          <a href="{safe_url}" style="display:inline-block;border-radius:10px;background:#7c3aed;color:#fff;padding:13px 20px;text-decoration:none;font-weight:700">
            Rejoindre le workspace
          </a>
        </p>
        <p style="margin:0 0 8px;color:#8f8b9b;font-size:13px;line-height:1.5">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
        </p>
        <p style="margin:0;word-break:break-all;color:#b9a7ff;font-size:13px;line-height:1.5">{safe_url}</p>
      </div>
      <p style="margin:20px 0 0;color:#777381;font-size:12px;line-height:1.5">
        Si vous n’attendiez pas cette invitation, ignorez cet e-mail. Ne transférez pas ce lien.
      </p>
    </div>
  </body>
</html>"""
        text = (
            "TaskMiner\n\n"
            f"{inviter_name} ({inviter_email}) vous invite à rejoindre le workspace "
            f'"{workspace_name}" avec le rôle {role_label}.\n\n'
            f"Cette invitation expire le {expiration}.\n\n"
            f"Rejoindre le workspace : {invitation_url}\n\n"
            "Si vous n’attendiez pas cette invitation, ignorez cet e-mail. "
            "Ne transférez pas ce lien."
        )
        return self.provider.send(
            EmailMessage(
                sender=self.sender,
                recipient=recipient,
                subject=subject,
                html=html,
                text=text,
                idempotency_key=idempotency_key,
            )
        )

    def send_email_verification(
        self,
        *,
        recipient: str,
        token: str,
        expires_at: datetime,
        idempotency_key: str,
    ) -> EmailDeliveryResult:
        verification_url = self._account_action_url("/verify-email", token)
        expiration = self._format_expiration(expires_at)
        return self._send_account_action(
            recipient=recipient,
            subject="Vérifiez votre adresse e-mail TaskMiner",
            heading="Vérifiez votre adresse e-mail",
            introduction=(
                "Confirmez que cette adresse e-mail vous appartient pour sécuriser "
                "votre compte TaskMiner."
            ),
            action_label="Vérifier mon adresse",
            action_url=verification_url,
            expiration=expiration,
            security_note=(
                "Si vous n’avez pas créé de compte TaskMiner, ignorez cet e-mail."
            ),
            idempotency_key=idempotency_key,
        )

    def send_password_reset(
        self,
        *,
        recipient: str,
        token: str,
        expires_at: datetime,
        idempotency_key: str,
    ) -> EmailDeliveryResult:
        reset_url = self._account_action_url("/reset-password", token)
        expiration = self._format_expiration(expires_at)
        return self._send_account_action(
            recipient=recipient,
            subject="Réinitialisez votre mot de passe TaskMiner",
            heading="Réinitialisez votre mot de passe",
            introduction=(
                "Une demande de réinitialisation a été reçue pour votre compte "
                "TaskMiner."
            ),
            action_label="Choisir un nouveau mot de passe",
            action_url=reset_url,
            expiration=expiration,
            security_note=(
                "Si vous n’êtes pas à l’origine de cette demande, ignorez cet "
                "e-mail. Votre mot de passe actuel reste inchangé."
            ),
            idempotency_key=idempotency_key,
        )

    def _send_account_action(
        self,
        *,
        recipient: str,
        subject: str,
        heading: str,
        introduction: str,
        action_label: str,
        action_url: str,
        expiration: str,
        security_note: str,
        idempotency_key: str,
    ) -> EmailDeliveryResult:
        safe_heading = escape(heading)
        safe_introduction = escape(introduction)
        safe_action_label = escape(action_label)
        safe_url = escape(action_url, quote=True)
        safe_expiration = escape(expiration)
        safe_security_note = escape(security_note)
        html = f"""<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#0b0b10;color:#f7f7fb;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:40px 24px">
      <p style="margin:0 0 28px;color:#a78bfa;font-size:18px;font-weight:700">TaskMiner</p>
      <div style="border:1px solid #2a2735;border-radius:16px;background:#14131a;padding:32px">
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">{safe_heading}</h1>
        <p style="margin:0 0 16px;color:#c9c6d4;line-height:1.6">{safe_introduction}</p>
        <p style="margin:0 0 24px;color:#c9c6d4;line-height:1.6">
          Ce lien expire le {safe_expiration} et ne peut être utilisé qu’une fois.
        </p>
        <p style="margin:0 0 28px">
          <a href="{safe_url}" style="display:inline-block;border-radius:10px;background:#7c3aed;color:#fff;padding:13px 20px;text-decoration:none;font-weight:700">
            {safe_action_label}
          </a>
        </p>
        <p style="margin:0 0 8px;color:#8f8b9b;font-size:13px;line-height:1.5">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
        </p>
        <p style="margin:0;word-break:break-all;color:#b9a7ff;font-size:13px;line-height:1.5">{safe_url}</p>
      </div>
      <p style="margin:20px 0 0;color:#777381;font-size:12px;line-height:1.5">
        {safe_security_note}
      </p>
    </div>
  </body>
</html>"""
        text = (
            f"TaskMiner\n\n{heading}\n\n{introduction}\n\n"
            f"Ce lien expire le {expiration} et ne peut être utilisé qu’une fois.\n\n"
            f"{action_label} : {action_url}\n\n{security_note}"
        )
        return self.provider.send(
            EmailMessage(
                sender=self.sender,
                recipient=recipient,
                subject=subject,
                html=html,
                text=text,
                idempotency_key=idempotency_key,
            )
        )

    def _invitation_url(self, token: str) -> str:
        query = urlencode({"token": token})
        return f"{self.frontend_url}/app/invitations?{query}"

    def _account_action_url(self, path: str, token: str) -> str:
        query = urlencode({"token": token})
        return f"{self.frontend_url}{path}?{query}"

    @staticmethod
    def _format_expiration(expires_at: datetime) -> str:
        normalized = expires_at.astimezone(timezone.utc)
        return normalized.strftime("%d/%m/%Y à %H:%M UTC")
