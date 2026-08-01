import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActivityItem } from "@/components/activity/activity-item";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ActivityTimelineSkeleton } from "@/components/activity/activity-timeline-skeleton";
import { activityFixture } from "@/test/activity-fixtures";

describe("activity components", () => {
  it("renders an event with its actor, resource and metadata summary", () => {
    render(<ActivityItem activity={activityFixture} isLast={false} />);

    expect(screen.getByText("Tâche créée")).toBeInTheDocument();
    expect(
      screen.getByText("Préparer la mise en production"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tâche")).toBeInTheDocument();
    expect(screen.getByText("Utilisateur 00000000")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveAttribute(
      "datetime",
      activityFixture.created_at,
    );
  });

  it("renders system events and primitive metadata safely", () => {
    render(
      <ActivityItem
        activity={{
          ...activityFixture,
          actor_id: null,
          event: "task_assigned",
          metadata: { active: true, attempts: 2 },
        }}
        isLast
      />,
    );

    expect(screen.getByText("Système")).toBeInTheDocument();
    expect(screen.getByText("active : Oui · attempts : 2")).toBeInTheDocument();
  });

  it("renders the empty timeline state", () => {
    render(<ActivityTimeline items={[]} />);

    expect(screen.getByText("Aucune activité")).toBeInTheDocument();
  });

  it("renders the timeline and its loading skeleton", () => {
    const { rerender } = render(<ActivityTimeline items={[activityFixture]} />);
    expect(
      screen.getByRole("list", { name: "Historique des activités" }),
    ).toBeInTheDocument();

    rerender(<ActivityTimelineSkeleton />);
    expect(
      screen.getByRole("status", { name: "Chargement des activités" }),
    ).toBeInTheDocument();
  });
});
