import { ArrowDown, ArrowUp, Check, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useAddProjectStatus,
  useDeleteProjectStatus,
  useReorderProjectStatuses,
  useUpdateProjectStatus,
} from "@/features/projects/hooks";
import { getProjectStatuses, type Project } from "@/types/project";

type ProjectWorkflowDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: Project | null;
};

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 409) {
    return "Ce statut est utilisé ou nécessaire au workflow. Choisissez un statut de remplacement avant de le supprimer.";
  }
  return "Le workflow n’a pas pu être mis à jour.";
};

export function ProjectWorkflowDialog({
  onOpenChange,
  open,
  project,
}: ProjectWorkflowDialogProps) {
  const [newLabel, setNewLabel] = useState("");
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      getProjectStatuses(project ?? undefined).map((status) => [
        status.key,
        status.label,
      ]),
    ),
  );
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const addStatus = useAddProjectStatus();
  const updateStatus = useUpdateProjectStatus();
  const reorder = useReorderProjectStatuses();
  const deleteStatus = useDeleteProjectStatus();
  const statuses = getProjectStatuses(project ?? undefined);
  const error =
    addStatus.error ??
    updateStatus.error ??
    reorder.error ??
    deleteStatus.error;
  const pending =
    addStatus.isPending ||
    updateStatus.isPending ||
    reorder.isPending ||
    deleteStatus.isPending;

  if (!project) return null;

  const move = (index: number, offset: number) => {
    const next = [...statuses];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    const currentStatus = next[index];
    const targetStatus = next[target];
    if (!currentStatus || !targetStatus) return;
    next[index] = targetStatus;
    next[target] = currentStatus;
    reorder.mutate({
      projectId: project.id,
      keys: next.map((status) => status.key),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workflow de {project.name}</DialogTitle>
          <DialogDescription>
            Organisez les statuts du projet. Un seul statut représente le
            travail terminé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {statuses.map((status, index) => (
            <div className="rounded-xl border p-3" key={status.key}>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label={`Libellé du statut ${status.label}`}
                  className="min-w-40 flex-1"
                  disabled={pending}
                  onChange={(event) => {
                    setLabels((current) => ({
                      ...current,
                      [status.key]: event.target.value,
                    }));
                  }}
                  value={labels[status.key] ?? status.label}
                />
                <Button
                  aria-label={`Enregistrer ${status.label}`}
                  disabled={pending || !(labels[status.key] ?? "").trim()}
                  onClick={() => {
                    updateStatus.mutate({
                      projectId: project.id,
                      key: status.key,
                      data: {
                        label: (labels[status.key] ?? status.label).trim(),
                      },
                    });
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Save aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label={`Monter ${status.label}`}
                  disabled={pending || index === 0}
                  onClick={() => {
                    move(index, -1);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label={`Descendre ${status.label}`}
                  disabled={pending || index === statuses.length - 1}
                  onClick={() => {
                    move(index, 1);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-pressed={status.is_completed}
                  disabled={pending || status.is_completed}
                  onClick={() => {
                    updateStatus.mutate({
                      projectId: project.id,
                      key: status.key,
                      data: { is_completed: true },
                    });
                  }}
                  type="button"
                  variant={status.is_completed ? "secondary" : "outline"}
                >
                  <Check aria-hidden="true" className="size-4" />
                  {status.is_completed ? "Terminé" : "Marquer terminé"}
                </Button>
              </div>
              {!status.is_completed && statuses.length > 2 ? (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                  <Select
                    aria-label={`Statut de remplacement pour ${status.label}`}
                    className="w-auto min-w-44"
                    disabled={pending}
                    onChange={(event) => {
                      setReplacements((current) => ({
                        ...current,
                        [status.key]: event.target.value,
                      }));
                    }}
                    value={replacements[status.key] ?? ""}
                  >
                    <option value="">Sans réassignation</option>
                    {statuses
                      .filter((candidate) => candidate.key !== status.key)
                      .map((candidate) => (
                        <option key={candidate.key} value={candidate.key}>
                          Réassigner vers {candidate.label}
                        </option>
                      ))}
                  </Select>
                  <Button
                    aria-label={`Supprimer ${status.label}`}
                    disabled={pending}
                    onClick={() => {
                      deleteStatus.mutate({
                        projectId: project.id,
                        key: status.key,
                        ...(replacements[status.key]
                          ? { replacementStatus: replacements[status.key] }
                          : {}),
                      });
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
          ))}
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Input
            aria-label="Nouveau statut"
            disabled={pending || statuses.length >= 10}
            maxLength={100}
            onChange={(event) => {
              setNewLabel(event.target.value);
            }}
            placeholder="Nouveau statut"
            value={newLabel}
          />
          <Button
            disabled={pending || !newLabel.trim() || statuses.length >= 10}
            onClick={() => {
              addStatus.mutate(
                {
                  projectId: project.id,
                  label: newLabel.trim(),
                },
                {
                  onSuccess: () => {
                    setNewLabel("");
                  },
                },
              );
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Ajouter
          </Button>
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {errorMessage(error)}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
