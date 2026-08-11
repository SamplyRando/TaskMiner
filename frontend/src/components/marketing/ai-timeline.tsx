const timelineSteps = [
  "Planning",
  "Today",
  "Tomorrow",
  "Friday",
  "Done",
] as const;

export function AiTimeline() {
  return (
    <section className="marketing-ai-timeline">
      <header>
        <span>Timeline</span>
        <strong>2 weeks</strong>
      </header>
      <ol>
        {timelineSteps.map((step) => (
          <li key={step}>
            <span />
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
