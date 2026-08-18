import { CheckCircle2, FolderKanban, ListChecks, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AIApplyProjectChangePlanResponse } from "@/types/ai";

type AIChangeApplySuccessProps = {
  onNewInstruction: () => void;
  projectName: string;
  result: AIApplyProjectChangePlanResponse;
};

export function AIChangeApplySuccess({
  onNewInstruction,
  projectName,
  result,
}: AIChangeApplySuccessProps) {
  const navigate = useNavigate();
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-emerald-600"
          />
          <div>
            <h2 className="font-semibold">
              Modifications appliquées avec succès
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {String(result.modified_task_count)} tâche
              {result.modified_task_count > 1 ? "s" : ""} modifiée
              {result.modified_task_count > 1 ? "s" : ""} dans « {projectName} »
              · {String(result.changed_field_count)} champ
              {result.changed_field_count > 1 ? "s" : ""} mis à jour.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onNewInstruction} type="button" variant="outline">
            <Sparkles aria-hidden="true" className="size-4" />
            Nouvelle instruction
          </Button>
          <Button
            onClick={() => navigate("/app/projects")}
            type="button"
            variant="outline"
          >
            <FolderKanban aria-hidden="true" className="size-4" />
            Voir les projets
          </Button>
          <Button onClick={() => navigate("/app/tasks")} type="button">
            <ListChecks aria-hidden="true" className="size-4" />
            Voir les tâches
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
