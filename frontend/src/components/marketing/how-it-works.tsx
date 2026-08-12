import type { CSSProperties } from "react";

import { SectionHeading } from "@/components/marketing/section-heading";

const steps = [
  {
    description:
      "Add the outcome, context, and people behind the work so the project starts with a shared source of truth.",
    eyebrow: "Set the context",
    illustration: "workspace",
    number: "01",
    title: "Create a workspace and project",
  },
  {
    description:
      "Invite teammates, assign roles and tasks, and keep decisions attached to the work through comments and files.",
    eyebrow: "Coordinate delivery",
    illustration: "team",
    number: "02",
    title: "Organize work with your team",
  },
  {
    description:
      "Use AI-assisted planning to suggest tasks, priorities, milestones, and next actions that your team can review.",
    eyebrow: "Start with structure",
    illustration: "ai",
    number: "03",
    title: "Turn context into a plan",
  },
] as const;

function WorkspaceIllustration() {
  return (
    <div
      aria-hidden="true"
      className="marketing-step-art marketing-step-art--workspace marketing-motion-reveal marketing-motion-reveal--scale marketing-motion-reveal--blur"
      data-marketing-reveal
      style={{ "--reveal-delay": "110ms" } as CSSProperties}
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
      className="marketing-step-art marketing-step-art--team marketing-motion-reveal marketing-motion-reveal--scale marketing-motion-reveal--blur"
      data-marketing-reveal
      style={{ "--reveal-delay": "110ms" } as CSSProperties}
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
      className="marketing-step-art marketing-step-art--ai marketing-motion-reveal marketing-motion-reveal--scale marketing-motion-reveal--blur"
      data-marketing-reveal
      style={{ "--reveal-delay": "110ms" } as CSSProperties}
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
          description="Capture the project, coordinate the team, and use AI-assisted planning to create a structured starting point."
          eyebrow="How it works"
          reveal
        >
          <span id="marketing-how-title">Structure in minutes.</span>
          <span>Momentum from day one.</span>
        </SectionHeading>

        <ol className="marketing-steps">
          {steps.map((step) => (
            <li className="marketing-step" key={step.number}>
              <div
                className="marketing-step__copy marketing-motion-reveal marketing-motion-reveal--up"
                data-marketing-reveal
              >
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
