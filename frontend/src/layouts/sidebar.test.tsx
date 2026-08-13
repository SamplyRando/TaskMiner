import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/layouts/sidebar";

describe("Sidebar TaskMiner AI navigation", () => {
  it("exposes the authenticated TaskMiner AI entry point", () => {
    render(
      <MemoryRouter>
        <Sidebar isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "TaskMiner AI" })).toHaveAttribute(
      "href",
      "/app/ai",
    );
  });
});
