import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";
import { toneBadgeClasses } from "@/lib/tones";

describe("Badge", () => {
  it("renders inline so it can live inside text and table cells", () => {
    render(<Badge>Pro</Badge>);

    expect(screen.getByText("Pro").tagName).toBe("SPAN");
  });

  it("uses the shared semantic tones for its tone variants", () => {
    render(
      <>
        <Badge variant="success">Terminée</Badge>
        <Badge variant="destructive">Échec</Badge>
      </>,
    );

    expect(screen.getByText("Terminée")).toHaveClass(
      ...toneBadgeClasses.success.split(" "),
    );
    expect(screen.getByText("Échec")).toHaveClass(
      ...toneBadgeClasses.danger.split(" "),
    );
  });
});
