import { Check, Sparkles } from "lucide-react";

const summaryLines = [
  ["Project", "organized"],
  ["Tasks created", "5"],
  ["Priorities detected", "3"],
  ["Estimated duration", "2 weeks"],
] as const;

export function AiSummary() {
  return (
    <section className="marketing-ai-summary">
      <header>
        <span>
          <Sparkles />
          AI Summary
        </span>
        <strong className="marketing-ai-summary__done">
          <Check />
          Done
        </strong>
      </header>
      <dl>
        {summaryLines.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        <span />
        Ready to start.
      </p>
    </section>
  );
}
