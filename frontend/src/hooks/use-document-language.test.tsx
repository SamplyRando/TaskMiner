import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useDocumentLanguage } from "@/hooks/use-document-language";

describe("useDocumentLanguage", () => {
  afterEach(() => {
    document.documentElement.lang = "";
  });

  it("declares the section language and restores the previous one", () => {
    document.documentElement.lang = "fr";

    const { unmount } = renderHook(() => {
      useDocumentLanguage("en");
    });
    expect(document.documentElement.lang).toBe("en");

    unmount();
    expect(document.documentElement.lang).toBe("fr");
  });
});
