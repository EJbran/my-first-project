import axios from "axios";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { authApi } from "../api/auth.api";
import { configureHttpClient } from "../api/httpClient";
import { hasEntraConfig, missingEntraConfig, AUTH_BYPASS } from "../app/constants";
import { AuthContext } from "./useAuth";
import type { AuthResult, CredentialLoginPayload, LoginMode } from "./auth.types";
import type { User } from "../types/user.types";
import { clearAuthState, readAuthState, writeAuthState } from "../utils/storage";
import {
  ensureMsalReady,
  loginRequest,
  getRedirectLoginResult,
  clearRedirectLoginResult,
  startMicrosoftLogin,
  hasPendingAuthRedirect,
  ensureMfaOrStepUp
} from "./msalConfig";

const DEV_BYPASS_USER: User = {
  id: "dev-bypass",
  username: "dev.bypass",
  displayName: "Local Dev User",
  email: "dev.bypass@localhost",
  authProvider: "LOCAL",
  isActive: true,
  isLocked: false
};

type ErrorPayload = {
  message?: string;
  error?: string;
  nativeError?: string;
  details?: unknown;
};

const getNativeErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined;
    return (
      payload?.nativeError ||
      payload?.error ||
      payload?.message ||
      error.message ||
      "Connection failed"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Connection failed";
};

const logNativeError = (
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): void => {
  if (axios.isAxiosError(error)) {
    console.error(`[Auth:${context}]`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      method: error.config?.method,
      url: error.config?.url,
      response: error.response?.data,
      stack: error.stack,
      ...meta
    });
    return;
  }

  console.error(`[Auth:${context}]`, {
    error,
    ...(meta || {})
  });
};

const shouldNotifyInCatch = (error: unknown): boolean => !axios.isAxiosError(error);

const isEmployeeEmailLinkError = (error: unknown): boolean => {
  const message = getNativeErrorMessage(error).toLowerCase();
  return (
    message.includes("email is not linked to any employee record") ||
    message.includes("sign-in denied: email is not linked")
  );
};

type BackendAuthUserRecord = Record<string, unknown>;

type BackendAuthResultRecord = {
  user?: BackendAuthUserRecord;
  roles?: unknown;
  permissions?: unknown;
  sessionId?: unknown;
  sessionID?: unknown;
  refreshToken?: unknown;
};

type BackendProfileRecord = {
  user?: BackendAuthUserRecord;
  roles?: unknown;
  permissions?: unknown;
};

const normalizeUser = (user: Record<string, unknown>): User => ({
  id: String(user.Id ?? user.id ?? ""),
  username: String(user.Username ?? user.username ?? ""),
  displayName: String(user.DisplayName ?? user.displayName ?? user.Username ?? user.username ?? "User"),
  email: String(user.Email ?? user.email ?? ""),
  phone: (user.Phone ?? user.phone ?? undefined) as string | undefined,
  profileImageUrl: (user.ProfileImageUrl ?? user.profileImageUrl ?? undefined) as string | undefined,
  userPrincipalName: (user.UserPrincipalName ?? user.userPrincipalName ?? undefined) as string | undefined,
  employeeId: user.EmployeeId != null ? Number(user.EmployeeId) : undefined,
  departmentId:
    user.DepartmentId != null
      ? Number(user.DepartmentId)
      : user.Department_Id != null
        ? Number(user.Department_Id)
        : undefined,
  employeeName: (user.EmployeeName ?? undefined) as string | undefined,
  employeeNameEn: (user.EmployeeName_En ?? undefined) as string | undefined,
  departmentNameAr: (user.DepartmentName_AR ?? undefined) as string | undefined,
  departmentNameEn: (user.DepartmentName_EN ?? undefined) as string | undefined,
  jobTitle: (user.JobTitle ?? user.jobTitle ?? undefined) as string | undefined,
  jobNameAr: (user.Job_Name_AR ?? undefined) as string | undefined,
  jobNameEn: (user.Job_Name_EN ?? undefined) as string | undefined,
  lineLevelNameAr: (user.LineLevelName_AR ?? undefined) as string | undefined,
  lineLevelNameEn: (user.LineLevelName_EN ?? undefined) as string | undefined,
  authProvider: String(user.AuthProvider ?? user.authProvider ?? "LOCAL") as User["authProvider"],
  isActive: Boolean(user.IsActive ?? user.isActive ?? true),
  isLocked: Boolean(user.IsLocked ?? user.isLocked ?? false),
  lastLoginAt: (user.LastLoginAt ?? user.lastLoginAt ?? undefined) as string | undefined
});

const normalizeStringList = (value: unknown, keys: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        for (const key of keys) {
          const candidate = record[key];
          if (typeof candidate === "string" && candidate.trim()) {
            return candidate;
          }
        }
      }
      return "";
    })
    .filter(Boolean);
};

const normalizeAuthResult = (result: BackendAuthResultRecord): AuthResult => ({
  user: normalizeUser(result.user ?? {}),
  roles: normalizeStringList(result.roles, ["Name", "name", "Code", "code"]),
  permissions: normalizeStringList(result.permissions, ["Code", "code", "Name", "name"]),
  sessionId: String(result.sessionId ?? result.sessionID ?? ""),
  refreshToken: (result.refreshToken ?? undefined) as string | undefined
});

const applyResult = (
  result: AuthResult,
  setUser: (value: User | null) => void,
  setRoles: (value: string[]) => void,
  setPermissions: (value: string[]) => void,
  setSessionId: (value: string | null) => void,
  setRefreshToken: (value: string | null) => void,
  mode: LoginMode,
  setLoginMode: (value: LoginMode | null) => void
): void => {
  setUser(result.user);
  setRoles(result.roles);
  setPermissions(result.permissions);
  setSessionId(result.sessionId);
  setRefreshToken(result.refreshToken ?? null);
  setLoginMode(mode);
  writeAuthState({ sessionId: result.sessionId, loginMode: mode });
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const persisted = readAuthState();
  const [isLoading, setIsLoading] = useState(AUTH_BYPASS ? false : Boolean(persisted.sessionId));
  const [user, setUser] = useState<User | null>(AUTH_BYPASS ? DEV_BYPASS_USER : null);
  const [roles, setRoles] = useState<string[]>(AUTH_BYPASS ? ["DevBypass"] : []);
  const [permissions, setPermissions] = useState<string[]>(AUTH_BYPASS ? ["*"] : []);
  const [sessionId, setSessionId] = useState<string | null>(
    AUTH_BYPASS ? "dev-bypass-session" : (persisted.sessionId ?? null)
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<LoginMode | null>(
    AUTH_BYPASS ? "OTHER" : (persisted.loginMode ?? null)
  );

  useEffect(() => {
    if (AUTH_BYPASS || !sessionId) {
      return;
    }

    let cancelled = false;

    const rehydrateSession = async () => {
      setIsLoading(true);
      try {
        const profile = (await authApi.me()) as BackendProfileRecord;
        if (cancelled) {
          return;
        }

        setUser(normalizeUser(profile.user ?? {}));
        setRoles(normalizeStringList(profile.roles, ["Name", "name", "Code", "code"]));
        setPermissions(normalizeStringList(profile.permissions, ["Code", "code", "Name", "name"]));
      } catch {
        if (cancelled) {
          return;
        }

        setUser(null);
        setRoles([]);
        setPermissions([]);
        setSessionId(null);
        setRefreshToken(null);
        setLoginMode(null);
        clearAuthState();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void rehydrateSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const logout = useCallback(async () => {
    if (AUTH_BYPASS) {
      navigate("/dashboard", { replace: true });
      return;
    }

    try {
      await authApi.logout();
    } catch {
      // Ignore backend logout failures during forced sign-out.
    }

    setUser(null);
    setRoles([]);
    setPermissions([]);
    setSessionId(null);
    setAccessToken(null);
    setRefreshToken(null);
    setLoginMode(null);
    clearAuthState();

    navigate("/login", { replace: true });
  }, [navigate]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;
    try {
      const refreshed = await authApi.refresh(refreshToken);
      applyResult(
        refreshed,
        setUser,
        setRoles,
        setPermissions,
        setSessionId,
        setRefreshToken,
        loginMode ?? "LOCAL",
        setLoginMode
      );
      return true;
    } catch {
      return false;
    }
  }, [loginMode, refreshToken]);

  const onUnauthorized = useCallback(() => {
    void logout();
  }, [logout]);

  configureHttpClient({
    getAccessToken: () => accessToken,
    getSessionId: () => sessionId,
    onRefresh: refresh,
    onUnauthorized,
    onError: (message) => enqueueSnackbar(message, { variant: "error" })
  });

  const loginWithCredentials = useCallback(
    async (payload: CredentialLoginPayload) => {
      setIsLoading(true);
      try {
        const result = normalizeAuthResult(await authApi.localLogin(payload) as unknown as BackendAuthResultRecord);
        const mappedMode: LoginMode = result.user.authProvider === "LOCAL" ? "LOCAL" : "AD";
        applyResult(
          result,
          setUser,
          setRoles,
          setPermissions,
          setSessionId,
          setRefreshToken,
          mappedMode,
          setLoginMode
        );
        navigate("/signing-in", { replace: true });
      } catch (error) {
        logNativeError("CREDENTIAL_LOGIN", error, {
          connection: payload.connection,
          username: payload.username,
          domain: payload.domain ?? null
        });

        if (isEmployeeEmailLinkError(error)) {
          navigate("/employee-link-required", {
            replace: true,
            state: {
              attemptedEmail: payload.email || payload.username,
              message: getNativeErrorMessage(error)
            }
          });
          return;
        }

        if (shouldNotifyInCatch(error)) {
          enqueueSnackbar(getNativeErrorMessage(error), { variant: "error" });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [enqueueSnackbar, navigate]
  );

  const completeMicrosoftLogin = useCallback(
    async (accessToken: string, idToken?: string) => {
      console.info("[ENTRA][SYNC] Starting SSO callback / user sync…");

      if (!accessToken) {
        console.error("[ENTRA][SYNC] Failed: missing access token");
        throw new Error("Microsoft access token is missing");
      }

      console.info("[ENTRA][SYNC] Access token received", {
        tokenLength: accessToken.length,
        hasIdToken: Boolean(idToken)
      });

      const raw = (await authApi.ssoCallback(
        accessToken,
        idToken
      )) as unknown as BackendAuthResultRecord;
      const result = normalizeAuthResult(raw);

      const syncOk = Boolean(result.user?.id && result.sessionId);
      console.info("[ENTRA][SYNC] Backend response", {
        syncOk,
        userId: result.user?.id || null,
        username: result.user?.username || null,
        email: result.user?.email || null,
        displayName: result.user?.displayName || null,
        authProvider: result.user?.authProvider || null,
        rolesCount: result.roles.length,
        permissionsCount: result.permissions.length,
        sessionId: result.sessionId || null
      });

      if (!syncOk) {
        console.error("[ENTRA][SYNC] Failed: incomplete sync result", raw);
        throw new Error("Entra sync failed: user/session was not created");
      }

      applyResult(
        result,
        setUser,
        setRoles,
        setPermissions,
        setSessionId,
        setRefreshToken,
        "MICROSOFT",
        setLoginMode
      );

       
      
      navigate("/dashboard", { replace: true });
    },
    [enqueueSnackbar, navigate]
  );

  const acquireMicrosoftAccessToken = useCallback(async (): Promise<string> => {
    const instance = await ensureMsalReady();
    const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
    if (!account) {
      throw new Error("No Microsoft account session found");
    }

    instance.setActiveAccount(account);

    try {
      const silent = await instance.acquireTokenSilent({
        ...loginRequest,
        account
      });
      return silent.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Continue with redirect so Authenticator MFA can complete in the same window.
        await instance.acquireTokenRedirect({
          ...loginRequest,
          account
        });
        return "";
      }
      throw error;
    }
  }, []);

  const loginWithMicrosoft = useCallback(async () => {
    if (!hasEntraConfig()) {
      enqueueSnackbar(
        `Microsoft login is not configured yet. Missing: ${missingEntraConfig().join(", ")}`,
        { variant: "warning" }
      );
      return;
    }

    setIsLoading(true);
    try {
      console.info("[ENTRA][LOGIN] Redirecting to Microsoft (account + Authenticator MFA)…");
      await startMicrosoftLogin();
      // Browser navigates away to login.microsoftonline.com
    } catch (error) {
      console.error("[ENTRA][LOGIN] Failed to start Microsoft redirect", error);
      logNativeError("MICROSOFT_LOGIN", error);
      enqueueSnackbar(getNativeErrorMessage(error), { variant: "error" });
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  const loginLocal = useCallback(
    async (username: string, password: string) => {
      await loginWithCredentials({
        username,
        password,
        connection: "AD"
      });
    },
    [loginWithCredentials]
  );

  useEffect(() => {
    if (!hasEntraConfig() || AUTH_BYPASS) {
      return;
    }

    let cancelled = false;

    const finishRedirectLogin = async () => {
      const pending = hasPendingAuthRedirect();
      try {
        const redirectResult = await getRedirectLoginResult();
        if (cancelled) {
          return;
        }

        if (!redirectResult?.account) {
          if (pending) {
            console.warn("[ENTRA][LOGIN] Returned from Microsoft but no auth result was cached");
          }
          return;
        }

        setIsLoading(true);
        console.info("[ENTRA][LOGIN] Returned from Microsoft with account", {
          account: redirectResult.account.username || redirectResult.account.name
        });

        const mfaStatus = await ensureMfaOrStepUp(redirectResult);
        if (mfaStatus === "stepup") {
          // Browser is redirecting again for Authenticator MFA.
          return;
        }

        const instance = await ensureMsalReady();
        instance.setActiveAccount(redirectResult.account);

        let accessToken = redirectResult.accessToken || "";
        if (!accessToken) {
          console.info("[ENTRA][LOGIN] No access token in redirect result — acquiring silently");
          accessToken = await acquireMicrosoftAccessToken();
          if (!accessToken) {
            return;
          }
        }

        console.info("[ENTRA][LOGIN] MFA OK — calling backend sync");
        await completeMicrosoftLogin(accessToken, redirectResult.idToken);
        clearRedirectLoginResult();
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("[ENTRA][SYNC] Failed after Microsoft return", error);
        logNativeError("MICROSOFT_REDIRECT", error);

        if (isEmployeeEmailLinkError(error)) {
          navigate("/employee-link-required", {
            replace: true,
            state: {
              message: getNativeErrorMessage(error)
            }
          });
          return;
        }

        enqueueSnackbar(getNativeErrorMessage(error), { variant: "error" });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void finishRedirectLogin();

    return () => {
      cancelled = true;
    };
  }, [acquireMicrosoftAccessToken, completeMicrosoftLogin, enqueueSnackbar]);

  const hasPermission = useCallback(
    (permissionCode: string) => AUTH_BYPASS || permissions.includes(permissionCode),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => AUTH_BYPASS || codes.some((code) => permissions.includes(code)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (codes: string[]) => AUTH_BYPASS || codes.every((code) => permissions.includes(code)),
    [permissions]
  );

  const value = useMemo(
    () => ({
      isAuthenticated: AUTH_BYPASS || Boolean(user && sessionId),
      isLoading,
      user,
      roles,
      permissions,
      sessionId,
      loginMode,
      loginWithCredentials,
      loginWithMicrosoft,
      loginLocal,
      logout,
      refresh,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions
    }),
    [
      hasAllPermissions,
      hasAnyPermission,
      hasPermission,
      isLoading,
      loginLocal,
      loginMode,
      loginWithCredentials,
      loginWithMicrosoft,
      logout,
      permissions,
      refresh,
      roles,
      sessionId,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
