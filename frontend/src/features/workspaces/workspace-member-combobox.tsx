import { Search, UserCheck, UserMinus } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { AssignableWorkspaceMember } from "@/types/workspace";
import { getMemberPrimaryLabel } from "@/features/workspaces/workspace-member-utils";

type WorkspaceMemberComboboxProps = {
  currentUserId?: string;
  disabled?: boolean;
  error?: unknown;
  id: string;
  isLoading: boolean;
  label: string;
  members: AssignableWorkspaceMember[];
  onRetry: () => void;
  onValueChange: (userId: string | null) => void;
  selfAssignLabel?: string;
  value: string | null;
};

const getMemberAccessibleLabel = (member: AssignableWorkspaceMember): string =>
  member.full_name?.trim()
    ? `${member.full_name} — ${member.email}`
    : member.email;

export function WorkspaceMemberCombobox({
  currentUserId,
  disabled = false,
  error,
  id,
  isLoading,
  label,
  members,
  onRetry,
  onValueChange,
  selfAssignLabel = "Me sélectionner",
  value,
}: WorkspaceMemberComboboxProps) {
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isListOpen, setIsListOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");
    if (!normalizedSearch) return members;
    return members.filter(
      (member) =>
        member.email.toLocaleLowerCase("fr").includes(normalizedSearch) ||
        member.full_name?.toLocaleLowerCase("fr").includes(normalizedSearch),
    );
  }, [members, search]);
  const selectedMember = members.find((member) => member.user_id === value);
  const currentUserIsAssignable = members.some(
    (member) => member.user_id === currentUserId,
  );
  const activeMember = filteredMembers[activeIndex];

  const selectMember = (member: AssignableWorkspaceMember) => {
    onValueChange(member.user_id);
    setSearch("");
    setIsListOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsListOpen(false);
      return;
    }
    if (filteredMembers.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsListOpen(true);
      setActiveIndex((current) => (current + 1) % filteredMembers.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsListOpen(true);
      setActiveIndex(
        (current) =>
          (current - 1 + filteredMembers.length) % filteredMembers.length,
      );
      return;
    }
    if (event.key === "Enter" && isListOpen && activeMember) {
      event.preventDefault();
      selectMember(activeMember);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            aria-activedescendant={
              isListOpen && activeMember
                ? `${listboxId}-${activeMember.user_id}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={isListOpen}
            autoComplete="off"
            className="pl-9"
            disabled={disabled || isLoading || Boolean(error)}
            id={id}
            onBlur={() => {
              setIsListOpen(false);
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveIndex(0);
              setIsListOpen(true);
            }}
            onFocus={() => {
              setIsListOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Rechercher par nom ou adresse e-mail…"
            role="combobox"
            value={search}
          />
        </div>

        {isLoading ? (
          <div
            className="text-muted-foreground flex items-center gap-2 py-2 text-sm"
            role="status"
          >
            <Spinner className="size-4" />
            Chargement des membres…
          </div>
        ) : null}

        {error ? (
          <div className="space-y-2">
            <FormError error={error} />
            <Button onClick={onRetry} size="sm" type="button" variant="outline">
              Réessayer
            </Button>
          </div>
        ) : null}

        {isListOpen && !isLoading && !error ? (
          <div
            className="bg-popover max-h-56 overflow-y-auto rounded-lg border p-1 shadow-md"
            id={listboxId}
            role="listbox"
          >
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => (
                <button
                  aria-label={getMemberAccessibleLabel(member)}
                  aria-selected={member.user_id === value}
                  className={cn(
                    "hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2",
                    index === activeIndex && "bg-accent",
                  )}
                  id={`${listboxId}-${member.user_id}`}
                  key={member.user_id}
                  onClick={() => {
                    selectMember(member);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseEnter={() => {
                    setActiveIndex(index);
                  }}
                  role="option"
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  >
                    {getMemberPrimaryLabel(member)
                      .slice(0, 1)
                      .toLocaleUpperCase("fr")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {getMemberPrimaryLabel(member)}
                    </span>
                    {member.full_name?.trim() ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {member.email}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                {members.length === 0
                  ? "Aucun membre actif disponible."
                  : "Aucun membre ne correspond à cette recherche."}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {value ? (
        <div
          aria-live="polite"
          className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {selectedMember
                ? getMemberPrimaryLabel(selectedMember)
                : "Membre actuellement indisponible"}
            </p>
            {selectedMember?.full_name?.trim() ? (
              <p className="text-muted-foreground truncate text-xs">
                {selectedMember.email}
              </p>
            ) : null}
          </div>
          <Button
            aria-label="Retirer l’assignation"
            disabled={disabled}
            onClick={() => {
              onValueChange(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <UserMinus aria-hidden="true" className="size-4" />
            Retirer
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          Cette tâche n’est assignée à personne.
        </p>
      )}

      {currentUserId ? (
        <Button
          disabled={
            disabled || isLoading || Boolean(error) || !currentUserIsAssignable
          }
          onClick={() => {
            onValueChange(currentUserId);
            setSearch("");
            setIsListOpen(false);
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <UserCheck aria-hidden="true" className="size-4" />
          {selfAssignLabel}
        </Button>
      ) : null}
    </div>
  );
}
