import { CheckCircle2, FolderKanban, ListChecks, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AIApplyProjectPlanResponse } from "@/types/ai";

type AIApplySuccessProps = {
  onCreateNewPlan: () => void;
  projectName: string;
  result: AIApplyProjectPlanResponse;
};

export function AIApplySuccess({
  onCreateNewPlan,
  projectName,
  result,
}: AIApplySuccessProps) {
  const navigate = useNavigate();
  const taskCount = `${String(result.created_task_count)} tâche${result.created_task_count > 1 ? "s" : ""}`;
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-emerald-600"
          />
          <div>
            <h2 className="font-semibold">Plan appliqué avec succès</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {result.created_project
                ? `Le projet « ${projectName} » a été créé avec ${taskCount}.`
                : `${taskCount} ${result.created_task_count > 1 ? "ont été ajoutées" : "a été ajoutée"} au projet « ${projectName} ».`}
            </p>
            {result.skipped_task_count > 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                {result.skipped_task_count} suggestion
                {result.skipped_task_count > 1 ? "s" : ""} non appliquée
                {result.skipped_task_count > 1 ? "s" : ""}.
              </p>
            ) : null}
            {result.created_assignment_count > 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                {result.created_assignment_count} assignation
                {result.created_assignment_count > 1 ? "s" : ""} appliquée
                {result.created_assignment_count > 1 ? "s" : ""}.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCreateNewPlan} type="button" variant="outline">
            <Sparkles aria-hidden="true" className="size-4" />
            Créer un nouveau plan
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
