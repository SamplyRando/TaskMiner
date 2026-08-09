import {
  CalendarDays,
  Check,
  Clock3,
  Sparkles,
  WandSparkles,
} from "lucide-react";

const boardColumns = [
  {
    cards: [
      { label: "Launch messaging", meta: "Website", tone: "high" },
      { label: "Mobile polish", meta: "Product", tone: "medium" },
    ],
    label: "To do",
    tone: "todo",
  },
  {
    cards: [
      { label: "Onboarding flow", meta: "Experience", tone: "high" },
      { label: "Team insights", meta: "Analytics", tone: "low" },
    ],
    label: "In progress",
    tone: "progress",
  },
  {
    cards: [{ label: "Brand system", meta: "Marketing", tone: "done" }],
    label: "Done",
    tone: "done",
  },
] as const;

export function KanbanGlimpse() {
  return (
    <div className="marketing-kanban">
      {boardColumns.map((column) => (
        <div className="marketing-kanban__column" key={column.label}>
          <div className="marketing-kanban__column-heading">
            <span
              className={`marketing-kanban__status marketing-kanban__status--${column.tone}`}
            />
            <strong>{column.label}</strong>
            <small>{column.cards.length}</small>
          </div>
          <div className="marketing-kanban__cards">
            {column.cards.map((card) => (
              <div className="marketing-kanban__card" key={card.label}>
                <span
                  className={`marketing-kanban__priority marketing-kanban__priority--${card.tone}`}
                />
                <strong>{card.label}</strong>
                <span>{card.meta}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FloatingPreviewWidgets() {
  return (
    <div aria-hidden="true" className="marketing-floating-widgets">
      <div className="marketing-floating-card marketing-floating-card--ai">
        <span className="marketing-floating-card__icon marketing-floating-card__icon--purple">
          <WandSparkles />
        </span>
        <div>
          <span className="marketing-floating-card__eyebrow">TaskMiner AI</span>
          <strong>Today is prioritized</strong>
          <p>4 tasks moved into focus</p>
        </div>
        <Sparkles className="marketing-floating-card__sparkle" />
      </div>

      <div className="marketing-floating-card marketing-floating-card--calendar">
        <span className="marketing-floating-card__date">
          <small>MAY</small>
          <strong>12</strong>
        </span>
        <div>
          <span className="marketing-floating-card__eyebrow">Up next</span>
          <strong>Product review</strong>
          <p>
            <Clock3 /> 10:30 · Design team
          </p>
        </div>
        <CalendarDays className="marketing-floating-card__muted-icon" />
      </div>

      <div className="marketing-floating-card marketing-floating-card--notice">
        <span className="marketing-floating-card__icon marketing-floating-card__icon--green">
          <Check />
        </span>
        <div>
          <span className="marketing-floating-card__eyebrow">Just now</span>
          <strong>Launch plan approved</strong>
        </div>
      </div>
    </div>
  );
}
