import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Facet } from "@/components/ui/facet";

describe("Facet", () => {
  it("is decorative and hidden from assistive technologies by default", () => {
    const { container } = render(<Facet />);

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("exposes an accessible image when it carries meaning", () => {
    render(<Facet label="TaskMiner AI" />);

    expect(screen.getByRole("img", { name: "TaskMiner AI" })).toBeVisible();
  });
});
