import { Check } from "lucide-react";

const generatedTasks = [
  { priority: "Urgent", title: "Design homepage" },
  { priority: "High", title: "Create API" },
  { priority: "High", title: "Invite designers" },
  { priority: "Medium", title: "Review roadmap" },
  { priority: "Medium", title: "Launch beta" },
] as const;

type AiTaskCardsProps = {
  prioritizedTaskCount: number;
  visibleTaskCount: number;
};

export function AiTaskCards({
  prioritizedTaskCount,
  visibleTaskCount,
}: AiTaskCardsProps) {
  return (
    <section className="marketing-ai-tasks">
      <header>
        <span>Generated tasks</span>
        <strong>5</strong>
      </header>
      <ul>
        {generatedTasks.slice(0, visibleTaskCount).map((task, index) => (
          <li key={task.title}>
            <span className="marketing-ai-task__check">
              <Check />
            </span>
            <strong>{task.title}</strong>
            <span className="marketing-ai-task__priority-wrap">
              {index < prioritizedTaskCount ? (
                <span
                  className={`marketing-ai-task__priority marketing-ai-task__priority--${task.priority.toLowerCase()}`}
                >
                  {task.priority}
                </span>
              ) : (
                <span className="marketing-ai-task__analyzing">
                  Analyzing...
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
