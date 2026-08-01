import { Select } from "@/components/ui/select";
import type { Workspace } from "@/types/workspace";

type WorkspaceSelectorProps = {
  disabled?: boolean;
  onValueChange: (workspaceId: string) => void;
  value: string | null;
  workspaces: Workspace[];
};

export function WorkspaceSelector({
  disabled = false,
  onValueChange,
  value,
  workspaces,
}: WorkspaceSelectorProps) {
  return (
    <div className="min-w-0 sm:w-72">
      <label
        className="text-muted-foreground mb-1.5 block text-sm font-medium"
        htmlFor="active-workspace"
      >
        Workspace actif
      </label>
      <Select
        disabled={disabled || workspaces.length === 0}
        id="active-workspace"
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
