import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types/workspace";

type WorkspaceSelectorProps = {
  compact?: boolean;
  disabled?: boolean;
  id?: string;
  onValueChange: (workspaceId: string) => void;
  value: string | null;
  workspaces: Workspace[];
};

export function WorkspaceSelector({
  compact = false,
  disabled = false,
  id = "active-workspace",
  onValueChange,
  value,
  workspaces,
}: WorkspaceSelectorProps) {
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === value,
  );
  const initial = activeWorkspace?.name.trim().charAt(0).toUpperCase() ?? "";

  return (
    <div
      className={cn("min-w-0", compact ? "w-full max-w-64" : "w-full sm:w-72")}
    >
      <label
        className={cn(
          "text-label text-muted-foreground",
          compact ? "sr-only" : "mb-1.5 block",
        )}
        htmlFor={id}
      >
        Workspace actif
      </label>
      <div className="relative">
        {compact && initial ? (
          <span
            aria-hidden="true"
            className="bg-brand-subtle text-brand border-brand-border pointer-events-none absolute top-1/2 left-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm border text-xs font-semibold"
          >
            {initial}
          </span>
        ) : null}
        <Select
          className={
            compact
              ? cn(
                  "bg-surface h-9 truncate font-medium",
                  initial ? "pl-9" : undefined,
                )
              : undefined
          }
          disabled={disabled || workspaces.length === 0}
          id={id}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          value={value ?? ""}
        >
          {workspaces.length === 0 ? (
            <option value="">Aucun workspace disponible</option>
          ) : null}
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
