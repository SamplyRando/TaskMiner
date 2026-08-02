import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuditDetailDialog } from "@/components/audit/audit-detail-dialog";
import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditItem } from "@/components/audit/audit-item";
import { AuditLiveBadge } from "@/components/audit/audit-live-badge";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { AuditTimelineSkeleton } from "@/components/audit/audit-timeline-skeleton";
import { JsonValueView } from "@/components/audit/json-value-view";
import { auditLogFixture } from "@/test/activity-fixtures";

describe("audit components", () => {
  it("renders traceability data and opens details", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(<AuditItem auditLog={auditLogFixture} onView={onView} />);

    expect(screen.getByText("Modification")).toBeInTheDocument();
    expect(screen.getByText("Succès")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Produit")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveAttribute(
      "datetime",
      auditLogFixture.created_at,
    );

    await user.click(
      screen.getByRole("button", {
        name: `Voir le détail de ${auditLogFixture.message}`,
      }),
    );
    expect(onView).toHaveBeenCalledWith(auditLogFixture);
  });

  it("distinguishes failures and animates live arrivals", () => {
    const { container } = render(
      <AuditItem
        auditLog={{
          ...auditLogFixture,
          message: "Modification refusée — échec",
          success: false,
        }}
        isNew
        onView={vi.fn()}
      />,
    );

    expect(screen.getByText("Échec")).toBeInTheDocument();
    expect(container.querySelector(".audit-arrival")).toBeInTheDocument();
  });

  it("shows a readable vertical before and after comparison", async () => {
    const user = userEvent.setup();
    render(
      <AuditDetailDialog log={auditLogFixture} onOpenChange={vi.fn()} open />,
    );

    expect(
      screen.getByRole("dialog", { name: auditLogFixture.message }),
    ).toBeInTheDocument();
    expect(screen.getByText("Avant")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Devient" })).toBeInTheDocument();
    expect(screen.getByText("Après")).toBeInTheDocument();
    expect(screen.getByText("Non renseigné")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fermer" }));
  });

  it("renders an empty and a virtualized timeline", () => {
    const { rerender } = render(<AuditTimeline items={[]} onView={vi.fn()} />);
    expect(screen.getByText("Journal d’audit vide")).toBeInTheDocument();

    const items = Array.from({ length: 100 }, (_, index) => ({
      ...auditLogFixture,
      id: `audit-${String(index)}`,
      message: `Audit ${String(index)}`,
    }));
    rerender(<AuditTimeline items={items} onView={vi.fn()} />);

    expect(
      screen.getByRole("list", { name: "Entrées du journal d’audit" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeLessThan(100);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
  });

  it("loads the next page on scroll and returns to the top", async () => {
    const user = userEvent.setup();
    const onEndReached = vi.fn();
    const items = Array.from({ length: 30 }, (_, index) => ({
      ...auditLogFixture,
      id: `audit-${String(index)}`,
    }));
    render(
      <AuditTimeline
        hasNextPage
        items={items}
        onEndReached={onEndReached}
        onView={vi.fn()}
      />,
    );
    const viewport = screen.getByRole("region", {
      name: "Journal d’audit virtualisé",
    });
    const scrollTo = vi.fn();
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 680 },
      scrollHeight: { configurable: true, value: 7800 },
      scrollTop: { configurable: true, value: 7100, writable: true },
      scrollTo: { configurable: true, value: scrollTo },
    });

    fireEvent.scroll(viewport);

    expect(onEndReached).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Revenir en haut" }));
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "smooth", top: 0 });
  });

  it("renders live and reconnecting badges", () => {
    const { rerender } = render(<AuditLiveBadge status="live" />);
    expect(screen.getByText("En direct")).toBeInTheDocument();

    rerender(<AuditLiveBadge status="reconnecting" />);
    expect(screen.getByText("Reconnexion...")).toBeInTheDocument();
  });

  it("updates every accessible audit filter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const actor = auditLogFixture.actor;
    expect(actor).not.toBeNull();
    if (!actor) {
      throw new Error("The audit fixture must have an actor.");
    }
    render(
      <AuditFilters
        actors={[actor]}
        onChange={onChange}
        value={{
          actorId: "",
          eventType: "",
          period: "",
          resourceType: "",
          search: "",
          success: "",
        }}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", {
        name: "Rechercher dans le journal d’audit",
      }),
      "task",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Utilisateur" }),
      actor.id,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Résultat" }),
      "false",
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "t" }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: actor.id }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ success: "false" }),
    );
  });

  it("renders loading and JSON fallback states", () => {
    const { rerender } = render(<AuditTimelineSkeleton />);
    expect(
      screen.getByLabelText("Chargement du journal d’audit"),
    ).toBeInTheDocument();

    rerender(<JsonValueView value={[]} />);
    expect(screen.getByText("Liste vide")).toBeInTheDocument();
  });
});
