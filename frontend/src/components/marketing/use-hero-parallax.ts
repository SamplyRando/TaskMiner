import { useEffect, useRef } from "react";

const POINTER_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function useHeroParallax<T extends HTMLElement>() {
  const heroRef = useRef<T>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof window.matchMedia !== "function") return;

    const pointerMedia = window.matchMedia(POINTER_QUERY);
    let animationFrame = 0;
    let isListening = false;
    let pointerX = 0;
    let pointerY = 0;
    let heroBounds: DOMRect | null = null;

    const updateVariables = () => {
      const bounds = heroBounds ?? hero.getBoundingClientRect();
      heroBounds = bounds;
      const normalizedX = Math.max(
        -1,
        Math.min(1, ((pointerX - bounds.left) / bounds.width - 0.5) * 2),
      );
      const normalizedY = Math.max(
        -1,
        Math.min(1, ((pointerY - bounds.top) / bounds.height - 0.5) * 2),
      );

      hero.style.setProperty(
        "--marketing-parallax-x",
        `${String(normalizedX * 16)}px`,
      );
      hero.style.setProperty(
        "--marketing-parallax-y",
        `${String(normalizedY * 12)}px`,
      );
      hero.style.setProperty(
        "--marketing-preview-shift-x",
        `${String(normalizedX * 8)}px`,
      );
      hero.style.setProperty(
        "--marketing-preview-shift-y",
        `${String(normalizedY * 6)}px`,
      );
      hero.style.setProperty(
        "--marketing-preview-rotate-x",
        `${String(normalizedY * -0.55)}deg`,
      );
      hero.style.setProperty(
        "--marketing-preview-rotate-y",
        `${String(normalizedX * 0.8)}deg`,
      );
    };

    const resetVariables = () => {
      window.cancelAnimationFrame(animationFrame);
      hero.style.setProperty("--marketing-parallax-x", "0px");
      hero.style.setProperty("--marketing-parallax-y", "0px");
      hero.style.setProperty("--marketing-preview-shift-x", "0px");
      hero.style.setProperty("--marketing-preview-shift-y", "0px");
      hero.style.setProperty("--marketing-preview-rotate-x", "0deg");
      hero.style.setProperty("--marketing-preview-rotate-y", "0deg");
    };

    const refreshBounds = () => {
      heroBounds = hero.getBoundingClientRect();
    };

    const invalidateBounds = () => {
      heroBounds = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateVariables);
    };

    const addListeners = () => {
      if (isListening) return;
      isListening = true;
      hero.addEventListener("pointerenter", refreshBounds, { passive: true });
      hero.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      hero.addEventListener("pointerleave", resetVariables);
      window.addEventListener("resize", invalidateBounds, { passive: true });
      window.addEventListener("scroll", invalidateBounds, { passive: true });
    };

    const removeListeners = () => {
      if (!isListening) return;
      isListening = false;
      hero.removeEventListener("pointerenter", refreshBounds);
      hero.removeEventListener("pointermove", handlePointerMove);
      hero.removeEventListener("pointerleave", resetVariables);
      window.removeEventListener("resize", invalidateBounds);
      window.removeEventListener("scroll", invalidateBounds);
      resetVariables();
    };

    const syncPointerCapability = () => {
      if (pointerMedia.matches) addListeners();
      else removeListeners();
    };

    syncPointerCapability();
    pointerMedia.addEventListener("change", syncPointerCapability);

    return () => {
      pointerMedia.removeEventListener("change", syncPointerCapability);
      removeListeners();
    };
  }, []);

  return heroRef;
}
