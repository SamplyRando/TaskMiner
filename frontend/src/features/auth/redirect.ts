export type AuthDestination = {
  pathname?: string;
  search?: string;
  hash?: string;
};

export type AuthLocationState = {
  from?: AuthDestination | string;
  registrationSuccess?: boolean;
};

const isAllowedAppPath = (pathname: string): boolean =>
  pathname === "/app" || pathname.startsWith("/app/");

export const getSafeAuthDestination = (
  from: AuthLocationState["from"],
): string => {
  if (typeof from === "string") {
    if (!from.startsWith("/") || from.startsWith("//")) {
      return "/app";
    }
    const url = new URL(from, "https://taskminer.invalid");
    return isAllowedAppPath(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}`
      : "/app";
  }

  const pathname = from?.pathname ?? "/app";
  if (!isAllowedAppPath(pathname)) {
    return "/app";
  }
  const search = from?.search?.startsWith("?") ? from.search : "";
  const hash = from?.hash?.startsWith("#") ? from.hash : "";
  return `${pathname}${search}${hash}`;
};

export const authStateWithDestination = (
  from: AuthLocationState["from"],
  registrationSuccess = false,
): AuthLocationState => ({
  from: getSafeAuthDestination(from),
  ...(registrationSuccess ? { registrationSuccess: true } : {}),
});
