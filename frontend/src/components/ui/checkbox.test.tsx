import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  it("stays a native, labelled checkbox that toggles with mouse and keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <label>
        <Checkbox onChange={onChange} />
        Accepter les conditions
      </label>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Accepter les conditions",
    });
    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("respects the disabled state", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Option indisponible" disabled />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Option indisponible",
    });
    await user.click(checkbox);

    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });
});
