import { cn } from "@/lib/utils";

type JsonValueViewProps = {
  className?: string;
  value: unknown;
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">Non renseigné</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Oui" : "Non"}</span>;
  }
  if (typeof value === "string") {
    return <span>{value || "Chaîne vide"}</span>;
  }
  if (typeof value === "number") {
    return (
      <span className="tabular-nums">{value.toLocaleString("fr-FR")}</span>
    );
  }
  return <span className="text-muted-foreground">Valeur non affichable</span>;
}

export function JsonValueView({ className, value }: JsonValueViewProps) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Liste vide</span>;
    }
    const items = value as unknown[];
    return (
      <ul className={cn("list-disc space-y-1 pl-5", className)}>
        {items.map((item, index) => (
          <li key={index}>
            <JsonValueView value={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (isJsonObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <span className="text-muted-foreground italic">Aucune valeur</span>
      );
    }
    return (
      <dl className={cn("space-y-2", className)}>
        {entries.map(([key, item]) => (
          <div
            className="grid gap-1 rounded-md border px-3 py-2 sm:grid-cols-[minmax(8rem,0.4fr)_1fr]"
            key={key}
          >
            <dt className="text-muted-foreground text-sm font-medium break-words">
              {key.replaceAll("_", " ")}
            </dt>
            <dd className="min-w-0 text-sm break-words">
              <JsonValueView value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <PrimitiveValue value={value} />;
}
