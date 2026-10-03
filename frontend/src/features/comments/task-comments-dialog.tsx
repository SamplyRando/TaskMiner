import { MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";

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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateComment,
  useDeleteComment,
  useTaskComments,
  useUpdateComment,
} from "@/features/comments/hooks";
import { formatDateTime } from "@/lib/format";
import type { Task } from "@/types/task";

const getCommentErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return "Une erreur inattendue est survenue avec le commentaire.";
  }
  if (error.status === 403) {
    return "Vous n’avez pas la permission d’effectuer cette action.";
  }
  if (error.status === 404) {
    return "La tâche ou le commentaire est introuvable.";
  }
  if (error.status !== undefined && error.status >= 500) {
    return "Le serveur n’a pas pu traiter le commentaire. Réessayez.";
  }
  return error.message;
};

type TaskCommentsDialogProps = {
  canManage: boolean;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  task: Task | null;
};

export function TaskCommentsDialog({
  canManage,
  currentUserId,
  onOpenChange,
  open,
  task,
}: TaskCommentsDialogProps) {
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const comments = useTaskComments(task?.id, open);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const actionError =
    createComment.error ?? updateComment.error ?? deleteComment.error;

  const resetActions = () => {
    setContent("");
    setEditingId(null);
    setEditContent("");
    setDeletingId(null);
    setNotice(null);
    createComment.reset();
    updateComment.reset();
    deleteComment.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetActions();
    onOpenChange(nextOpen);
  };

  const handleCreate = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextContent = content.trim();
    if (!task || !nextContent || createComment.isPending) return;
    setNotice(null);
    createComment.reset();
    try {
      await createComment.mutateAsync({
        data: { content: nextContent },
        taskId: task.id,
      });
      setContent("");
      setNotice("Commentaire ajouté.");
    } catch {
      // React Query exposes the normalized error below the form.
    }
  };

  const handleUpdate = async (commentId: string) => {
    const nextContent = editContent.trim();
    if (!task || !nextContent || updateComment.isPending) return;
    setNotice(null);
    updateComment.reset();
    try {
      await updateComment.mutateAsync({
        commentId,
        data: { content: nextContent },
        taskId: task.id,
      });
      setEditingId(null);
      setEditContent("");
      setNotice("Commentaire modifié.");
    } catch {
      // React Query exposes the normalized error below the list.
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!task || deleteComment.isPending) return;
    setNotice(null);
    deleteComment.reset();
    try {
      await deleteComment.mutateAsync({ commentId, taskId: task.id });
      setDeletingId(null);
      setNotice("Commentaire supprimé.");
    } catch {
      // React Query exposes the normalized error below the list.
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText aria-hidden="true" className="size-5" />
            Commentaires
          </DialogTitle>
          <DialogDescription>
            {task
              ? `Échanges associés à la tâche « ${task.title} ».`
              : "Échanges associés à cette tâche."}
          </DialogDescription>
        </DialogHeader>

        {canManage ? (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              void handleCreate(event);
            }}
          >
            <label
              className="text-sm font-medium"
              htmlFor="task-comment-content"
            >
              Ajouter un commentaire
            </label>
            <Textarea
              id="task-comment-content"
              maxLength={2000}
              onChange={(event) => {
                setContent(event.target.value);
              }}
              placeholder="Écrire un commentaire…"
              rows={3}
              value={content}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                {content.length}/2000
              </span>
              <Button
                disabled={!content.trim() || createComment.isPending}
                type="submit"
              >
                {createComment.isPending ? <Spinner /> : null}
                Ajouter
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-muted-foreground rounded-lg border px-3 py-2 text-sm">
            Vous pouvez consulter les commentaires en lecture seule.
          </p>
        )}

        <section aria-label="Commentaires de la tâche" className="space-y-3">
          {comments.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner label="Chargement des commentaires" /> Chargement…
            </p>
          ) : comments.isError ? (
            <div className="space-y-3">
              <FormError
                error={comments.error}
                message={getCommentErrorMessage(comments.error)}
              />
              <Button
                onClick={() => void comments.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : comments.data.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
              Aucun commentaire pour cette tâche.
            </p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
              {comments.data.map((comment) => {
                const isAuthor =
                  canManage && comment.author_id === currentUserId;
                const isEditing = editingId === comment.id;
                const isDeleting = deletingId === comment.id;
                return (
                  <li className="space-y-2 p-3" key={comment.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {comment.author_name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(comment.created_at)}
                        </p>
                      </div>
                      {isAuthor && !isEditing && !isDeleting ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            aria-label="Modifier le commentaire"
                            onClick={() => {
                              setDeletingId(null);
                              setEditingId(comment.id);
                              setEditContent(comment.content);
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </Button>
                          <Button
                            aria-label="Supprimer le commentaire"
                            onClick={() => {
                              setEditingId(null);
                              setDeletingId(comment.id);
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2
                              aria-hidden="true"
                              className="text-destructive size-4"
                            />
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          aria-label="Contenu du commentaire"
                          autoFocus
                          maxLength={2000}
                          onChange={(event) => {
                            setEditContent(event.target.value);
                          }}
                          rows={3}
                          value={editContent}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={updateComment.isPending}
                            onClick={() => {
                              setEditingId(null);
                              setEditContent("");
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Annuler
                          </Button>
                          <Button
                            disabled={
                              !editContent.trim() || updateComment.isPending
                            }
                            onClick={() => void handleUpdate(comment.id)}
                            size="sm"
                            type="button"
                          >
                            {updateComment.isPending ? <Spinner /> : null}
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    )}

                    {isDeleting ? (
                      <div className="bg-destructive/5 space-y-2 rounded-md p-2">
                        <p className="text-sm">Supprimer ce commentaire ?</p>
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={deleteComment.isPending}
                            onClick={() => {
                              setDeletingId(null);
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Annuler
                          </Button>
                          <Button
                            disabled={deleteComment.isPending}
                            onClick={() => void handleDelete(comment.id)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            {deleteComment.isPending ? <Spinner /> : null}
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {actionError ? (
          <FormError
            error={actionError}
            message={getCommentErrorMessage(actionError)}
          />
        ) : null}
        {notice ? (
          <p className="text-muted-foreground text-sm" role="status">
            {notice}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
