/**
 * LinkedIn Insight Tag, loaded only after advertising consent.
 *
 * The official <noscript> image is intentionally omitted: it would send a
 * request before JavaScript can read the visitor's choice. LinkedIn is also
 * kept off authenticated and account-action pages so URLs, project content,
 * credentials and security tokens are never exposed to the tag.
 */

export const LINKEDIN_INSIGHT_SCRIPT_URL =
  "https://snap.licdn.com/li.lms-analytics/insight.min.js";

const PRODUCTION_HOSTNAMES = new Set(["taskminer.app", "www.taskminer.app"]);
const SENSITIVE_PATH_PREFIXES = [
  "/app",
  "/forgot-password",
  "/invitation",
  "/login",
  "/register",
  "/reset-password",
  "/verify-email",
];
const SENSITIVE_QUERY_PARAMETERS = new Set([
  "access_token",
  "code",
  "password",
  "refresh_token",
  "session_id",
  "token",
]);
const LINKEDIN_FIRST_PARTY_COOKIE_NAMES = [
  "li_fat_id",
  "li_giant",
  "ln_or",
  "oribi_cookie_test",
  "oribili_user_guid",
];
const SCRIPT_MARKER = "data-taskminer-linkedin-insight";

type LinkedInFunction = {
  (...args: unknown[]): void;
  q: unknown[][];
  taskminerBlocked?: boolean;
};

type LinkedInWindow = Window & {
  _linkedin_data_partner_ids?: string[];
  _linkedin_partner_id?: string;
  lintrk?: LinkedInFunction;
};

const getLinkedInWindow = (): LinkedInWindow => window;

const hasSensitiveQuery = (url: URL): boolean => {
  for (const name of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_PARAMETERS.has(name.toLowerCase())) return true;
  }
  return false;
};

const hasSensitiveHash = (url: URL): boolean => {
  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!fragment) return false;

  const parameters = new URLSearchParams(
    fragment.startsWith("?") ? fragment.slice(1) : fragment,
  );
  for (const name of parameters.keys()) {
    if (SENSITIVE_QUERY_PARAMETERS.has(name.toLowerCase())) return true;
  }
  return false;
};

const hasSensitivePath = (pathname: string): boolean =>
  SENSITIVE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export const isLinkedInSensitivePage = (): boolean => {
  const current = new URL(window.location.href);
  if (
    hasSensitivePath(current.pathname) ||
    hasSensitiveQuery(current) ||
    hasSensitiveHash(current)
  ) {
    return true;
  }

  if (!document.referrer) return false;
  try {
    const referrer = new URL(document.referrer);
    return (
      referrer.origin === current.origin &&
      (hasSensitivePath(referrer.pathname) ||
        hasSensitiveQuery(referrer) ||
        hasSensitiveHash(referrer))
    );
  } catch {
    return false;
  }
};

const clearFirstPartyCookies = (): void => {
  const cookies = document.cookie.split("; ");
  const presentNames = LINKEDIN_FIRST_PARTY_COOKIE_NAMES.filter((name) =>
    cookies.some((cookie) => cookie.startsWith(`${name}=`)),
  );
  if (presentNames.length === 0) return;

  const labels = window.location.hostname.split(".");
  const domainAttributes = [
    "",
    ...labels
      .slice(0, -1)
      .map((_, index) => `; domain=.${labels.slice(index).join(".")}`),
  ];
  for (const name of presentNames) {
    for (const domainAttribute of domainAttributes) {
      document.cookie = `${name}=; max-age=0; path=/${domainAttribute}`;
    }
  }
};

const removePartnerId = (partnerId: string): void => {
  const linkedInWindow = getLinkedInWindow();
  linkedInWindow._linkedin_data_partner_ids =
    linkedInWindow._linkedin_data_partner_ids?.filter(
      (candidate) => candidate !== partnerId,
    ) ?? [];
  if (linkedInWindow._linkedin_partner_id === partnerId) {
    delete linkedInWindow._linkedin_partner_id;
  }
};

const installTag = (partnerId: string, scriptUrl: string): void => {
  const linkedInWindow = getLinkedInWindow();
  linkedInWindow._linkedin_partner_id = partnerId;
  linkedInWindow._linkedin_data_partner_ids ??= [];
  if (!linkedInWindow._linkedin_data_partner_ids.includes(partnerId)) {
    linkedInWindow._linkedin_data_partner_ids.push(partnerId);
  }
  if (linkedInWindow.lintrk?.taskminerBlocked) {
    delete linkedInWindow.lintrk;
  }
  if (!linkedInWindow.lintrk) {
    const lintrk = ((...args: unknown[]) => {
      lintrk.q.push(args);
    }) as LinkedInFunction;
    lintrk.q = [];
    linkedInWindow.lintrk = lintrk;
  }

  if (document.querySelector(`script[${SCRIPT_MARKER}]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  script.setAttribute(SCRIPT_MARKER, partnerId);
  document.head.append(script);
};

export type LinkedInInsightTag = {
  /** Applies the current marketing choice and route eligibility. */
  update: (hasConsent: boolean) => void;
};

type LinkedInInsightOptions = {
  isEnabled: () => boolean;
  partnerId: string;
  scriptUrl?: string;
};

export const createLinkedInInsightTag = ({
  isEnabled,
  partnerId,
  scriptUrl = LINKEDIN_INSIGHT_SCRIPT_URL,
}: LinkedInInsightOptions): LinkedInInsightTag => {
  let hasConsent = false;

  const deactivate = () => {
    const script = document.querySelector(`script[${SCRIPT_MARKER}]`);
    const linkedInWindow = getLinkedInWindow();
    const wasInstalled =
      script !== null ||
      linkedInWindow._linkedin_partner_id === partnerId ||
      linkedInWindow._linkedin_data_partner_ids?.includes(partnerId) === true;
    script?.remove();
    removePartnerId(partnerId);
    if (wasInstalled) {
      const blockedLintrk = (() => undefined) as LinkedInFunction;
      blockedLintrk.q = [];
      blockedLintrk.taskminerBlocked = true;
      linkedInWindow.lintrk = blockedLintrk;
    }
    clearFirstPartyCookies();
  };

  return {
    update: (consent) => {
      hasConsent = consent;
      if (!isEnabled()) return;
      if (!hasConsent || isLinkedInSensitivePage()) {
        deactivate();
        return;
      }
      installTag(partnerId, scriptUrl);
    },
  };
};

const configuredPartnerId =
  import.meta.env.VITE_LINKEDIN_PARTNER_ID?.trim() ?? "";

/** Production tag: disabled on local, test and preview hosts. */
export const linkedInInsightTag = createLinkedInInsightTag({
  isEnabled: () =>
    import.meta.env.PROD &&
    /^\d+$/.test(configuredPartnerId) &&
    PRODUCTION_HOSTNAMES.has(window.location.hostname),
  partnerId: configuredPartnerId,
});
