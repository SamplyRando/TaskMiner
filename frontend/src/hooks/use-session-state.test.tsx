import { act, renderHook } from "@testing-library/react";

import { useSessionState } from "@/hooks/use-session-state";

describe("useSessionState", () => {
  it("persists and restores a page state", () => {
    const { result, unmount } = renderHook(() =>
      useSessionState("taskminer-test-page", { page: 0, search: "" }),
    );

    act(() => {
      result.current[1]({ page: 2, search: "roadmap" });
    });
    unmount();

    const restored = renderHook(() =>
      useSessionState("taskminer-test-page", { page: 0, search: "" }),
    );
    expect(restored.result.current[0]).toEqual({
      page: 2,
      search: "roadmap",
    });
  });

  it("supports functional state updates", () => {
    const { result } = renderHook(() =>
      useSessionState("taskminer-test-counter", 1),
    );

    act(() => {
      result.current[1]((current) => current + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(sessionStorage.getItem("taskminer-test-counter")).toBe("2");
  });
});
