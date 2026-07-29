import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 1024;
const MOBILE_QUERY = `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`;

const getInitialValue = (): boolean =>
  typeof window === "undefined"
    ? false
    : window.matchMedia(MOBILE_QUERY).matches;

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getInitialValue);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
}
