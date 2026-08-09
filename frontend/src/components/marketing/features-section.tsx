import {
  BarChart3,
  Bot,
  CheckSquare2,
  FileText,
  FolderKanban,
  UsersRound,
} from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";

const features = [
  {
    description:
      "Turn scattered priorities into a clear, intelligent plan for every day.",
    icon: Bot,
    title: "AI Assistant",
  },
  {
    description:
      "Keep initiatives, ownership, and momentum visible from one calm workspace.",
    icon: FolderKanban,
    title: "Projects",
  },
  {
    description:
      "Move work forward with focused views, rich context, and effortless updates.",
    icon: CheckSquare2,
    title: "Tasks",
  },
  {
    description:
      "Connect decisions and source material directly to the work they support.",
    icon: FileText,
    title: "Documents",
  },
  {
    description:
      "Give every teammate the context, permissions, and clarity to contribute.",
    icon: UsersRound,
    title: "Team Collaboration",
  },
  {
    description:
      "Understand progress, bottlenecks, and capacity without building reports.",
    icon: BarChart3,
    title: "Analytics",
  },
] as const;

export function FeaturesSection() {
  return (
    <section
      aria-labelledby="marketing-features-title"
      className="marketing-section marketing-features"
      id="features"
    >
      <div className="marketing-section-shell">
        <SectionHeading eyebrow="One workspace. Total clarity.">
          <span id="marketing-features-title">Everything your team needs.</span>
          <span>Nothing you don&apos;t.</span>
        </SectionHeading>

        <div className="marketing-feature-grid">
          {features.map(({ description, icon: Icon, title }, index) => (
            <article className="marketing-feature-card" key={title}>
              <div className="marketing-feature-card__topline">
                <span className="marketing-feature-card__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <div
                aria-hidden="true"
                className="marketing-feature-card__beam"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
