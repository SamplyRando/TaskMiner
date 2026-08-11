import { Check } from "lucide-react";

const generatedTasks = [
  { priority: "Urgent", title: "Design homepage" },
  { priority: "High", title: "Create API" },
  { priority: "High", title: "Invite designers" },
  { priority: "Medium", title: "Review roadmap" },
  { priority: "Medium", title: "Launch beta" },
] as const;

export function AiTaskCards() {
  return (
    <section className="marketing-ai-tasks">
      <header>
        <span>Generated tasks</span>
        <strong>5</strong>
      </header>
      <ul>
        {generatedTasks.map((task) => (
          <li key={task.title}>
            <span className="marketing-ai-task__check">
              <Check />
            </span>
            <strong>{task.title}</strong>
            <span className="marketing-ai-task__priority-wrap">
              <span className="marketing-ai-task__analyzing">Analyzing...</span>
              <span
                className={`marketing-ai-task__priority marketing-ai-task__priority--${task.priority.toLowerCase()}`}
              >
                {task.priority}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
