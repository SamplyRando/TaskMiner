import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { activityEventLabels } from "@/lib/activity-presentation";
import type {
  ActivityActor,
  ActivityEvent,
  ActivityPeriod,
} from "@/types/activity";

type ActivityFiltersValue = {
  actorId: string;
  eventType: ActivityEvent | "";
  period: ActivityPeriod | "";
  search: string;
};

type ActivityFiltersProps = {
  actors: ActivityActor[];
  onChange: (value: ActivityFiltersValue) => void;
  value: ActivityFiltersValue;
};

const eventOptions = Object.entries(activityEventLabels) as [
  ActivityEvent,
  string,
][];

export function ActivityFilters({
  actors,
  onChange,
  value,
}: ActivityFiltersProps) {
  const hasFilters = Boolean(
    value.actorId || value.eventType || value.period || value.search,
  );

  return (
    <section aria-label="Filtres du flux d’activité" className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Rechercher dans les activités"
          className="pl-9"
          onChange={(event) => {
            onChange({ ...value, search: event.target.value });
          }}
          placeholder="Rechercher un acteur, message, projet, tâche ou workspace…"
          type="search"
          value={value.search}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            className="text-muted-foreground mb-1.5 block text-sm font-medium"
            htmlFor="activity-actor-filter"
          >
            Utilisateur
          </label>
          <Select
            id="activity-actor-filter"
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
        </div>
        <div>
          <label
            className="text-muted-foreground mb-1.5 block text-sm font-medium"
            htmlFor="activity-event-filter"
          >
            Type d’événement
          </label>
          <Select
            id="activity-event-filter"
            onChange={(event) => {
              onChange({
                ...value,
                eventType: event.target.value as ActivityEvent | "",
              });
            }}
            value={value.eventType}
          >
            <option value="">Tous les événements</option>
            {eventOptions.map(([event, label]) => (
              <option key={event} value={event}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label
            className="text-muted-foreground mb-1.5 block text-sm font-medium"
            htmlFor="activity-period-filter"
          >
            Période
          </label>
          <Select
            id="activity-period-filter"
            onChange={(event) => {
              onChange({
                ...value,
                period: event.target.value as ActivityPeriod | "",
              });
            }}
            value={value.period}
          >
            <option value="">Toute la période</option>
            <option value="today">Aujourd’hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={!hasFilters}
            onClick={() => {
              onChange({ actorId: "", eventType: "", period: "", search: "" });
            }}
            type="button"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Effacer les filtres
          </Button>
        </div>
      </div>
    </section>
  );
}

export type { ActivityFiltersValue };
