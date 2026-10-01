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
  return (
    <div
      className={cn("min-w-0", compact ? "w-full max-w-64" : "w-full sm:w-72")}
    >
      <label
        className={cn(
          "text-muted-foreground text-sm font-medium",
          compact ? "sr-only" : "mb-1.5 block",
        )}
        htmlFor={id}
      >
        Workspace actif
      </label>
      <Select
        className={compact ? "bg-muted/30 h-9 truncate" : undefined}
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
  );
}
