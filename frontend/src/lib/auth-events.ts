export const AUTH_UNAUTHORIZED_EVENT = "taskminer:unauthorized";

export const publishUnauthorized = (): void => {
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
};
