import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../app/constants";

let accessTokenGetter: (() => string | null) | null = null;
let sessionIdGetter: (() => string | null) | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;
let unauthorizedHandler: (() => void) | null = null;
let errorNotifier: ((message: string) => void) | null = null;

export const configureHttpClient = (config: {
  getAccessToken: () => string | null;
  getSessionId?: () => string | null;
  onRefresh: () => Promise<boolean>;
  onUnauthorized: () => void;
  onError?: (message: string) => void;
}): void => {
  accessTokenGetter = config.getAccessToken;
  sessionIdGetter = config.getSessionId ?? null;
  refreshHandler = config.onRefresh;
  unauthorizedHandler = config.onUnauthorized;
  errorNotifier = config.onError ?? null;
};

const setAuthorization = (request: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = accessTokenGetter?.();
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }

  const requestUrl = String(request.url || "");
  const shouldAttachSessionHeader =
    !requestUrl.includes("/auth/local-login") && !requestUrl.includes("/auth/sso/callback");
  const sessionId = sessionIdGetter?.();
  if (shouldAttachSessionHeader && sessionId) {
    request.headers["x-session-id"] = sessionId;
  }

  return request;
};

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

httpClient.interceptors.request.use(setAuthorization);

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (status === 401 && originalRequest && !(originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry) {
      (originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true;
      if (refreshHandler) {
        const refreshed = await refreshHandler();
        if (refreshed) {
          return httpClient(originalRequest);
        }
      }
      unauthorizedHandler?.();
    }

    if (status === 403) {
      errorNotifier?.("You are not allowed to perform this action.");
    } else {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message ??
        "Unexpected request error";
      errorNotifier?.(message);
    }

    return Promise.reject(error);
  }
);
