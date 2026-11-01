/**
 * Meta Pixel (Facebook and Instagram Ads), behind the visitor's consent.
 *
 * - Nothing is loaded and no request reaches Meta before consent. The official
 *   base code is injected only then, without its <noscript> image, which
 *   would bypass the choice. Withdrawing consent pauses the pixel and deletes
 *   its cookies.
 * - Page views follow the router: the pixel's own History API listener is
 *   disabled and each route is sent once (see MetaPixelTracker).
 * - The pixel sends the full page URL and referrer with every event, so it is
 *   never loaded, or is paused, on a URL carrying a secret: the `?token=` of
 *   the email verification, password reset and invitation links.
 * - Automatic configuration (button clicks, page metadata) is disabled: only
 *   the events below are sent, without any personal data.
 */

export const META_PIXEL_ID = "1465527144910879";

const META_PIXEL_SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";
const PRODUCTION_HOSTNAMES = new Set(["taskminer.app", "www.taskminer.app"]);
const SENSITIVE_QUERY_PARAMETERS = ["token"];
const META_COOKIE_NAMES = ["_fbp", "_fbc"];

type MetaCheckoutParameters = {
  content_name: string;
  currency: "EUR";
  value: number;
};

/** Arguments accepted after the event name, per standard event. */
export type MetaEventArguments = {
  CompleteRegistration: [];
  InitiateCheckout: [parameters: MetaCheckoutParameters];
  /**
   * Not sent yet. A return to the Stripe success URL proves nothing: send it
   * only once the backend has confirmed the payment (verified webhook), with
   * the Stripe Checkout Session id as eventID so that a server-side
   * Conversions API event carrying the same id is deduplicated by Meta.
   */
  Purchase: [parameters: MetaCheckoutParameters, options: { eventID: string }];
};

type MetaPixelFunction = {
  (...args: unknown[]): void;
  allowDuplicatePageViews?: boolean;
  callMethod?: (...args: unknown[]) => void;
  disablePushState?: boolean;
  loaded: boolean;
  push: MetaPixelFunction;
  queue: unknown[][];
  version: string;
};

type MetaPixelWindow = Window & {
  _fbq?: MetaPixelFunction;
  fbq?: MetaPixelFunction;
};

const getPixelWindow = (): MetaPixelWindow => window;

export type MetaPixel = {
  track: <E extends keyof MetaEventArguments>(
    event: E,
    ...args: MetaEventArguments[E]
  ) => void;
  /** Sends a PageView, once per distinct page key (path and query). */
  trackPageView: (pageKey: string) => void;
  /** Applies the consent to the current page; call it after each navigation. */
  update: (hasConsent: boolean) => void;
};

type MetaPixelOptions = {
  isEnabled: () => boolean;
  pixelId: string;
  scriptUrl?: string;
};

const hasSensitiveQuery = (url: string): boolean => {
  try {
    const { searchParams } = new URL(url);
    return SENSITIVE_QUERY_PARAMETERS.some((name) => searchParams.has(name));
  } catch {
    return false;
  }
};

const isSensitivePage = (): boolean => {
  const { href, origin } = window.location;
  const referrer = document.referrer;
  return (
    hasSensitiveQuery(href) ||
    (referrer.startsWith(`${origin}/`) && hasSensitiveQuery(referrer))
  );
};

const clearMetaCookies = (): void => {
  const cookies = document.cookie.split("; ");
  const presentNames = META_COOKIE_NAMES.filter((name) =>
    cookies.some((cookie) => cookie.startsWith(`${name}=`)),
  );
  if (presentNames.length === 0) return;
  // Host-only cookies, then each parent domain the pixel may have used.
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

/** Port of Meta's official base code, without the <noscript> fallback. */
const installPixel = (
  pixelId: string,
  scriptUrl: string,
): MetaPixelFunction => {
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  } as MetaPixelFunction;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // The router sends page views itself, one per route: the pixel must neither
  // add its own on history changes nor drop the repeated ones.
  fbq.disablePushState = true;
  fbq.allowDuplicatePageViews = true;
  const pixelWindow = getPixelWindow();
  pixelWindow.fbq = fbq;
  pixelWindow._fbq ??= fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  document.head.append(script);

  fbq("set", "autoConfig", false, pixelId);
  fbq("init", pixelId);
  return fbq;
};

export const createMetaPixel = ({
  isEnabled,
  pixelId,
  scriptUrl = META_PIXEL_SCRIPT_URL,
}: MetaPixelOptions): MetaPixel => {
  let hasConsent = false;
  let isPaused = false;
  let lastPageKey: string | null = null;
  let pixel: MetaPixelFunction | null = null;

  const pause = () => {
    if (pixel && !isPaused) {
      pixel("consent", "revoke");
      isPaused = true;
    }
  };

  const activePixel = (): MetaPixelFunction | null =>
    isEnabled() && hasConsent && !isPaused && !isSensitivePage() ? pixel : null;

  return {
    track: (event, ...args) => {
      activePixel()?.("track", event, ...args);
    },
    trackPageView: (pageKey) => {
      const active = activePixel();
      if (!active || pageKey === lastPageKey) return;
      lastPageKey = pageKey;
      active("track", "PageView");
    },
    update: (consent) => {
      hasConsent = consent;
      if (!isEnabled()) return;
      if (!consent) {
        pause();
        clearMetaCookies();
        return;
      }
      if (isSensitivePage()) {
        pause();
        return;
      }
      if (!pixel) {
        pixel = getPixelWindow().fbq ?? installPixel(pixelId, scriptUrl);
        return;
      }
      if (isPaused) {
        // While paused, the pixel queues the page views it fires on its own
        // (a page restored from the back-forward cache) and would replay them
        // here: they were not consented to and would duplicate ours.
        const { queue } = pixel;
        for (let index = queue.length - 1; index >= 0; index -= 1) {
          const call = queue[index];
          if (call?.[0] === "trackCustom" && call[1] === "PageView") {
            queue.splice(index, 1);
          }
        }
        pixel("consent", "grant");
        isPaused = false;
      }
    },
  };
};

/** Production pixel: never active in development, tests or previews. */
export const metaPixel = createMetaPixel({
  isEnabled: () =>
    import.meta.env.PROD && PRODUCTION_HOSTNAMES.has(window.location.hostname),
  pixelId: META_PIXEL_ID,
});
