import { Op } from "sequelize";
import { User, UserSession } from "../model/Authentication";
import { getUserPermissions } from "../controllers/Authentication/permission.service";

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  sessionId?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    employeeId?: number;
    departmentId?: number;
    authProvider: string;
    authDomainId?: number;
    externalAuthId?: string;
    permissions?: string[];
  };
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

const normalizeHeaderValue = (value: string | string[] | undefined): string | null => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value) && value[0] && value[0].trim()) {
    return value[0].trim();
  }

  return null;
};

const extractSessionId = (
  headers: Record<string, string | string[] | undefined> | undefined
): string | null => {
  const sessionHeader = normalizeHeaderValue(headers?.["x-session-id"]);
  if (sessionHeader) {
    return sessionHeader;
  }

  const authorization = normalizeHeaderValue(headers?.authorization);
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
};

export const authenticate = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const sessionId = extractSessionId(req.headers);
    if (!sessionId) {
      return res.status(401).json({
        message: "Missing session. Provide x-session-id header."
      });
    }

    const session = await UserSession.findOne({
      where: {
        Id: sessionId,
        IsRevoked: false,
        ExpiresAt: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!session) {
      return res.status(401).json({
        message: "Invalid or expired session"
      });
    }

    const user = await User.findOne({
      where: {
        Id: session.UserId,
        DeletedAt: null,
        IsActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "Session user not found or inactive"
      });
    }

    const permissions = await getUserPermissions(user.Id);

    session.LastUsedAt = new Date();
    await session.save();

    req.user = {
      id: user.Id,
      username: user.Username,
      email: user.Email,
      employeeId: user.EmployeeId ?? undefined,
      departmentId: user.DepartmentId ?? undefined,
      authProvider: user.AuthProvider,
      authDomainId: user.AuthDomainId || undefined,
      externalAuthId: user.ExternalAuthId || undefined,
      permissions: permissions.map((permission) => permission.Code)
    };

    req.sessionId = session.Id;

    return next();
  } catch (error) {
    return next(error);
  }
};
