import { MfaFactor, User, UserSession } from "../../model/Authentication";

type PlainObject = Record<string, unknown>;

const toPlain = (value: unknown): PlainObject => {
  if (!value || typeof value !== "object") {
    return {};
  }

  if ("get" in (value as { get?: unknown }) && typeof (value as { get: (opts: unknown) => unknown }).get === "function") {
    return ((value as { get: (opts: unknown) => unknown }).get({ plain: true }) as PlainObject) || {};
  }

  return value as PlainObject;
};

export const sanitizeUser = (
  user: User | PlainObject,
  options?: { includeExternalAuthId?: boolean }
): PlainObject => {
  const raw = toPlain(user);

  const safe: PlainObject = {
    Id: raw.Id,
    EmployeeId: raw.EmployeeId,
    AuthDomainId: raw.AuthDomainId,
    Username: raw.Username,
    Email: raw.Email,
    Phone: raw.Phone,
    DisplayName: raw.DisplayName,
    DepartmentId: raw.DepartmentId,
    JobTitle: raw.JobTitle,
    ManagerUserId: raw.ManagerUserId,
    AuthProvider: raw.AuthProvider,
    DomainName: raw.DomainName,
    SamAccountName: raw.SamAccountName,
    UserPrincipalName: raw.UserPrincipalName,
    IsAdSynced: raw.IsAdSynced,
    LastAdSyncAt: raw.LastAdSyncAt,
    IsActive: raw.IsActive,
    IsLocked: raw.IsLocked,
    IsMobile: raw.IsMobile,
    IsWeb: raw.IsWeb,
    LastLoginAt: raw.LastLoginAt,
    CreatedAt: raw.CreatedAt,
    UpdatedAt: raw.UpdatedAt
  };

  if (options?.includeExternalAuthId) {
    safe.ExternalAuthId = raw.ExternalAuthId;
  }

  return safe;
};

export const sanitizeSession = (session: UserSession | PlainObject): PlainObject => {
  const raw = toPlain(session);
  return {
    Id: raw.Id,
    UserId: raw.UserId,
    DeviceName: raw.DeviceName,
    DeviceId: raw.DeviceId,
    IpAddress: raw.IpAddress,
    UserAgent: raw.UserAgent,
    IsRevoked: raw.IsRevoked,
    RevokedAt: raw.RevokedAt,
    RevokedReason: raw.RevokedReason,
    ReplacedBySessionId: raw.ReplacedBySessionId,
    ExpiresAt: raw.ExpiresAt,
    CreatedAt: raw.CreatedAt,
    LastUsedAt: raw.LastUsedAt
  };
};

export const sanitizeMfaFactor = (factor: MfaFactor | PlainObject): PlainObject => {
  const raw = toPlain(factor);
  return {
    Id: raw.Id,
    UserId: raw.UserId,
    FactorType: raw.FactorType,
    ManagedBy: raw.ManagedBy,
    FriendlyName: raw.FriendlyName,
    IsEnabled: raw.IsEnabled,
    IsVerified: raw.IsVerified,
    CreatedAt: raw.CreatedAt,
    VerifiedAt: raw.VerifiedAt,
    LastUsedAt: raw.LastUsedAt
  };
};
