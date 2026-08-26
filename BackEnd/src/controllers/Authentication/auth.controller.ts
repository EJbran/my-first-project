import {
  extractRequestInfo,
  getCurrentUserProfile,
  localLogin,
  loginWithEntraToken,
  logout,
  refreshSession
} from "./auth.service";

type RequestLike = {
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: {
    id: number;
  };
  sessionId?: string;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

const extractErrorLogDetails = (error: unknown): Record<string, unknown> => {
  if (!error || typeof error !== "object") {
    return { error };
  }

  const maybeError = error as {
    message?: string;
    name?: string;
    stack?: string;
    original?: { message?: string; code?: string; number?: number; stack?: string };
    parent?: { message?: string; code?: string; number?: number; stack?: string };
  };

  const original = maybeError.original ?? maybeError.parent;
  return {
    name: maybeError.name,
    message: maybeError.message,
    stack: maybeError.stack,
    originalMessage: original?.message,
    originalCode: original?.code,
    originalNumber: original?.number,
    originalStack: original?.stack
  };
};

export const ssoCallback = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const accessToken = String(req.body?.accessToken || "").trim();
    const idToken = String(req.body?.idToken || "").trim() || undefined;
    if (!accessToken) {
      console.error("[AUTH][SSO_CALLBACK] Missing accessToken");
      return res.status(400).json({
        success: false,
        message: "accessToken is required"
      });
    }

    console.info("[AUTH][SSO_CALLBACK] Entra sync started", {
      tokenLength: accessToken.length,
      hasIdToken: Boolean(idToken),
      ipAddress: req.ip || null
    });

    const requestInfo = extractRequestInfo(req);
    const result = await loginWithEntraToken(accessToken, requestInfo, idToken);

    console.info("[AUTH][SSO_CALLBACK] Entra sync OK", {
      userId:
        result.user && typeof result.user === "object" && "Id" in result.user
          ? (result.user as { Id?: unknown }).Id
          : null,
      email:
        result.user && typeof result.user === "object" && "Email" in result.user
          ? (result.user as { Email?: unknown }).Email
          : null,
      roles: Array.isArray(result.roles) ? result.roles.length : 0,
      permissions: Array.isArray(result.permissions) ? result.permissions.length : 0,
      sessionId: result.sessionId
    });

    return res.status(200).json({
      success: true,
      message: "SSO login successful",
      data: result
    });
  } catch (error) {
    console.error("[AUTH][SSO_CALLBACK] Entra sync FAILED", extractErrorLogDetails(error));
    return next(error);
  }
};

export const me = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const profile = await getCurrentUserProfile(req.user.id);
    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutCurrentSession = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    if (!req.user?.id || !req.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await logout(req.user.id, req.sessionId, extractRequestInfo(req));
    return res.status(200).json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const refreshToken = String(req.body?.refreshToken || "");
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "refreshToken is required"
      });
    }

    const data = await refreshSession(refreshToken, extractRequestInfo(req));
    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: {
        sessionId: data.session.Id,
        refreshToken: data.refreshToken
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const localLoginHandler = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const enteredUsername = String(req.body?.username || "").trim();
    const enteredEmail = String(req.body?.email || "").trim();
    const email = String(req.body?.email || req.body?.username || "").trim().toLowerCase();
    const requestedConnection = String(req.body?.connection || "AD").toUpperCase();
    const connection = "AD";
    const domain = String(req.body?.domain || "").trim() || null;
    const requestInfo = extractRequestInfo(req);

    console.info("[AUTH][LOCAL_LOGIN] Attempt", {
      enteredUsername,
      enteredEmail,
      normalizedIdentifier: email,
      email,
      passwordBypassEnabled: true,
      requestedConnection,
      connection,
      domain,
      ipAddress: "192.168.10.77",
      userAgent: requestInfo.userAgent,
      requestId: requestInfo.requestId
    });

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "email is required"
      });
    }

    const result = await localLogin(email, "", requestInfo, {
      connection,
      domain,
      allowEmailOnlyNoPassword: true
    });

    console.info("[AUTH][LOCAL_LOGIN] Success", {
      email,
      connection,
      domain,
      sessionId: result.sessionId,
      userId:
        result.user && typeof result.user === "object" && "Id" in result.user
          ? (result.user as { Id?: unknown }).Id
          : null,
      requestId: requestInfo.requestId
    });

    return res.status(200).json({
      success: true,
      message: "Local login successful",
      data: result
    });
  } catch (error) {
    console.error("[AUTH][LOCAL_LOGIN] Failed", extractErrorLogDetails(error));
    return next(error);
  }
};
