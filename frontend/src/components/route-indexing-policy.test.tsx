import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RouteIndexingPolicy } from "@/components/route-indexing-policy";

describe("RouteIndexingPolicy", () => {
  beforeEach(() => {
    const robotsMeta = document.createElement("meta");
    robotsMeta.name = "robots";
    document.head.append(robotsMeta);
  });

  afterEach(() => {
    document.querySelector('meta[name="robots"]')?.remove();
  });

  it("allows the public marketing page to be indexed", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RouteIndexingPolicy />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        "content",
        "index, follow",
      );
    });
  });

  it("prevents private application routes from being indexed", async () => {
    render(
      <MemoryRouter initialEntries={["/app/tasks"]}>
        <RouteIndexingPolicy />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
    });
  });
});
