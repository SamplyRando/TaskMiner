import { X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssignableWorkspaceMember } from "@/types/workspace";

type MentionEditorProps = {
  id: string;
  label: string;
  members: AssignableWorkspaceMember[];
  mentionedUserIds: string[];
  onMentionedUserIdsChange: (ids: string[]) => void;
  onValueChange: (value: string) => void;
  value: string;
};

type Trigger = { index: number; query: string };

function findMentionTrigger(value: string, cursor: number): Trigger | null {
  const prefix = value.slice(0, cursor);
  const index = prefix.lastIndexOf("@");
  if (index < 0 || (index > 0 && !/\s/.test(prefix[index - 1] ?? ""))) {
    return null;
  }
  const query = prefix.slice(index + 1);
  return query.includes("\n") ? null : { index, query };
}

export function CommentMentionEditor({
  id,
  label,
  members,
  mentionedUserIds,
  onMentionedUserIdsChange,
  onValueChange,
  value,
}: MentionEditorProps) {
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useMemo(() => {
    if (!trigger) return [];
    const normalized = trigger.query.trim().toLocaleLowerCase("fr");
    return members
      .filter((member) => !mentionedUserIds.includes(member.user_id))
      .filter((member) =>
        (member.full_name ?? "Membre")
          .toLocaleLowerCase("fr")
          .includes(normalized),
      )
      .slice(0, 8);
  }, [members, mentionedUserIds, trigger]);

  const selectMember = (member: AssignableWorkspaceMember) => {
    if (!trigger) return;
    const displayName = member.full_name?.trim() ?? "Membre";
    const before = value.slice(0, trigger.index);
    const after = value.slice(trigger.index + trigger.query.length + 1);
    onValueChange(`${before}@${displayName} ${after}`);
    onMentionedUserIdsChange([...mentionedUserIds, member.user_id]);
    setTrigger(null);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!trigger || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (current) => (current - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const member = suggestions[activeIndex];
      if (member) selectMember(member);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setTrigger(null);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        aria-controls={trigger ? `${id}-mention-list` : undefined}
        aria-expanded={Boolean(trigger)}
        aria-haspopup="listbox"
        aria-label={label}
        id={id}
        maxLength={2000}
        onChange={(event) => {
          const nextValue = event.target.value;
          onValueChange(nextValue);
          setTrigger(
            findMentionTrigger(nextValue, event.target.selectionStart),
          );
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Écrire un commentaire… Utilisez @ pour mentionner un membre."
        rows={3}
        role="combobox"
        value={value}
      />
      {trigger ? (
        <div
          className="bg-popover max-h-44 overflow-y-auto rounded-md border p-1 shadow-md"
          id={`${id}-mention-list`}
          role="listbox"
        >
          {suggestions.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1.5 text-sm">
              Aucun membre correspondant.
            </p>
          ) : (
            suggestions.map((member, index) => (
              <button
                aria-selected={index === activeIndex}
                className="hover:bg-accent aria-selected:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm"
                key={member.user_id}
                onPointerDown={(event) => {
                  event.preventDefault();
                  selectMember(member);
                }}
                role="option"
                type="button"
              >
                {member.full_name?.trim() ?? "Membre"}
              </button>
            ))
          )}
        </div>
      ) : null}
      {mentionedUserIds.length > 0 ? (
        <ul aria-label="Membres mentionnés" className="flex flex-wrap gap-1.5">
          {mentionedUserIds.map((userId) => {
            const member = members.find((item) => item.user_id === userId);
            const name = member?.full_name?.trim() ?? "Membre";
            return (
              <li
                className="bg-muted flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                key={userId}
              >
                @{name}
                <Button
                  aria-label={`Retirer la mention de ${name}`}
                  className="size-5"
                  onClick={() => {
                    onMentionedUserIdsChange(
                      mentionedUserIds.filter((id) => id !== userId),
                    );
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-3" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
