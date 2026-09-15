import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useHeroParallax } from "@/components/marketing/use-hero-parallax";

const defaultMatchMedia = window.matchMedia.bind(window);

function ParallaxFixture() {
  const ref = useHeroParallax<HTMLElement>();
  return <section data-testid="hero" ref={ref} />;
}

describe("useHeroParallax", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = defaultMatchMedia;
  });

  it("measures the hero once for repeated pointer frames", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined,
    );

    const { getByTestId } = render(<ParallaxFixture />);
    const hero = getByTestId("hero");
    const getBounds = vi.spyOn(hero, "getBoundingClientRect").mockReturnValue({
      bottom: 400,
      height: 400,
      left: 0,
      right: 800,
      toJSON: () => ({}),
      top: 0,
      width: 800,
      x: 0,
      y: 0,
    });

    fireEvent.pointerEnter(hero);
    fireEvent.pointerMove(hero, { clientX: 200, clientY: 100 });
    fireEvent.pointerMove(hero, { clientX: 300, clientY: 150 });

    expect(getBounds).toHaveBeenCalledTimes(1);
    expect(hero.style.getPropertyValue("--marketing-parallax-x")).not.toBe("");

    fireEvent.resize(window);
    fireEvent.pointerMove(hero, { clientX: 400, clientY: 200 });
    expect(getBounds).toHaveBeenCalledTimes(2);
  });
});
