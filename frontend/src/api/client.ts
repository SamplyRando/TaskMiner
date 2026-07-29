import axios from "axios";

type ApiErrorPayload = {
  detail?: unknown;
  message?: unknown;
};

type ValidationErrorItem = {
  msg?: unknown;
};

type ApiAuthHandlers = {
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
};

const defaultAuthHandlers: ApiAuthHandlers = {
  getAccessToken: () => null,
  onUnauthorized: () => undefined,
};

let authHandlers = defaultAuthHandlers;

export class ApiError extends Error {
  readonly status: number | undefined;
  readonly details: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getValidationMessage = (detail: unknown): string | null => {
  if (!Array.isArray(detail)) {
    return null;
  }

  const messages = detail
    .map((item: unknown) => {
      if (!isRecord(item)) {
        return null;
      }
      const validationItem = item as ValidationErrorItem;
      return typeof validationItem.msg === "string" ? validationItem.msg : null;
    })
    .filter((message): message is string => message !== null);

  return messages.length > 0 ? messages.join(" ") : null;
};

const getErrorMessage = (data: unknown): string => {
  if (!isRecord(data)) {
    return "Une erreur inattendue est survenue.";
  }

  const payload = data as ApiErrorPayload;
  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  const validationMessage = getValidationMessage(payload.detail);
  if (validationMessage) {
    return validationMessage;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return "Une erreur inattendue est survenue.";
};

export const configureApiAuth = (handlers: ApiAuthHandlers): void => {
  authHandlers = handlers;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  headers: {
    Accept: "application/json",
  },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = authHandlers.getAccessToken();

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(
        new ApiError("Une erreur inattendue est survenue."),
      );
    }

    const status = error.response?.status;
    if (status === 401 && authHandlers.getAccessToken()) {
      authHandlers.onUnauthorized();
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return Promise.reject(
        new ApiError(
          "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
          status,
          error.response?.data,
        ),
      );
    }

    if (!error.response) {
      return Promise.reject(
        new ApiError(
          "Impossible de joindre le serveur. Vérifiez votre connexion.",
        ),
      );
    }

    return Promise.reject(
      new ApiError(
        getErrorMessage(error.response.data),
        status,
        error.response.data,
      ),
    );
  },
);
