import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Facet } from "@/components/ui/facet";

type AIGenerationStatusProps = {
  mode: "change" | "plan";
};

const stages = {
  plan: [
    "Analyse du brief",
    "Structuration du projet",
    "Organisation des dépendances",
    "Préparation du plan",
  ],
  change: [
    "Lecture du projet",
    "Analyse de l’instruction",
    "Comparaison des tâches",
    "Préparation des modifications",
  ],
} as const;

export function AIGenerationStatus({ mode }: AIGenerationStatusProps) {
  const [activeStage, setActiveStage] = useState(0);
  const modeStages = stages[mode];

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setActiveStage((current) => (current + 1) % modeStages.length);
    }, 1_800);
    return () => {
      window.clearInterval(interval);
    };
  }, [modeStages.length]);

  return (
    <Card
      aria-busy="true"
      aria-labelledby={`ai-${mode}-generation-title`}
      className="border-brand-border overflow-hidden"
      role="status"
    >
      <CardContent className="min-h-52 p-6 sm:p-7">
        <div className="max-w-3xl min-w-0">
          <div className="flex items-center gap-2">
            <LoaderCircle
              aria-hidden="true"
              className="text-brand size-4 animate-spin motion-reduce:animate-none"
            />
            <h2 className="font-semibold" id={`ai-${mode}-generation-title`}>
              TaskMiner AI prépare votre brouillon
            </h2>
          </div>
          <p aria-live="polite" className="text-brand mt-2 text-sm font-medium">
            {modeStages[activeStage]}
          </p>
          <ol className="bg-border rounded-card mt-5 grid gap-px overflow-hidden border sm:grid-cols-2">
            {modeStages.map((stage, index) => (
              <li
                className={`flex items-center gap-2.5 px-3 py-2.5 text-xs ${
                  index === activeStage
                    ? "bg-brand-subtle text-foreground font-medium"
                    : index < activeStage
                      ? "bg-card text-foreground"
                      : "bg-card text-muted-foreground"
                }`}
                key={stage}
              >
                {index < activeStage ? (
                  <Check aria-hidden="true" className="text-brand size-3.5" />
                ) : index === activeStage ? (
                  <Facet className="size-3.5" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-border mx-1 size-1.5 rounded-full"
                  />
                )}
                {stage}
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-5 text-xs">
            Le temps de réponse dépend de la complexité du brief. Aucune donnée
            n’est enregistrée pendant cette étape.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
