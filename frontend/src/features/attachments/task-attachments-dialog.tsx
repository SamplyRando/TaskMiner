import { Download, FileText, Paperclip, Trash2 } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { ApiError } from "@/api/client";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  useDeleteAttachment,
  useDownloadAttachment,
  useTaskAttachments,
  useUploadAttachment,
} from "@/features/attachments/hooks";
import type { Attachment } from "@/types/attachment";
import type { Task } from "@/types/task";

const acceptedExtensions = ".pdf,.png,.jpg,.jpeg,.txt,.csv,.zip";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getAttachmentErrorCode = (error: ApiError): string | undefined => {
  if (!isRecord(error.details) || !isRecord(error.details.detail)) {
    return undefined;
  }
  return typeof error.details.detail.code === "string"
    ? error.details.detail.code
    : undefined;
};

const getAttachmentErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return "Une erreur inattendue est survenue avec la pièce jointe.";
  }
  if (
    error.status === 409 &&
    getAttachmentErrorCode(error) === "attachment_storage_quota_exceeded"
  ) {
    return "Le quota de stockage des pièces jointes du workspace est dépassé.";
  }
  if (error.status === 413) {
    return "Ce fichier dépasse la taille maximale autorisée de 10 Mo.";
  }
  if (error.status === 415) {
    return "Ce type de fichier n’est pas autorisé.";
  }
  if (error.status === 429) {
    return "Trop de fichiers ont été envoyés. Réessayez dans quelques instants.";
  }
  if (error.status === 403) {
    return "Vous n’avez pas la permission d’effectuer cette action.";
  }
  if (error.status === 404) {
    return "La tâche ou la pièce jointe est introuvable.";
  }
  if (error.status !== undefined && error.status >= 500) {
    return "Le serveur n’a pas pu traiter la pièce jointe. Réessayez.";
  }
  return error.message;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${String(bytes)} o`;
  }
  const units = ["Ko", "Mo", "Go"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value)} ${units[unitIndex] ?? "Ko"}`;
};

type TaskAttachmentsDialogProps = {
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  task: Task | null;
};

export function TaskAttachmentsDialog({
  canManage,
  onOpenChange,
  open,
  task,
}: TaskAttachmentsDialogProps) {
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<Attachment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const attachments = useTaskAttachments(task?.id, open);
  const upload = useUploadAttachment();
  const download = useDownloadAttachment();
  const remove = useDeleteAttachment();
  const actionError = upload.error ?? download.error ?? remove.error;

  const resetActions = () => {
    setAttachmentToDelete(null);
    setNotice(null);
    upload.reset();
    download.reset();
    remove.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetActions();
    }
    onOpenChange(nextOpen);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !task || upload.isPending) {
      return;
    }
    setNotice(null);
    upload.reset();
    try {
      await upload.mutateAsync({ file, taskId: task.id });
      setNotice(`« ${file.name} » a été ajouté.`);
    } catch {
      // React Query exposes the normalized error below the file field.
    } finally {
      event.target.value = "";
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    setNotice(null);
    download.reset();
    try {
      const blob = await download.mutateAsync(attachment.id);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      // React Query exposes the normalized error below the attachment list.
    }
  };

  const handleDelete = async () => {
    if (!task || !attachmentToDelete || remove.isPending) {
      return;
    }
    setNotice(null);
    remove.reset();
    const filename = attachmentToDelete.filename;
    try {
      await remove.mutateAsync({
        attachmentId: attachmentToDelete.id,
        taskId: task.id,
      });
      setAttachmentToDelete(null);
      setNotice(`« ${filename} » a été supprimé.`);
    } catch {
      // React Query exposes the normalized error below the attachment list.
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip aria-hidden="true" className="size-5" />
            Pièces jointes
          </DialogTitle>
          <DialogDescription>
            {task
              ? `Fichiers associés à la tâche « ${task.title} ».`
              : "Fichiers associés à cette tâche."}
          </DialogDescription>
        </DialogHeader>

        {canManage ? (
          <div className="space-y-2 rounded-lg border p-3">
            <label className="text-sm font-medium" htmlFor="task-attachment">
              Ajouter un fichier
            </label>
            <Input
              accept={acceptedExtensions}
              disabled={upload.isPending}
              id="task-attachment"
              onChange={(event) => void handleUpload(event)}
              type="file"
            />
            <p className="text-muted-foreground text-xs">
              PDF, PNG, JPG, TXT, CSV ou ZIP · 10 Mo maximum.
            </p>
            {upload.isPending ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner label="Envoi du fichier" /> Envoi en cours…
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground rounded-lg border px-3 py-2 text-sm">
            Vous pouvez consulter et télécharger les fichiers en lecture seule.
          </p>
        )}

        <section aria-label="Fichiers de la tâche" className="space-y-3">
          {attachments.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner label="Chargement des pièces jointes" /> Chargement des
              fichiers…
            </p>
          ) : attachments.isError ? (
            <div className="space-y-3">
              <FormError
                error={attachments.error}
                message={getAttachmentErrorMessage(attachments.error)}
              />
              <Button
                onClick={() => void attachments.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : attachments.data.length ? (
            <ul className="divide-y rounded-lg border">
              {attachments.data.map((attachment) => {
                const isDeleting = attachmentToDelete?.id === attachment.id;
                const isDownloading =
                  download.isPending && download.variables === attachment.id;
                return (
                  <li className="space-y-3 p-3" key={attachment.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <FileText
                          aria-hidden="true"
                          className="text-muted-foreground size-5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {attachment.filename}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatFileSize(attachment.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`Télécharger ${attachment.filename}`}
                          disabled={download.isPending}
                          isLoading={isDownloading}
                          onClick={() => void handleDownload(attachment)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Download aria-hidden="true" className="size-4" />
                          Télécharger
                        </Button>
                        {canManage ? (
                          <Button
                            aria-label={`Supprimer ${attachment.filename}`}
                            disabled={remove.isPending}
                            onClick={() => {
                              remove.reset();
                              setAttachmentToDelete(attachment);
                            }}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                            Supprimer
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {isDeleting ? (
                      <div
                        aria-label={`Confirmation de suppression de ${attachment.filename}`}
                        className="bg-destructive/5 flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                        role="group"
                      >
                        <p className="text-sm">
                          Supprimer définitivement « {attachment.filename} » ?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            disabled={remove.isPending}
                            onClick={() => {
                              remove.reset();
                              setAttachmentToDelete(null);
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Annuler
                          </Button>
                          <Button
                            aria-label={`Confirmer la suppression de ${attachment.filename}`}
                            isLoading={remove.isPending}
                            onClick={() => void handleDelete()}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
              Aucun fichier joint à cette tâche.
            </p>
          )}
        </section>

        {actionError ? (
          <FormError
            error={actionError}
            message={getAttachmentErrorMessage(actionError)}
          />
        ) : null}
        {notice ? (
          <p
            aria-live="polite"
            className="text-sm text-emerald-600"
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
