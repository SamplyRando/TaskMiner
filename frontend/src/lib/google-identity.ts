const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_IDENTITY_SCRIPT_MARKER = "data-taskminer-google-identity";

export type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleButtonConfiguration = {
  type: "standard";
  theme: "outline";
  size: "large";
  text: "continue_with";
  shape: "rectangular";
  logo_alignment: "left";
  locale: "fr";
  width: number;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce: string;
  ux_mode: "popup";
  context: "signin";
  auto_select: false;
  cancel_on_tap_outside: true;
};

export type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (configuration: GoogleIdConfiguration) => void;
      renderButton: (
        parent: HTMLElement,
        configuration: GoogleButtonConfiguration,
      ) => void;
      disableAutoSelect: () => void;
    };
  };
};

type GoogleIdentityWindow = Window & { google?: GoogleIdentityApi };

const getGoogleWindow = (): GoogleIdentityWindow => window;

let loadingPromise: Promise<GoogleIdentityApi> | null = null;

export const loadGoogleIdentity = (): Promise<GoogleIdentityApi> => {
  const loadedGoogle = getGoogleWindow().google;
  if (loadedGoogle) {
    return Promise.resolve(loadedGoogle);
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[${GOOGLE_IDENTITY_SCRIPT_MARKER}]`,
    );
    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      const google = getGoogleWindow().google;
      if (google) {
        resolve(google);
      } else {
        loadingPromise = null;
        reject(new Error("Google Identity Services is unavailable."));
      }
    };
    const onError = () => {
      loadingPromise = null;
      reject(new Error("Google Identity Services could not be loaded."));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.async = true;
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.setAttribute(GOOGLE_IDENTITY_SCRIPT_MARKER, "true");
      document.head.append(script);
    }
  });
  return loadingPromise;
};

export const resetGoogleIdentityLoaderForTests = (): void => {
  loadingPromise = null;
};
