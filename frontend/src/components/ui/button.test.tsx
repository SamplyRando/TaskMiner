import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders an accessible button and forwards interactions", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Enregistrer</Button>);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
