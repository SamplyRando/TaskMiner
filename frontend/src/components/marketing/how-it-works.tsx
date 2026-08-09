import { SectionHeading } from "@/components/marketing/section-heading";

const steps = [
  {
    description:
      "Give every project, task, and decision a home that stays structured as you grow.",
    eyebrow: "Your foundation",
    illustration: "workspace",
    number: "01",
    title: "Create your workspace",
  },
  {
    description:
      "Bring the right people in, define access clearly, and move together from day one.",
    eyebrow: "Your people",
    illustration: "team",
    number: "02",
    title: "Invite your team",
  },
  {
    description:
      "TaskMiner turns context into priorities so everyone knows what matters next.",
    eyebrow: "Your momentum",
    illustration: "ai",
    number: "03",
    title: "Let AI organize everything",
  },
] as const;

function WorkspaceIllustration() {
  return (
    <div
      aria-hidden="true"
      className="marketing-step-art marketing-step-art--workspace"
    >
      <div className="marketing-step-window">
        <span className="marketing-step-window__bar" />
        <div>
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="marketing-step-chip marketing-step-chip--one">
        Product
      </span>
      <span className="marketing-step-chip marketing-step-chip--two">
        Launch
      </span>
    </div>
  );
}

function TeamIllustration() {
  return (
    <div
      aria-hidden="true"
      className="marketing-step-art marketing-step-art--team"
    >
      <span className="marketing-team-line marketing-team-line--one" />
      <span className="marketing-team-line marketing-team-line--two" />
      <span className="marketing-team-line marketing-team-line--three" />
      <span className="marketing-team-avatar marketing-team-avatar--lead">
        AL
      </span>
      <span className="marketing-team-avatar marketing-team-avatar--one">
        SK
      </span>
      <span className="marketing-team-avatar marketing-team-avatar--two">
        MJ
      </span>
      <span className="marketing-team-avatar marketing-team-avatar--three">
        NO
      </span>
      <span className="marketing-team-status">4 teammates connected</span>
    </div>
  );
}

function AiIllustration() {
  return (
    <div
      aria-hidden="true"
      className="marketing-step-art marketing-step-art--ai"
    >
      <span className="marketing-ai-orbit marketing-ai-orbit--outer" />
      <span className="marketing-ai-orbit marketing-ai-orbit--inner" />
      <span className="marketing-ai-core">AI</span>
      <span className="marketing-ai-node marketing-ai-node--one">Plan</span>
      <span className="marketing-ai-node marketing-ai-node--two">Focus</span>
      <span className="marketing-ai-node marketing-ai-node--three">Ship</span>
    </div>
  );
}

function StepIllustration({
  type,
}: {
  type: (typeof steps)[number]["illustration"];
}) {
  if (type === "workspace") return <WorkspaceIllustration />;
  if (type === "team") return <TeamIllustration />;
  return <AiIllustration />;
}

export function HowItWorks() {
  return (
    <section
      aria-labelledby="marketing-how-title"
      className="marketing-section marketing-how"
    >
      <div className="marketing-section-shell">
        <SectionHeading
          description="From first idea to finished work, TaskMiner keeps the path intentionally simple."
          eyebrow="How it works"
        >
          <span id="marketing-how-title">Structure in minutes.</span>
          <span>Momentum from day one.</span>
        </SectionHeading>

        <ol className="marketing-steps">
          {steps.map((step) => (
            <li className="marketing-step" key={step.number}>
              <div className="marketing-step__copy">
                <span className="marketing-step__number">{step.number}</span>
                <p>{step.eyebrow}</p>
                <h3>{step.title}</h3>
                <span>{step.description}</span>
              </div>
              <StepIllustration type={step.illustration} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
