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

  it("exposes a busy state and blocks interactions while loading", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button
        isLoading
        loadingLabel="Enregistrement en cours"
        onClick={handleClick}
      >
        Enregistrer
      </Button>,
    );

    const button = screen.getByRole("button", { name: /enregistrer/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Enregistrement en cours")).toBeInTheDocument();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("forwards a ref to the native button", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Continuer</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Continuer" }));
  });
});
