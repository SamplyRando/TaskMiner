import { Check, Pencil, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  getTaskStatusLabelFromTask,
  taskPriorityLabels,
} from "@/features/tasks/task-presentation";
import {
  DEFAULT_PROJECT_STATUSES,
  type ProjectTaskStatus,
} from "@/types/project";
import type { Task, TaskPriority, TaskStatus, TaskUpdate } from "@/types/task";

type InlineUpdate = (task: Task, data: TaskUpdate) => Promise<void>;

const getInlineErrorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : "La modification n’a pas pu être enregistrée.";

type InlineTitleProps = {
  canManage: boolean;
  onUpdate: InlineUpdate;
  task: Task;
};

export function InlineTaskTitle({
  canManage,
  onUpdate,
  task,
}: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    setValue(task.title);
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    const title = value.trim();
    if (!title) {
      setError("Le titre est obligatoire.");
      return;
    }
    if (title === task.title) {
      cancel();
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      await onUpdate(task, { title });
      setEditing(false);
    } catch (caught) {
      setError(getInlineErrorMessage(caught));
    } finally {
      setIsPending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  return (
    <div className="max-w-xs space-y-1">
      {canManage && editing ? (
        <div className="flex items-center gap-1">
          <Input
            aria-label="Titre de la tâche"
            autoFocus
            disabled={isPending}
            maxLength={255}
            onChange={(event) => {
              setValue(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            value={value}
          />
          <Button
            aria-label="Enregistrer le titre"
            disabled={isPending || !value.trim()}
            onClick={() => void save()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Check aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Annuler la modification du titre"
            disabled={isPending}
            onClick={cancel}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : canManage ? (
        <button
          aria-label={`Modifier le titre de ${task.title}`}
          className="group/title flex max-w-full items-center gap-1 text-left font-medium"
          onClick={() => {
            setError(null);
            setValue(task.title);
            setEditing(true);
          }}
          title="Modifier le titre"
          type="button"
        >
          <span className="truncate">{task.title}</span>
          <Pencil
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0 opacity-60 group-hover/title:opacity-100"
          />
        </button>
      ) : (
        <p className="font-medium">{task.title}</p>
      )}
      {task.description ? (
        <p className="text-muted-foreground line-clamp-1 text-sm">
          {task.description}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InlineSelectProps = {
  canManage: boolean;
  onUpdate: InlineUpdate;
  task: Task;
};

type InlineTaskStatusProps = InlineSelectProps & {
  statuses?: ProjectTaskStatus[];
};

export function InlineTaskStatus({
  canManage,
  onUpdate,
  statuses = DEFAULT_PROJECT_STATUSES,
  task,
}: InlineTaskStatusProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <Badge variant={task.status_is_completed ? "default" : "secondary"}>
        {getTaskStatusLabelFromTask(task)}
      </Badge>
    );
  }

  const update = async (status: TaskStatus) => {
    if (status === task.status || isPending) return;
    setError(null);
    setIsPending(true);
    try {
      await onUpdate(task, { status });
    } catch (caught) {
      setError(getInlineErrorMessage(caught));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-w-32 space-y-1">
      <Select
        aria-label={`Statut de ${task.title}`}
        className="h-9"
        disabled={isPending}
        onChange={(event) => void update(event.target.value)}
        value={task.status}
      >
        {statuses.map((status) => (
          <option key={status.key} value={status.key}>
            {status.label}
          </option>
        ))}
      </Select>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InlineTaskPriority({
  canManage,
  onUpdate,
  task,
}: InlineSelectProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <Badge variant={task.priority === "urgent" ? "destructive" : "outline"}>
        {taskPriorityLabels[task.priority]}
      </Badge>
    );
  }

  const update = async (priority: TaskPriority) => {
    if (priority === task.priority || isPending) return;
    setError(null);
    setIsPending(true);
    try {
      await onUpdate(task, { priority });
    } catch (caught) {
      setError(getInlineErrorMessage(caught));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-w-28 space-y-1">
      <Select
        aria-label={`Priorité de ${task.title}`}
        className="h-9"
        disabled={isPending}
        onChange={(event) => void update(event.target.value as TaskPriority)}
        value={task.priority}
      >
        <option value="low">Basse</option>
        <option value="medium">Moyenne</option>
        <option value="high">Haute</option>
        <option value="urgent">Urgente</option>
      </Select>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
