import { BrainCircuit, Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";

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
      className="border-primary/25 from-primary/10 via-card to-card overflow-hidden bg-linear-to-br"
      role="status"
    >
      <CardContent className="grid min-h-52 items-center gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-8">
        <div className="bg-primary/10 text-primary relative mx-auto flex size-20 items-center justify-center rounded-2xl sm:mx-0">
          <div className="border-primary/20 absolute inset-2 animate-pulse rounded-xl border motion-reduce:animate-none" />
          <BrainCircuit aria-hidden="true" className="size-9" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LoaderCircle
              aria-hidden="true"
              className="text-primary size-4 animate-spin motion-reduce:animate-none"
            />
            <h2 className="font-semibold" id={`ai-${mode}-generation-title`}>
              TaskMiner AI prépare votre brouillon
            </h2>
          </div>
          <p
            aria-live="polite"
            className="text-primary mt-2 text-sm font-medium"
          >
            {modeStages[activeStage]}
          </p>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {modeStages.map((stage, index) => (
              <li
                className={`flex items-center gap-2 text-xs ${
                  index <= activeStage
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
                key={stage}
              >
                {index < activeStage ? (
                  <Check aria-hidden="true" className="text-primary size-3.5" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${
                      index === activeStage ? "bg-primary" : "bg-border"
                    }`}
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
