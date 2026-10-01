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
