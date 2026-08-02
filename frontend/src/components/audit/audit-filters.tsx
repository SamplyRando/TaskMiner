import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  activityEventLabels,
  activityResourceLabels,
} from "@/lib/activity-presentation";
import type { AuditFiltersValue } from "@/features/audit/filters";
import type { ActivityEvent, ActivityResource } from "@/types/activity";
import type { AuditActor, AuditPeriod } from "@/types/audit";

type AuditFiltersProps = {
  actors: AuditActor[];
  onChange: (value: AuditFiltersValue) => void;
  value: AuditFiltersValue;
};

const eventOptions = Object.entries(activityEventLabels) as [
  ActivityEvent,
  string,
][];
const resourceOptions = Object.entries(activityResourceLabels) as [
  ActivityResource,
  string,
][];

export function AuditFilters({ actors, onChange, value }: AuditFiltersProps) {
  const hasFilters = Object.values(value).some(Boolean);

  return (
    <section aria-label="Filtres du journal d’audit" className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Rechercher dans le journal d’audit"
          className="pl-9"
          onChange={(event) => {
            onChange({ ...value, search: event.target.value });
          }}
          placeholder="Rechercher un utilisateur, message, état, projet, tâche ou identifiant…"
          type="search"
          value={value.search}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <FilterField label="Utilisateur" name="audit-actor-filter">
          <Select
            id="audit-actor-filter"
            onChange={(event) => {
              onChange({ ...value, actorId: event.target.value });
            }}
            value={value.actorId}
          >
            <option value="">Tous les utilisateurs</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.full_name || actor.email}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Type" name="audit-event-filter">
          <Select
            id="audit-event-filter"
            onChange={(event) => {
              onChange({
                ...value,
                eventType: event.target.value as ActivityEvent | "",
              });
            }}
            value={value.eventType}
          >
            <option value="">Tous les types</option>
            {eventOptions.map(([event, label]) => (
              <option key={event} value={event}>
                {label}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Entité" name="audit-resource-filter">
          <Select
            id="audit-resource-filter"
            onChange={(event) => {
              onChange({
                ...value,
                resourceType: event.target.value as ActivityResource | "",
              });
            }}
            value={value.resourceType}
          >
            <option value="">Toutes les entités</option>
            {resourceOptions.map(([resource, label]) => (
              <option key={resource} value={resource}>
                {label}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Période" name="audit-period-filter">
          <Select
            id="audit-period-filter"
            onChange={(event) => {
              onChange({
                ...value,
                period: event.target.value as AuditPeriod | "",
              });
            }}
            value={value.period}
          >
            <option value="">Toute la période</option>
            <option value="today">Aujourd’hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </Select>
        </FilterField>
        <FilterField label="Résultat" name="audit-result-filter">
          <Select
            id="audit-result-filter"
            onChange={(event) => {
              onChange({
                ...value,
                success: event.target.value as "" | "false" | "true",
              });
            }}
            value={value.success}
          >
            <option value="">Tous les résultats</option>
            <option value="true">Succès</option>
            <option value="false">Échec</option>
          </Select>
        </FilterField>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={!hasFilters}
            onClick={() => {
              onChange({
                actorId: "",
                eventType: "",
                period: "",
                resourceType: "",
                search: "",
                success: "",
              });
            }}
            type="button"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Effacer
          </Button>
        </div>
      </div>
    </section>
  );
}

function FilterField({
  children,
  label,
  name,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
}) {
  return (
    <div>
      <label
        className="text-muted-foreground mb-1.5 block text-sm font-medium"
        htmlFor={name}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
