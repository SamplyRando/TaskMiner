const timelineSteps = [
  "Planning",
  "Today",
  "Tomorrow",
  "Friday",
  "Done",
] as const;

type AiTimelineProps = {
  visibleStepCount: number;
};

export function AiTimeline({ visibleStepCount }: AiTimelineProps) {
  return (
    <section className="marketing-ai-timeline">
      <header>
        <span>Timeline</span>
        <strong>2 weeks</strong>
      </header>
      <ol>
        {timelineSteps.slice(0, visibleStepCount).map((step) => (
          <li key={step}>
            <span />
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
