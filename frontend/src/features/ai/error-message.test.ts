import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/client";
import { getAIGenerationErrorMessage } from "@/features/ai/error-message";

describe("getAIGenerationErrorMessage", () => {
  it("maps quota, local rate, and provider failures to stable French copy", () => {
    expect(
      getAIGenerationErrorMessage(
        new ApiError("AI monthly quota exceeded.", 429),
      ),
    ).toMatch(/quota mensuel/i);
    expect(
      getAIGenerationErrorMessage(
        new ApiError("AI generation rate limit exceeded.", 429),
      ),
    ).toMatch(/Trop de générations/);
    expect(
      getAIGenerationErrorMessage(new ApiError("private upstream detail", 503)),
    ).toBe(
      "TaskMiner AI est temporairement indisponible. Réessayez dans quelques instants.",
    );
  });

  it("leaves ordinary validation and authorization errors unchanged", () => {
    expect(
      getAIGenerationErrorMessage(new ApiError("Workspace not found.", 404)),
    ).toBeUndefined();
  });
});
