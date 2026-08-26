import bcrypt from "bcryptjs";
import crypto from "crypto";
import ldap from "ldapjs";
import { Op, Transaction, col, fn, where as sequelizeWhere } from "sequelize";
import {
  AuthDomain,
  SecurityPolicy,
  User,
  UserRole,
  UserSession,
  sequelize
} from "../../model/Authentication";
import { Department } from "../../model/General";
import { Employee, Job, LineLevel, Position } from "../../model/HR";
import { recordAudit, recordLoginAttempt, RequestInfo } from "./audit.service";
import { getGroupIdsFromTokenClaims, syncEntraGroupsToRoles } from "./entraGroup.service";
import type { EntraClaims } from "./entraToken.service";
import { verifyEntraAccessToken } from "./entraToken.service";
import { findOrCreateUserFromEntraClaims } from "./entraUserSync.service";
import { getUserPermissions, getUserRoles } from "./permission.service";
import { sanitizeUser } from "../../utils/Authentication/sanitize";

const hashRefreshToken = (refreshToken: string): Buffer =>
  crypto.createHash("sha256").update(refreshToken).digest();

const createRefreshToken = (): string => crypto.randomBytes(48).toString("hex");

const isMissingSecurityPoliciesTableError = (error: unknown): boolean => {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message || "")
      : "";

  return (
    message.includes("Invalid object name") &&
    (message.includes("SecurityPolicies") || message.includes("dbo.SecurityPolicies"))
  );
};

const getPolicyValue = async (code: string, defaultValue: string): Promise<string> => {
  try {
    const policy = await SecurityPolicy.findOne({ where: { PolicyCode: code, IsActive: true } });
    return policy?.PolicyValue ?? defaultValue;
  } catch (error) {
    if (isMissingSecurityPoliciesTableError(error)) {
      console.warn(
        `SecurityPolicies table is missing; using default value for policy ${code}`
      );
      return defaultValue;
    }

    throw error;
  }
};

const getBooleanPolicy = async (code: string, defaultValue: boolean): Promise<boolean> => {
  const value = await getPolicyValue(code, String(defaultValue));
  return String(value).toLowerCase() === "true";
};

const getNumberPolicy = async (code: string, defaultValue: number): Promise<number> => {
  const value = Number(await getPolicyValue(code, String(defaultValue)));
  return Number.isFinite(value) ? value : defaultValue;
};

const ensureUserIsActive = (user: User): void => {
  if (!user.IsActive) {
    throw new Error("User is inactive");
  }
};

const ensureUserCanLogin = (user: User): void => {
  ensureUserIsActive(user);

  if (user.IsLocked && user.LockoutUntil && user.LockoutUntil > new Date()) {
    throw new Error("User account is locked");
  }
};

const ensureEmployeeEmailExists = async (email: string): Promise<void> => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Sign-in denied: user email is missing");
  }

  const employee = await Employee.findOne({
    where: sequelizeWhere(
      fn("LOWER", fn("LTRIM", fn("RTRIM", col("Email")))),
      normalizedEmail
    ),
    attributes: ["ID_Employee"]
  });

  if (!employee) {
    throw new Error("Sign-in denied: email is not linked to any employee record");
  }
};

const createSession = async (
  userId: number,
  refreshToken: string,
  requestInfo: RequestInfo,
  transaction: Transaction
): Promise<UserSession> => {
  const refreshTokenDays = Number(process.env.REFRESH_TOKEN_DAYS || 7);
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  return UserSession.create(
    {
      UserId: userId,
      RefreshTokenHash: hashRefreshToken(refreshToken),
      IpAddress: requestInfo.ipAddress ?? null,
      UserAgent: requestInfo.userAgent ?? null,
      ExpiresAt: expiresAt,
      IsRevoked: false,
      LastUsedAt: new Date()
    },
    { transaction }
  );
};

const mapRoleDto = (roles: Awaited<ReturnType<typeof getUserRoles>>) =>
  roles.map((role) => ({
    Id: role.Id,
    Name: role.Name,
    Description: role.Description
  }));

const mapPermissionDto = (permissions: Awaited<ReturnType<typeof getUserPermissions>>) =>
  permissions.map((permission) => ({
    Id: permission.Id,
    Code: permission.Code,
    Module: permission.Module,
    ActionName: permission.ActionName,
    Description: permission.Description
  }));

const bindWithLdap = async (
  ldapUrl: string,
  principal: string,
  password: string
): Promise<void> => {
  const client = ldap.createClient({
    url: ldapUrl,
    timeout: 10000,
    connectTimeout: 10000,
    idleTimeout: 10000
  });

  await new Promise<void>((resolve, reject) => {
    client.bind(principal, password, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  }).finally(() => {
    client.unbind();
  });
};

const getLdapConnectionSettings = async (requestedDomain: string | null) => {
  const domain = requestedDomain?.trim() || null;
  const authDomain = domain
    ? await AuthDomain.findOne({
        where: {
          DomainName: domain,
          IsActive: true
        }
      })
    : null;

  const ldapServer =
    authDomain?.LdapServer?.trim() || String(process.env.AD_LDAP_SERVER || "").trim();
  const ldapPort = Number(authDomain?.LdapPort || process.env.AD_LDAP_PORT || 389);
  const useTls =
    authDomain?.AuthMethod === "LDAPS" ||
    String(process.env.AD_LDAP_USE_TLS || "false").toLowerCase() === "true";

  if (!ldapServer) {
    throw new Error("AD authentication is not configured (missing LDAP server)");
  }

  return {
    authDomain,
    ldapUrl: `${useTls ? "ldaps" : "ldap"}://${ldapServer}:${ldapPort}`,
    requestedDomain: domain
  };
};

const buildLdapBindPrincipals = (
  identifierVariants: string[],
  requestedDomain: string | null,
  netbiosName: string | null
): string[] => {
  const principals = new Set<string>();

  for (const identifier of identifierVariants) {
    if (!identifier) continue;

    principals.add(identifier);

    if (identifier.includes("@") || identifier.includes("\\")) {
      continue;
    }

    if (requestedDomain) {
      principals.add(`${identifier}@${requestedDomain}`);
      principals.add(`${requestedDomain}\\${identifier}`);
    }

    if (netbiosName) {
      principals.add(`${netbiosName}\\${identifier}`);
    }
  }

  return Array.from(principals);
};

const verifyAdPassword = async (
  usernameOrEmail: string,
  password: string,
  requestedDomain: string | null
): Promise<void> => {
  const lowerIdentifier = usernameOrEmail.trim().toLowerCase();
  const identifierVariants = Array.from(
    new Set(
      [
        lowerIdentifier,
        lowerIdentifier.includes("\\") ? lowerIdentifier.split("\\").pop() || "" : "",
        lowerIdentifier.includes("@") ? lowerIdentifier.split("@")[0] : ""
      ].filter(Boolean)
    )
  );

  const settings = await getLdapConnectionSettings(requestedDomain);
  const principals = buildLdapBindPrincipals(
    identifierVariants,
    settings.requestedDomain,
    settings.authDomain?.NetbiosName || null
  );

  let lastError: unknown = null;
  for (const principal of principals) {
    try {
      await bindWithLdap(settings.ldapUrl, principal, password);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  const ldapMessage =
    typeof lastError === "object" && lastError && "message" in lastError
      ? String((lastError as { message?: string }).message || "")
      : "";

  if (ldapMessage) {
    console.warn("AD bind rejected credentials", {
      domain: settings.requestedDomain,
      ldapUrl: settings.ldapUrl,
      reason: ldapMessage
    });
  }

  throw new Error("Invalid username or password");
};

const AUTHENTICATOR_OK_AMR = new Set(["otp", "sms", "phone", "mfa"]);
const WINDOWS_HELLO_AMR = new Set([
  "ngcmfa",
  "face",
  "fingerprint",
  "iris",
  "wia",
  "wiaormultiauthn",
  "hello"
]);

const collectAmrValues = (claims: EntraClaims, idTokenPayload?: Record<string, unknown> | null): string[] => {
  const values: string[] = [];
  const pushAmr = (amr: unknown) => {
    if (Array.isArray(amr)) {
      amr.forEach((value) => values.push(String(value).toLowerCase()));
    } else if (typeof amr === "string" && amr.trim()) {
      values.push(amr.toLowerCase());
    }
  };

  pushAmr(claims.amr);
  pushAmr(idTokenPayload?.amr);
  return [...new Set(values)];
};

const tokenSatisfiesAuthenticatorMfa = (
  claims: EntraClaims,
  idTokenPayload?: Record<string, unknown> | null
): { ok: boolean; usedWindowsHello: boolean; hasAuthenticatorMethod: boolean; amrValues: string[] } => {
  const amrValues = collectAmrValues(claims, idTokenPayload);
  const usedWindowsHello = amrValues.some((value) => WINDOWS_HELLO_AMR.has(value));
  const hasAuthenticatorMethod = amrValues.some((value) => AUTHENTICATOR_OK_AMR.has(value));
  // Authenticator push/code is ok; Windows Hello is never "ok" by itself.
  const ok = hasAuthenticatorMethod && !usedWindowsHello;
  return { ok, usedWindowsHello, hasAuthenticatorMethod, amrValues };
};

const decodeJwtPayloadUnsafe = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const loginWithEntraToken = async (
  token: string,
  requestInfo: RequestInfo,
  idToken?: string
): Promise<{
  user: Record<string, unknown>;
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
  sessionId: string;
  refreshToken: string;
}> => {
  const claims = await verifyEntraAccessToken(token);
  const idTokenPayload = idToken ? decodeJwtPayloadUnsafe(idToken) : null;
  const mfaResult = tokenSatisfiesAuthenticatorMfa(claims, idTokenPayload);

  console.info("[AUTH][ENTRA_SYNC] Token verified", {
    oid: claims.oid,
    tid: claims.tid,
    email: claims.email || claims.preferred_username || claims.upn || null,
    name: claims.name || null,
    groupClaims: claims.groups.length,
    amr: mfaResult.amrValues
  });

  const requireEntraMfa =
    String(process.env.REQUIRE_ENTRA_MFA || "true").toLowerCase() === "true" ||
    (await getBooleanPolicy("REQUIRE_ENTRA_MFA", true));

  // Block Windows Hello always when MFA is required.
  // Accept Authenticator push/code (amr includes mfa/otp/sms).
  const blockWindowsHello =
    String(process.env.REQUIRE_ENTRA_BLOCK_WINDOWS_HELLO || "true").toLowerCase() === "true";

  console.info("[AUTH][ENTRA_SYNC] Authenticator MFA check", {
    requireEntraMfa,
    blockWindowsHello,
    mfaOk: mfaResult.ok,
    usedWindowsHello: mfaResult.usedWindowsHello,
    amr: mfaResult.amrValues,
    hasIdToken: Boolean(idToken)
  });

  if (blockWindowsHello && mfaResult.usedWindowsHello) {
    console.warn("[AUTH][ENTRA_SYNC] Windows Hello blocked", {
      amr: mfaResult.amrValues
    });
    throw new Error(
      "Windows Hello face/PIN is not allowed. Use Microsoft Authenticator (Approve or Enter code)."
    );
  }

  const mfaSatisfied =
    mfaResult.ok || (mfaResult.usedWindowsHello && !blockWindowsHello);

  if (requireEntraMfa && !mfaSatisfied) {
    console.warn("[AUTH][ENTRA_SYNC] Authenticator MFA required but not satisfied", {
      amr: mfaResult.amrValues,
      usedWindowsHello: mfaResult.usedWindowsHello
    });
    throw new Error(
      "Microsoft Authenticator MFA is required. Approve the sign-in in Authenticator or enter the 6-digit code."
    );
  }

  const synced = await sequelize.transaction(async (transaction: Transaction) => {
    const user = await findOrCreateUserFromEntraClaims(claims, transaction);
    ensureUserCanLogin(user);
    await ensureEmployeeEmailExists(user.Email);
    console.info("[AUTH][ENTRA_SYNC] User synced", {
      userId: user.Id,
      username: user.Username,
      email: user.Email,
      authDomainId: user.AuthDomainId,
      authProvider: user.AuthProvider
    });

    const groupIds = await getGroupIdsFromTokenClaims(claims, token);
    if (user.AuthDomainId && groupIds.length) {
      await syncEntraGroupsToRoles(user.Id, user.AuthDomainId, groupIds, transaction);
      console.info("[AUTH][ENTRA_SYNC] Groups synced to roles", {
        userId: user.Id,
        groupCount: groupIds.length
      });
    } else {
      console.info("[AUTH][ENTRA_SYNC] No groups to sync", {
        userId: user.Id,
        authDomainId: user.AuthDomainId,
        groupCount: groupIds.length
      });
    }

    user.LastLoginAt = new Date();
    await user.save({ transaction });

    const refreshToken = createRefreshToken();
    const session = await createSession(user.Id, refreshToken, requestInfo, transaction);

    return {
      user,
      sessionId: session.Id,
      refreshToken,
      groupCount: groupIds.length,
      oid: claims.oid,
      tid: claims.tid
    };
  });

  // After commit: avoid lock/pool deadlocks with LoginAttempt/Audit FK checks.
  try {
    await recordLoginAttempt({
      userId: synced.user.Id,
      username: synced.user.Username,
      email: synced.user.Email,
      authProvider: "SSO",
      isSuccessful: true,
      requestInfo
    });
  } catch (error) {
    console.warn("[AUTH][ENTRA_SYNC] recordLoginAttempt failed (non-blocking)", error);
  }

  try {
    await recordAudit({
      actorUserId: synced.user.Id,
      action: "AUTH_SSO_LOGIN",
      module: "AUTH",
      entityName: "User",
      entityId: String(synced.user.Id),
      status: "SUCCESS",
      newData: {
        oid: synced.oid,
        tid: synced.tid,
        authDomainId: synced.user.AuthDomainId,
        groupCount: synced.groupCount
      },
      requestInfo
    });
  } catch (error) {
    console.warn("[AUTH][ENTRA_SYNC] recordAudit failed (non-blocking)", error);
  }

  const roles = await getUserRoles(synced.user.Id);
  const permissions = await getUserPermissions(synced.user.Id);

  console.info("[AUTH][ENTRA_SYNC] Session created", {
    userId: synced.user.Id,
    sessionId: synced.sessionId,
    roles: roles.length,
    permissions: permissions.length,
    groupCount: synced.groupCount
  });

  return {
    user: sanitizeUser(synced.user),
    roles: mapRoleDto(roles),
    permissions: mapPermissionDto(permissions),
    sessionId: synced.sessionId,
    refreshToken: synced.refreshToken
  };
};

export const getCurrentUserProfile = async (userId: number): Promise<{
  user: Record<string, unknown>;
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
}> => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }

  ensureUserCanLogin(user);

  const roles = await getUserRoles(userId);
  const permissions = await getUserPermissions(userId);

  const safeUser = sanitizeUser(user);
  let enrichedUser: Record<string, unknown> = { ...safeUser };

  if (user.EmployeeId || user.DepartmentId || user.DisplayName || user.Username || user.Email) {
    let employee = null;

    if (user.Email && String(user.Email).trim()) {
      const normalizedEmail = String(user.Email).trim().toLowerCase();
      employee = await Employee.findOne({
        where: sequelizeWhere(
          fn("LOWER", fn("LTRIM", fn("RTRIM", col("Email")))),
          normalizedEmail
        ),
        attributes: ["ID_Employee", "EmployeeName", "EmployeeName_En", "Ref_Employee", "Department_Id", "Email", "Phone"]
      });
    }

    if (user.EmployeeId) {
      if (!employee) {
        employee = await Employee.findByPk(user.EmployeeId, {
          attributes: ["ID_Employee", "EmployeeName", "EmployeeName_En", "Ref_Employee", "Department_Id", "Email", "Phone"]
        });
      }

      // Some environments store Users.EmployeeId as Employee.Ref_Employee.
      if (!employee) {
        employee = await Employee.findOne({
          where: { Ref_Employee: String(user.EmployeeId) },
          attributes: ["ID_Employee", "EmployeeName", "EmployeeName_En", "Ref_Employee", "Department_Id", "Email", "Phone"]
        });
      }

      // Fallback for padded/whitespace Ref_Employee values (e.g. ' 04366 ').
      if (!employee && Number.isFinite(Number(user.EmployeeId))) {
        employee = await Employee.findOne({
          where: sequelize.literal(
            `TRY_CAST(LTRIM(RTRIM(CAST([Employee].[Ref_Employee] AS NVARCHAR(50)))) AS BIGINT) = ${Number(user.EmployeeId)}`
          ),
          attributes: ["ID_Employee", "EmployeeName", "EmployeeName_En", "Ref_Employee", "Department_Id", "Email", "Phone"]
        });
      }
    }

    // Final fallback: match current user display name to EmployeeName_En.
    if (!employee && user.DisplayName && String(user.DisplayName).trim()) {
      const displayName = String(user.DisplayName).trim().toLowerCase();
      const candidates = await Employee.findAll({
        where: {
          EmployeeName_En: { [Op.like]: `%${String(user.DisplayName).trim()}%` }
        },
        attributes: ["ID_Employee", "EmployeeName", "EmployeeName_En", "Ref_Employee", "Department_Id", "Email", "Phone"],
        limit: 5
      });

      employee =
        candidates.find((candidate) =>
          String(candidate.getDataValue("EmployeeName_En") || "").trim().toLowerCase() === displayName
        ) ??
        candidates.find((candidate) =>
          String(candidate.getDataValue("EmployeeName_En") || "").trim().toLowerCase().includes(displayName)
        ) ??
        null;
    }

    // Extra fallback: derive a loose human name from username/email and match EmployeeName_En.
    if (!employee) {
      const rawUserToken = String(user.Username || user.Email || "")
        .toLowerCase()
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .trim();

      if (rawUserToken) {
        const tokens = rawUserToken.split(/\s+/).filter(Boolean);
        const firstToken = tokens[0] || rawUserToken;

        const candidates = await Employee.findAll({
          where: {
            EmployeeName_En: { [Op.like]: `%${firstToken}%` }
          },
          attributes: ["ID_Employee", "EmployeeName", "EmployeeName_En", "Ref_Employee", "Department_Id", "Email", "Phone"],
          limit: 20
        });

        employee =
          candidates.find((candidate) => {
            const name = String(candidate.getDataValue("EmployeeName_En") || "")
              .toLowerCase()
              .trim();
            return tokens.every((token) => name.includes(token));
          }) ??
          candidates.find((candidate) =>
            String(candidate.getDataValue("EmployeeName_En") || "")
              .toLowerCase()
              .includes(firstToken)
          ) ??
          null;
      }
    }

    const employeeIdForPosition = employee?.getDataValue("ID_Employee") ?? null;

    let currentPosition = null;
    if (employeeIdForPosition) {
      currentPosition = await Position.findOne({
        where: {
          EmployeeId: employeeIdForPosition,
          Job_ID: { [Op.ne]: null }
        },
        attributes: ["Id", "EmployeeId", "Job_ID", "LineLevelId"],
        include: [
          {
            model: Job,
            as: "Job",
            attributes: ["Job_Name_AR", "Job_Name_EN"],
            required: false
          },
          {
            model: LineLevel,
            as: "LineLevel",
            attributes: ["Line_ID", "SortLine", "ArabicDescription", "EnglishDescription"],
            required: false
          }
        ],
        order: [["Id", "DESC"]]
      });

      if (!currentPosition) {
        currentPosition = await Position.findOne({
          where: { EmployeeId: employeeIdForPosition },
          attributes: ["Id", "EmployeeId", "Job_ID", "LineLevelId"],
          include: [
            {
              model: Job,
              as: "Job",
              attributes: ["Job_Name_AR", "Job_Name_EN"],
              required: false
            },
            {
              model: LineLevel,
              as: "LineLevel",
              attributes: ["Line_ID", "SortLine", "ArabicDescription", "EnglishDescription"],
              required: false
            }
          ],
          order: [["Id", "DESC"]]
        });
      }
    }

    const employeePlain = employee?.get({ plain: true }) as {
      ID_Employee?: number;
      EmployeeName?: string | null;
      EmployeeName_En?: string | null;
      Ref_Employee?: string | null;
      Department_Id?: number | null;
      Phone?: string | null;
    } | undefined;

    const positionPlain = currentPosition?.get({ plain: true }) as {
      Job?: { Job_Name_AR?: string | null; Job_Name_EN?: string | null };
      LineLevel?: {
        Line_ID?: number;
        SortLine?: number | null;
        ArabicDescription?: string | null;
        EnglishDescription?: string | null;
      };
    } | undefined;

    const departmentId = employeePlain?.Department_Id ?? user.DepartmentId ?? null;
    const department = departmentId
      ? await Department.findByPk(departmentId, {
          attributes: ["Id", "DepartmentName_Arabic", "DepartmentName_English"]
        })
      : null;

    const departmentPlain = department?.get({ plain: true }) as {
      DepartmentName_Arabic?: string | null;
      DepartmentName_English?: string | null;
    } | undefined;

    enrichedUser = {
      ...safeUser,
      EmployeeName: employeePlain?.EmployeeName ?? null,
      EmployeeName_En: employeePlain?.EmployeeName_En ?? null,
      Ref_Employee: employeePlain?.Ref_Employee ?? null,
      Phone: employeePlain?.Phone ?? safeUser.Phone ?? null,
      Department_Id: departmentId,
      DepartmentName_AR: departmentPlain?.DepartmentName_Arabic ?? null,
      DepartmentName_EN: departmentPlain?.DepartmentName_English ?? null,
      Job_Name_AR: positionPlain?.Job?.Job_Name_AR ?? null,
      Job_Name_EN: positionPlain?.Job?.Job_Name_EN ?? null,
      LineLevelId: positionPlain?.LineLevel?.Line_ID ?? null,
      LineLevelSort: positionPlain?.LineLevel?.SortLine ?? null,
      LineLevelName_AR: positionPlain?.LineLevel?.ArabicDescription ?? null,
      LineLevelName_EN: positionPlain?.LineLevel?.EnglishDescription ?? null
    };
  }

  return {
    user: enrichedUser,
    roles: mapRoleDto(roles),
    permissions: mapPermissionDto(permissions)
  };
};

export const logout = async (
  userId: number,
  sessionId: string,
  requestInfo: RequestInfo
): Promise<void> => {
  const session = await UserSession.findOne({
    where: {
      Id: sessionId,
      UserId: userId,
      IsRevoked: false
    }
  });

  if (!session) {
    return;
  }

  session.IsRevoked = true;
  session.RevokedAt = new Date();
  session.RevokedReason = "LOGOUT";
  await session.save();

  await recordAudit({
    actorUserId: userId,
    action: "AUTH_LOGOUT",
    module: "AUTH",
    entityName: "UserSession",
    entityId: sessionId,
    status: "SUCCESS",
    requestInfo
  });
};

export const refreshSession = async (
  refreshToken: string,
  requestInfo: RequestInfo
): Promise<{ refreshToken: string; session: UserSession }> => {
  const incomingHash = hashRefreshToken(refreshToken);

  const session = await UserSession.findOne({
    where: {
      RefreshTokenHash: incomingHash,
      IsRevoked: false,
      ExpiresAt: {
        [Op.gt]: new Date()
      }
    }
  });

  if (!session) {
    throw new Error("Invalid refresh token");
  }

  return sequelize.transaction(async (transaction: Transaction) => {
    session.IsRevoked = true;
    session.RevokedAt = new Date();
    session.RevokedReason = "TOKEN_ROTATION";
    await session.save({ transaction });

    const nextRefreshToken = createRefreshToken();
    const newSession = await createSession(session.UserId, nextRefreshToken, requestInfo, transaction);

    session.ReplacedBySessionId = newSession.Id;
    await session.save({ transaction });

    await recordAudit({
      actorUserId: session.UserId,
      action: "AUTH_REFRESH_TOKEN_ROTATION",
      module: "AUTH",
      entityName: "UserSession",
      entityId: session.Id,
      status: "SUCCESS",
      newData: {
        newSessionId: newSession.Id
      },
      requestInfo
    });

    return {
      refreshToken: nextRefreshToken,
      session: newSession
    };
  });
};

export const localLogin = async (
  usernameOrEmail: string,
  password: string,
  requestInfo: RequestInfo,
  options?: {
    connection?: string;
    domain?: string | null;
    allowEmailOnlyNoPassword?: boolean;
  }
): Promise<{
  user: Record<string, unknown>;
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
  sessionId: string;
  refreshToken: string;
}> => {
  const lowerIdentifier = usernameOrEmail.trim().toLowerCase();
  const identifierVariants = Array.from(
    new Set(
      [
        lowerIdentifier,
        lowerIdentifier.includes("\\") ? lowerIdentifier.split("\\").pop() || "" : "",
        lowerIdentifier.includes("@") ? lowerIdentifier.split("@")[0] : ""
      ].filter(Boolean)
    )
  );
  const requestedConnection = String(options?.connection || "LOCAL").toUpperCase();
  const requestedDomain = options?.domain?.trim() || null;
  const allowEmailOnlyNoPassword = Boolean(options?.allowEmailOnlyNoPassword);

  if (requestedConnection !== "AD") {
    throw new Error("Only Local Active Directory login is allowed");
  }

  if (requestedConnection === "AD") {
    const isEmailIdentifier = lowerIdentifier.includes("@");

    if (!allowEmailOnlyNoPassword) {
      await verifyAdPassword(lowerIdentifier, password, requestedDomain);
    } else if (!isEmailIdentifier) {
      throw new Error("Email format is required for temporary password bypass login");
    }

    const identifierConditions = allowEmailOnlyNoPassword
      ? [{ Email: lowerIdentifier }, { UserPrincipalName: lowerIdentifier }]
      : identifierVariants.flatMap((value) => [
          { Username: value },
          { Email: value },
          { SamAccountName: value },
          { UserPrincipalName: value }
        ]);

    const userWhere: Record<string, unknown> = {
      AuthProvider: {
        [Op.in]: ["AD", "LDAP"]
      },
      [Op.or]: identifierConditions
    };

    if (requestedDomain) {
      userWhere.DomainName = requestedDomain;
    }

    let adUser = await User.findOne({ where: userWhere });

    if (!adUser && requestedDomain) {
      // Fallback for legacy rows where DomainName is null or stored differently.
      const fallbackWhere: Record<string, unknown> = {
        AuthProvider: {
          [Op.in]: ["AD", "LDAP"]
        },
        [Op.or]: identifierConditions
      };

      adUser = await User.findOne({ where: fallbackWhere });
      if (adUser) {
        console.warn("AD login matched without strict domain filter", {
          requestedDomain,
          resolvedDomain: adUser.DomainName,
          identifier: lowerIdentifier
        });
      }
    }

    if (!adUser) {
      await recordLoginAttempt({
        username: lowerIdentifier,
        email: lowerIdentifier,
        authProvider: "AD",
        isSuccessful: false,
        failureReason: "INVALID_CREDENTIALS",
        requestInfo
      });
      throw new Error("Invalid username or password");
    }

    ensureUserCanLogin(adUser);
    await ensureEmployeeEmailExists(adUser.Email);

    adUser.FailedLoginCount = 0;
    adUser.IsLocked = false;
    adUser.LockoutUntil = null;
    adUser.LastLoginAt = new Date();
    await adUser.save();

    const refreshToken = createRefreshToken();
    const session = await sequelize.transaction(async (transaction: Transaction) => {
      const createdSession = await createSession(
        adUser.Id,
        refreshToken,
        requestInfo,
        transaction
      );

      await recordLoginAttempt({
        userId: adUser.Id,
        username: adUser.Username,
        email: adUser.Email,
        authProvider: adUser.AuthProvider,
        isSuccessful: true,
        requestInfo
      });

      await recordAudit({
        actorUserId: adUser.Id,
        action: "AUTH_AD_LOGIN",
        module: "AUTH",
        entityName: "User",
        entityId: String(adUser.Id),
        status: "SUCCESS",
        newData: {
          loginMode: allowEmailOnlyNoPassword ? "EMAIL_ONLY_TEMP_BYPASS" : "PASSWORD"
        },
        requestInfo
      });

      return createdSession;
    });

    const roles = await getUserRoles(adUser.Id);
    const permissions = await getUserPermissions(adUser.Id);

    return {
      user: sanitizeUser(adUser),
      roles: mapRoleDto(roles),
      permissions: mapPermissionDto(permissions),
      sessionId: session.Id,
      refreshToken
    };
  }

  const localLoginEnabled = await getBooleanPolicy("LOCAL_LOGIN_ENABLED", true);
  if (!localLoginEnabled) {
    throw new Error("Local login is disabled by policy");
  }

  const maxFailedAttempts = await getNumberPolicy("MAX_FAILED_LOGIN_ATTEMPTS", 5);
  const lockoutMinutes = await getNumberPolicy("LOCKOUT_MINUTES", 15);

  const user = await User.findOne({
    where: {
      AuthProvider: "LOCAL",
      [Op.or]: [{ Username: lowerIdentifier }, { Email: lowerIdentifier }]
    }
  });

  if (!user) {
    await recordLoginAttempt({
      username: lowerIdentifier,
      email: lowerIdentifier,
      authProvider: "LOCAL",
      isSuccessful: false,
      failureReason: "INVALID_CREDENTIALS",
      requestInfo
    });
    throw new Error("Invalid username or password");
  }

  ensureUserCanLogin(user);
  await ensureEmployeeEmailExists(user.Email);

  if (!user.PasswordHash) {
    throw new Error("LOCAL user has no password hash");
  }

  const matches = await bcrypt.compare(password, user.PasswordHash);
  if (!matches) {
    user.FailedLoginCount = (user.FailedLoginCount || 0) + 1;

    if (user.FailedLoginCount >= maxFailedAttempts) {
      user.IsLocked = true;
      user.LockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    }

    await user.save();
    await recordLoginAttempt({
      userId: user.Id,
      username: user.Username,
      email: user.Email,
      authProvider: "LOCAL",
      isSuccessful: false,
      failureReason: "INVALID_CREDENTIALS",
      requestInfo
    });
    throw new Error("Invalid username or password");
  }

  user.FailedLoginCount = 0;
  user.IsLocked = false;
  user.LockoutUntil = null;
  user.LastLoginAt = new Date();
  await user.save();

  const refreshToken = createRefreshToken();
  const session = await sequelize.transaction(async (transaction: Transaction) => {
    const createdSession = await createSession(user.Id, refreshToken, requestInfo, transaction);

    await recordLoginAttempt({
      userId: user.Id,
      username: user.Username,
      email: user.Email,
      authProvider: "LOCAL",
      isSuccessful: true,
      requestInfo
    });

    await recordAudit({
      actorUserId: user.Id,
      action: "AUTH_LOCAL_LOGIN",
      module: "AUTH",
      entityName: "User",
      entityId: String(user.Id),
      status: "SUCCESS",
      requestInfo
    });

    return createdSession;
  });

  const roles = await getUserRoles(user.Id);
  const permissions = await getUserPermissions(user.Id);

  return {
    user: sanitizeUser(user),
    roles: mapRoleDto(roles),
    permissions: mapPermissionDto(permissions),
    sessionId: session.Id,
    refreshToken
  };
};

export const extractRequestInfo = (req: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}): RequestInfo => ({
  ipAddress: req.ip || null,
  userAgent: typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
  requestId: typeof req.headers?.["x-request-id"] === "string" ? req.headers["x-request-id"] : null
});
