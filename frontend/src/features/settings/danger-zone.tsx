import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, Trash2, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteAccount, useLeaveWorkspace } from "@/features/settings/hooks";
import {
  dangerSchema,
  type DangerFormValues,
} from "@/features/settings/schemas";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import { useDeleteWorkspace } from "@/features/workspaces/hooks";
import { useWorkspacePermissions } from "@/features/workspaces/permissions-hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useAuthStore } from "@/store/auth-store";

type DangerAction = "account" | "leave" | "workspace";

const actionCopy: Record<
  DangerAction,
  { title: string; description: string; button: string }
> = {
  account: {
    title: "Supprimer mon compte",
    description:
      "Votre identité sera anonymisée et votre accès sera immédiatement révoqué.",
    button: "Supprimer définitivement mon accès",
  },
  leave: {
    title: "Quitter le workspace",
    description:
      "Vous perdrez immédiatement l’accès à ce workspace et à ses ressources.",
    button: "Quitter le workspace",
  },
  workspace: {
    title: "Supprimer le workspace",
    description:
      "Le workspace et toutes ses ressources deviendront inaccessibles.",
    button: "Supprimer le workspace",
  },
};

export function DangerZone() {
  const [action, setAction] = useState<DangerAction | null>(null);
  const workspace = useActiveWorkspace();
  const permissions = useWorkspacePermissions(workspace.activeWorkspaceId);
  const deleteAccount = useDeleteAccount();
  const leaveWorkspace = useLeaveWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<DangerFormValues>({
    resolver: zodResolver(dangerSchema),
    defaultValues: { confirmation: "", currentPassword: "" },
  });
  const mutationError =
    action === "account"
      ? deleteAccount.error
      : action === "leave"
        ? leaveWorkspace.error
        : deleteWorkspace.error;
  const mutationPending =
    action === "account"
      ? deleteAccount.isPending
      : action === "leave"
        ? leaveWorkspace.isPending
        : deleteWorkspace.isPending;
  const openAction = (next: DangerAction) => {
    deleteAccount.reset();
    leaveWorkspace.reset();
    deleteWorkspace.reset();
    reset();
    setAction(next);
  };
  const close = () => {
    setAction(null);
    reset();
  };
  const submit = handleSubmit(async (values) => {
    try {
      if (!action) return;
      const activeWorkspaceId = workspace.activeWorkspaceId;
      if (action === "account") {
        await deleteAccount.mutateAsync({
          confirmation: values.confirmation as "DELETE" | "SUPPRIMER",
          current_password: values.currentPassword,
        });
        logout();
        await navigate("/login", { replace: true });
        return;
      }
      if (!activeWorkspaceId) return;
      if (action === "leave") {
        await leaveWorkspace.mutateAsync({
          data: {
            confirmation: values.confirmation as "DELETE" | "SUPPRIMER",
            current_password: values.currentPassword,
          },
          workspaceId: activeWorkspaceId,
        });
      } else {
        await deleteWorkspace.mutateAsync(activeWorkspaceId);
      }
      close();
    } catch {
      // React Query exposes the backend error in the confirmation dialog.
    }
  });
  const isOwner = permissions.data?.role === "owner";

  return (
    <SettingsSectionCard
      description="Ces actions ont des conséquences immédiates. Vérifiez soigneusement le workspace actif."
      destructive
      icon={
        <TriangleAlert aria-hidden="true" className="text-destructive size-5" />
      }
      title="Danger Zone"
    >
      <div className="space-y-1">
        <DangerRow
          action="Quitter"
          description={
            workspace.activeWorkspace
              ? `Retirer votre accès à « ${workspace.activeWorkspace.name} ».`
              : "Sélectionnez d’abord un workspace."
          }
          disabled={!workspace.activeWorkspaceId || isOwner}
          icon={<LogOut aria-hidden="true" className="size-4" />}
          onClick={() => {
            openAction("leave");
          }}
          title="Quitter le workspace actif"
        />
        <Separator />
        <DangerRow
          action="Supprimer"
          description="Révoquer l’accès et rendre les ressources du workspace inaccessibles."
          disabled={!workspace.activeWorkspaceId || !isOwner}
          icon={<Trash2 aria-hidden="true" className="size-4" />}
          onClick={() => {
            openAction("workspace");
          }}
          title="Supprimer le workspace actif"
        />
        <Separator />
        <DangerRow
          action="Supprimer le compte"
          description="Anonymiser votre identité et révoquer toutes vos sessions."
          icon={<Trash2 aria-hidden="true" className="size-4" />}
          onClick={() => {
            openAction("account");
          }}
          title="Supprimer mon compte"
        />
      </div>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          {action ? (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle className="text-destructive">
                  {actionCopy[action].title}
                </DialogTitle>
                <DialogDescription>
                  {actionCopy[action].description}
                </DialogDescription>
              </DialogHeader>
              <div className="my-6 space-y-4">
                <label className="block space-y-2 text-sm font-medium">
                  Saisissez SUPPRIMER ou DELETE pour confirmer
                  <Input autoComplete="off" {...register("confirmation")} />
                  {errors.confirmation ? (
                    <span className="text-destructive block text-xs">
                      {errors.confirmation.message}
                    </span>
                  ) : null}
                </label>
                {action !== "workspace" ? (
                  <label className="block space-y-2 text-sm font-medium">
                    Mot de passe actuel
                    <Input
                      autoComplete="current-password"
                      type="password"
                      {...register("currentPassword")}
                    />
                    {errors.currentPassword ? (
                      <span className="text-destructive block text-xs">
                        {errors.currentPassword.message}
                      </span>
                    ) : null}
                  </label>
                ) : (
                  <input
                    type="hidden"
                    defaultValue="confirmed-client-side"
                    {...register("currentPassword")}
                  />
                )}
                <FormError error={mutationError} />
              </div>
              <DialogFooter>
                <Button onClick={close} type="button" variant="outline">
                  Annuler
                </Button>
                <Button
                  disabled={mutationPending}
                  type="submit"
                  variant="destructive"
                >
                  {mutationPending ? <Spinner label="Traitement" /> : null}
                  {actionCopy[action].button}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </SettingsSectionCard>
  );
}

type DangerRowProps = {
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

function DangerRow({
  action,
  description,
  disabled = false,
  icon,
  onClick,
  title,
}: DangerRowProps) {
  return (
    <div className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button
        disabled={disabled}
        onClick={onClick}
        type="button"
        variant="destructive"
      >
        {icon}
        {action}
      </Button>
    </div>
  );
}
