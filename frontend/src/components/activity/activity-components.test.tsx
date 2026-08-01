import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActivityFilters } from "@/components/activity/activity-filters";
import { ActivityItem } from "@/components/activity/activity-item";
import { ActivityLiveBadge } from "@/components/activity/activity-live-badge";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ActivityTimelineSkeleton } from "@/components/activity/activity-timeline-skeleton";
import { activityFixture } from "@/test/activity-fixtures";

describe("activity components", () => {
  it("renders an event with its actor, resource, message, and relative date", () => {
    render(<ActivityItem activity={activityFixture} isLast={false} />);

    expect(
      screen.getByText("Tâche créée : Préparer la mise en production"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tâche")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveAttribute(
      "datetime",
      activityFixture.created_at,
    );
    expect(screen.getByRole("time").textContent).not.toBe("");
  });

  it("renders system events and marks live arrivals", () => {
    const { container } = render(
      <ActivityItem
        activity={{
          ...activityFixture,
          actor: null,
          actor_id: null,
          event: "task_assigned",
          message: "Tâche assignée",
          type: "task_assigned",
        }}
        isLast
        isNew
      />,
    );

    expect(screen.getByText("Système")).toBeInTheDocument();
    expect(screen.getByText("Tâche assignée")).toBeInTheDocument();
    expect(container.querySelector(".activity-arrival")).toBeInTheDocument();
  });

  it("renders the empty timeline state", () => {
    render(<ActivityTimeline items={[]} />);

    expect(screen.getByText("Aucune activité")).toBeInTheDocument();
  });

  it("virtualizes a large activity feed", () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      ...activityFixture,
      id: `activity-${String(index)}`,
      message: `Activité ${String(index)}`,
    }));

    render(<ActivityTimeline items={items} />);

    expect(
      screen.getByRole("list", { name: "Historique des activités" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeLessThan(100);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
  });

  it("loads the next page on scroll and returns to the top", async () => {
    const user = userEvent.setup();
    const onEndReached = vi.fn();
    const items = Array.from({ length: 30 }, (_, index) => ({
      ...activityFixture,
      id: `activity-${String(index)}`,
    }));
    render(
      <ActivityTimeline
        hasNextPage
        items={items}
        onEndReached={onEndReached}
      />,
    );
    const viewport = screen.getByRole("region", {
      name: "Flux d’activités virtualisé",
    });
    const scrollTo = vi.fn();
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 640 },
      scrollHeight: { configurable: true, value: 5040 },
      scrollTop: { configurable: true, value: 4400, writable: true },
      scrollTo: { configurable: true, value: scrollTo },
    });

    fireEvent.scroll(viewport);

    expect(onEndReached).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Revenir en haut" }));
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "smooth", top: 0 });
  });

  it("renders live and reconnecting connection badges", () => {
    const { rerender } = render(<ActivityLiveBadge status="live" />);
    expect(screen.getByText("En direct")).toBeInTheDocument();

    rerender(<ActivityLiveBadge status="reconnecting" />);
    expect(screen.getByText("Reconnexion...")).toBeInTheDocument();
  });

  it("updates accessible activity filters without navigation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const actor = activityFixture.actor;
    expect(actor).not.toBeNull();
    if (!actor) {
      throw new Error("The activity fixture must have an actor.");
    }
    render(
      <ActivityFilters
        actors={[actor]}
        onChange={onChange}
        value={{ actorId: "", eventType: "", period: "", search: "" }}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", {
        name: "Rechercher dans les activités",
      }),
      "task",
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "t" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Utilisateur" }),
      actor.id,
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: actor.id }),
    );
  });

  it("renders the loading skeleton", () => {
    render(<ActivityTimelineSkeleton />);
    expect(
      screen.getByRole("status", { name: "Chargement des activités" }),
    ).toBeInTheDocument();
  });
});
