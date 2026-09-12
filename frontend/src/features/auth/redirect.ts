export type AuthDestination = {
  pathname?: string;
  search?: string;
  hash?: string;
};

export type AuthLocationState = {
  from?: AuthDestination | string;
  registrationSuccess?: boolean;
  email?: string;
};

const AUTH_DESTINATION_STORAGE_KEY = "taskminer-auth-destination";

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

export const rememberAuthDestination = (
  from: AuthLocationState["from"],
): string => {
  const destination = getSafeAuthDestination(from);
  sessionStorage.setItem(AUTH_DESTINATION_STORAGE_KEY, destination);
  return destination;
};

export const getRememberedAuthDestination = (): string | undefined => {
  const destination = sessionStorage.getItem(AUTH_DESTINATION_STORAGE_KEY);
  return destination ? getSafeAuthDestination(destination) : undefined;
};

export const clearRememberedAuthDestination = (): void => {
  sessionStorage.removeItem(AUTH_DESTINATION_STORAGE_KEY);
};
