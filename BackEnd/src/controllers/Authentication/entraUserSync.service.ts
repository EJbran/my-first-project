import { Op, Transaction } from "sequelize";
import { AuthDomain, User } from "../../model/Authentication";
import type { EntraClaims } from "./entraToken.service";

const pickUserPrincipalName = (claims: EntraClaims): string | null => {
  const upn = claims.preferred_username || claims.upn;
  if (!upn || typeof upn !== "string") {
    return null;
  }
  return upn.trim().toLowerCase();
};

const pickEmail = (claims: EntraClaims): string | null => {
  if (claims.email && typeof claims.email === "string") {
    return claims.email.trim().toLowerCase();
  }

  return pickUserPrincipalName(claims);
};

const pickUsername = (claims: EntraClaims): string => {
  const principal = pickUserPrincipalName(claims) || pickEmail(claims) || claims.oid;
  if (principal.includes("@")) {
    return principal.split("@")[0];
  }
  return principal;
};

const pickDomainName = (claims: EntraClaims): string | null => {
  const email = pickEmail(claims);
  if (!email || !email.includes("@")) {
    return null;
  }
  return email.split("@")[1].toLowerCase();
};

const resolveAuthDomainId = async (
  claims: EntraClaims,
  transaction?: Transaction
): Promise<number | null> => {
  const domainName = pickDomainName(claims);

  const authDomain = await AuthDomain.findOne({
    where: {
      IsActive: true,
      AuthMethod: "OIDC",
      [Op.or]: [
        { TenantId: claims.tid },
        domainName ? { DomainName: domainName } : null
      ].filter(Boolean) as unknown as Record<string, unknown>[]
    },
    ...(transaction ? { transaction } : {})
  });

  return authDomain ? authDomain.Id : null;
};

export const findOrCreateUserFromEntraClaims = async (
  claims: EntraClaims,
  transaction?: Transaction
): Promise<User> => {
  const principal = pickUserPrincipalName(claims);
  const email = pickEmail(claims);
  const domainName = pickDomainName(claims);
  const authDomainId = await resolveAuthDomainId(claims, transaction);

  let user = await User.findOne({
    where: {
      AuthProvider: "SSO",
      ExternalAuthId: claims.oid
    },
    transaction
  });

  if (!user && principal) {
    user = await User.findOne({
      where: {
        UserPrincipalName: principal,
        DeletedAt: null
      },
      transaction
    });
  }

  if (!user && email) {
    user = await User.findOne({
      where: {
        Email: email,
        DeletedAt: null
      },
      transaction
    });
  }

  const now = new Date();
  const payload = {
    AuthProvider: "SSO" as const,
    PasswordHash: null,
    ExternalAuthId: claims.oid,
    UserPrincipalName: principal,
    Username: pickUsername(claims),
    Email: email || `${claims.oid}@unknown.local`,
    DisplayName: claims.name || null,
    DomainName: domainName,
    AuthDomainId: authDomainId,
    IsAdSynced: true,
    LastAdSyncAt: now,
    IsActive: true,
    IsLocked: false
  };

  if (!user) {
    user = await User.create(payload, { transaction });
    return user;
  }

  user.AuthProvider = "SSO";
  user.PasswordHash = null;
  user.ExternalAuthId = claims.oid;
  user.UserPrincipalName = principal;
  user.Username = user.Username || payload.Username;
  user.Email = payload.Email;
  user.DisplayName = payload.DisplayName;
  user.DomainName = payload.DomainName;
  user.AuthDomainId = payload.AuthDomainId;
  user.IsAdSynced = true;
  user.LastAdSyncAt = now;

  if (user.IsActive === null || user.IsActive === undefined) {
    user.IsActive = true;
  }

  await user.save({ transaction });
  return user;
};
