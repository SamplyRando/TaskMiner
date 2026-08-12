import {
  BarChart3,
  Bot,
  CheckSquare2,
  FileText,
  FolderKanban,
  UsersRound,
} from "lucide-react";
import type { CSSProperties } from "react";

import { SectionHeading } from "@/components/marketing/section-heading";

const features = [
  {
    description:
      "Turn a project brief into a starting plan with suggested tasks, priorities, milestones, and next actions.",
    icon: Bot,
    title: "AI Assistant",
  },
  {
    description:
      "Keep goals, ownership, tasks, and progress connected around every project.",
    icon: FolderKanban,
    title: "Projects",
  },
  {
    description:
      "Assign work, set priorities and due dates, then move between focused list and Kanban views.",
    icon: CheckSquare2,
    title: "Tasks",
  },
  {
    description:
      "Keep feedback and file attachments on the task where your team needs them.",
    icon: FileText,
    title: "Comments & Files",
  },
  {
    description:
      "Invite teammates, assign workspace roles, and control who can view or manage shared work.",
    icon: UsersRound,
    title: "Team Collaboration",
  },
  {
    description:
      "See workload, completion, recent activity, and audit history without assembling a manual report.",
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
        <SectionHeading
          eyebrow="AI project management, without the clutter"
          reveal
        >
          <span id="marketing-features-title">Everything your team needs.</span>
          <span>Nothing you don&apos;t.</span>
        </SectionHeading>

        <div className="marketing-feature-grid">
          {features.map(({ description, icon: Icon, title }, index) => (
            <article
              className="marketing-feature-card marketing-motion-reveal marketing-motion-reveal--up"
              data-marketing-reveal
              key={title}
              style={
                {
                  "--reveal-delay": `${String(index * 60)}ms`,
                } as CSSProperties
              }
            >
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
