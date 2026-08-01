import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuditDetailDialog } from "@/components/audit/audit-detail-dialog";
import { JsonValueView } from "@/components/audit/json-value-view";
import { auditLogFixture } from "@/test/activity-fixtures";

describe("audit components", () => {
  it("shows a readable before and after comparison", async () => {
    const user = userEvent.setup();
    render(
      <AuditDetailDialog log={auditLogFixture} onOpenChange={vi.fn()} open />,
    );

    expect(
      screen.getByRole("dialog", { name: "Tâche modifiée" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Avant")).toBeInTheDocument();
    expect(screen.getByText("Après")).toBeInTheDocument();
    expect(screen.getByText("Non renseigné")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();
    expect(screen.getByText("Oui")).toBeInTheDocument();
    expect(screen.getByText("release")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fermer" }));
  });

  it("formats null, empty and unsupported JSON values safely", () => {
    const { rerender } = render(<JsonValueView value={[]} />);
    expect(screen.getByText("Liste vide")).toBeInTheDocument();

    rerender(<JsonValueView value={{}} />);
    expect(screen.getByText("Aucune valeur")).toBeInTheDocument();

    rerender(<JsonValueView value="" />);
    expect(screen.getByText("Chaîne vide")).toBeInTheDocument();

    rerender(<JsonValueView value={() => undefined} />);
    expect(screen.getByText("Valeur non affichable")).toBeInTheDocument();
  });
});
