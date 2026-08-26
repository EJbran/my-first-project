import {
  BrowserAuthError,
  PublicClientApplication,
  type AuthenticationResult,
  type Configuration,
  type RedirectRequest
} from "@azure/msal-browser";
import { ENTRA_API_SCOPE, ENTRA_AUTHORITY, ENTRA_CLIENT_ID, hasEntraConfig } from "../app/constants";

const loginRedirectUri = `${window.location.origin}/login`;
const MFA_STEPUP_FLAG = "herp.entra.mfa.stepup";

/**
 * Prefer Microsoft Authenticator (code/push). Claims ask for otp when possible.
 * Windows Hello face/PIN must not be accepted as MFA for this app.
 */
const authenticatorMfaClaims = JSON.stringify({
  id_token: {
    amr: {
      essential: true,
      values: ["otp", "mfa"]
    }
  },
  access_token: {
    amr: {
      essential: true,
      values: ["otp", "mfa"]
    }
  }
});

const WINDOWS_HELLO_AMR = new Set([
  "ngcmfa",
  "face",
  "fingerprint",
  "iris",
  "wia",
  "wiaormultiauthn",
  "hello"
]);

const AUTHENTICATOR_OK_AMR = new Set(["otp", "sms", "phone", "mfa"]);

const msalConfig: Configuration = {
  auth: {
    clientId: ENTRA_CLIENT_ID,
    authority: ENTRA_AUTHORITY,
    redirectUri: loginRedirectUri,
    postLogoutRedirectUri: loginRedirectUri
  },
  cache: {
    cacheLocation: "sessionStorage"
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest: RedirectRequest = {
  scopes: [
    ...(ENTRA_API_SCOPE ? [ENTRA_API_SCOPE] : []),
    "openid",
    "profile",
    "offline_access"
  ],
  redirectUri: loginRedirectUri,
  redirectStartPage: loginRedirectUri,
  // Force fresh interactive auth (do not silently reuse Windows Hello session).
  prompt: "login",
  claims: authenticatorMfaClaims,
  extraQueryParameters: {
    // OIDC: re-authenticate now (helps avoid cached Windows Hello MFA).
    max_age: "0"
  }
};

let msalBootstrapPromise: Promise<AuthenticationResult | null> | null = null;
let redirectResultCache: AuthenticationResult | null = null;
let redirectProcessingPromise: Promise<AuthenticationResult | null> | null = null;

const getErrorCode = (error: unknown): string => {
  if (error instanceof BrowserAuthError) {
    return error.errorCode;
  }
  if (error && typeof error === "object" && "errorCode" in error) {
    return String((error as { errorCode?: unknown }).errorCode || "");
  }
  const message = error instanceof Error ? error.message : String(error);
  return message;
};

const isNoTokenRequestCacheError = (error: unknown): boolean =>
  getErrorCode(error).toLowerCase().includes("no_token_request_cache_error");

export const hasPendingAuthRedirect = (): boolean => {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("code=") ||
    hash.includes("error=") ||
    search.includes("code=") ||
    search.includes("error=")
  );
};

const cleanAuthResponseFromUrl = (): void => {
  const url = new URL(window.location.href);
  const authParams = [
    "code",
    "state",
    "session_state",
    "error",
    "error_description",
    "client_info",
    "iss"
  ];

  let changed = false;
  authParams.forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  });

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (
    hash.includes("code=") ||
    hash.includes("error=") ||
    hash.includes("client_info=") ||
    hash.includes("state=")
  ) {
    url.hash = "";
    changed = true;
  }

  if (changed) {
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }
};

const clearInteractionStatusOnly = (): void => {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.toLowerCase().includes("interaction.status"))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const collectAmrValues = (...tokens: Array<string | null | undefined>): string[] => {
  const values: string[] = [];
  for (const token of tokens) {
    if (!token) {
      continue;
    }
    const payload = decodeJwtPayload(token);
    if (!payload) {
      continue;
    }
    const amr = payload.amr;
    if (Array.isArray(amr)) {
      amr.forEach((value) => values.push(String(value).toLowerCase()));
    } else if (typeof amr === "string" && amr.trim()) {
      values.push(amr.toLowerCase());
    }
  }
  return [...new Set(values)];
};

/**
 * Accept Microsoft Authenticator (otp/sms/mfa push).
 * Reject Windows Hello face/PIN even if Entra marks it as MFA.
 */
export const tokenIncludesAuthenticatorMfa = (
  ...tokens: Array<string | null | undefined>
): boolean => {
  const amrValues = collectAmrValues(...tokens);
  if (!amrValues.length) {
    return false;
  }

  const usedWindowsHello = amrValues.some((value) => WINDOWS_HELLO_AMR.has(value));
  if (usedWindowsHello) {
    return false;
  }

  return amrValues.some((value) => AUTHENTICATOR_OK_AMR.has(value));
};

export const bootstrapMsal = async (): Promise<AuthenticationResult | null> => {
  if (!hasEntraConfig()) {
    return null;
  }

  if (!msalBootstrapPromise) {
    msalBootstrapPromise = (async () => {
      await msalInstance.initialize();

      let result: AuthenticationResult | null = null;
      try {
        result = await msalInstance.handleRedirectPromise({
          navigateToLoginRequestUrl: false
        });
        if (result) {
          const amrValues = collectAmrValues(result.idToken, result.accessToken);
          console.info("[MSAL] Redirect login response received", {
            account: result.account?.username || result.account?.name || null,
            hasAccessToken: Boolean(result.accessToken),
            hasIdToken: Boolean(result.idToken),
            amr: amrValues,
            authenticatorMfaOk: tokenIncludesAuthenticatorMfa(
              result.idToken,
              result.accessToken
            ),
            scopes: result.scopes
          });
        }
      } catch (error) {
        if (isNoTokenRequestCacheError(error)) {
          console.warn("[MSAL] Ignoring stale redirect response:", error);
          cleanAuthResponseFromUrl();
          clearInteractionStatusOnly();
          result = null;
        } else {
          throw error;
        }
      }

      redirectResultCache = result;
      if (result?.account) {
        msalInstance.setActiveAccount(result.account);
      } else {
        const existing = msalInstance.getAllAccounts()[0];
        if (existing) {
          msalInstance.setActiveAccount(existing);
        }
      }
      return result;
    })().catch((error) => {
      console.error("[MSAL] bootstrap failed", error);
      msalBootstrapPromise = null;
      throw error;
    });
  }

  return msalBootstrapPromise;
};

export const ensureMsalReady = async (): Promise<PublicClientApplication> => {
  await bootstrapMsal();
  return msalInstance;
};

export const getRedirectLoginResult = async (): Promise<AuthenticationResult | null> => {
  if (!redirectProcessingPromise) {
    redirectProcessingPromise = (async () => {
      await bootstrapMsal();
      return redirectResultCache;
    })();
  }
  return redirectProcessingPromise;
};

export const clearRedirectLoginResult = (): void => {
  redirectResultCache = null;
};

export const startMicrosoftLogin = async (): Promise<"redirect"> => {
  const instance = await ensureMsalReady();

  cleanAuthResponseFromUrl();
  clearInteractionStatusOnly();
  sessionStorage.removeItem(MFA_STEPUP_FLAG);

  console.info("[MSAL] Starting loginRedirect forced Authenticator MFA (block Windows Hello)", {
    redirectUri: loginRedirectUri,
    authority: ENTRA_AUTHORITY,
    scopes: loginRequest.scopes,
    prompt: loginRequest.prompt
  });

  await instance.loginRedirect(loginRequest);
  return "redirect";
};

/**
 * If Windows Hello was used, force another challenge for Microsoft Authenticator.
 */
export const ensureMfaOrStepUp = async (
  result: AuthenticationResult
): Promise<"ok" | "stepup"> => {
  const amrValues = collectAmrValues(result.idToken, result.accessToken);
  const mfaOk = tokenIncludesAuthenticatorMfa(result.idToken, result.accessToken);
  const usedWindowsHello = amrValues.some((value) => WINDOWS_HELLO_AMR.has(value));

  console.info("[MSAL] Authenticator MFA check", {
    mfaOk,
    usedWindowsHello,
    amr: amrValues,
    account: result.account?.username || null
  });

  if (mfaOk) {
    sessionStorage.removeItem(MFA_STEPUP_FLAG);
    return "ok";
  }

  if (sessionStorage.getItem(MFA_STEPUP_FLAG) === "1") {
    sessionStorage.removeItem(MFA_STEPUP_FLAG);
    throw new Error(
      usedWindowsHello
        ? "Windows Hello face/PIN is not allowed. Use Microsoft Authenticator (Approve / Enter code), then try again. If Hello keeps appearing, ask IT to require Authentication Strength = Microsoft Authenticator for HERP-IMS-SPA."
        : "Microsoft Authenticator MFA is required. Approve the sign-in in Authenticator (or enter the 6-digit code), then try again."
    );
  }

  const instance = await ensureMsalReady();
  if (!result.account) {
    throw new Error("No Microsoft account available for Authenticator step-up");
  }

  sessionStorage.setItem(MFA_STEPUP_FLAG, "1");
  console.warn("[MSAL] MFA missing or Windows Hello used — forcing Authenticator step-up", {
    amr: amrValues
  });

  await instance.acquireTokenRedirect({
    ...loginRequest,
    account: result.account,
    prompt: "login",
    claims: authenticatorMfaClaims,
    extraQueryParameters: {
      max_age: "0"
    }
  });

  return "stepup";
};
