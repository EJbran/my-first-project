import jwt, { JwtHeader, JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface EntraClaims {
  oid: string;
  sub?: string;
  tid: string;
  preferred_username?: string;
  upn?: string;
  email?: string;
  name?: string;
  groups: string[];
  roles: string[];
  amr?: unknown[];
  acr?: string;
  aud: string;
  iss: string;
  exp: number;
  nbf?: number;
  [key: string]: unknown;
}

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const ENTRA_TENANT_ID = () => requiredEnv("ENTRA_TENANT_ID");
const ENTRA_CLIENT_ID = () => requiredEnv("ENTRA_CLIENT_ID");
const ENTRA_API_AUDIENCE = () => process.env.ENTRA_API_AUDIENCE || ENTRA_CLIENT_ID();
const ENTRA_ISSUER = () => requiredEnv("ENTRA_ISSUER");
const ENTRA_JWKS_URI = () => requiredEnv("ENTRA_JWKS_URI");

const resolveEntraUri = (value: string): string =>
  value.replaceAll("{TENANT_ID}", ENTRA_TENANT_ID());

const getAllowedIssuers = (tenantId: string): string[] => {
  const configured = resolveEntraUri(ENTRA_ISSUER()).replace(/\/$/, "");
  const candidates = [
    configured,
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://login.microsoftonline.com/${tenantId}/`,
    `https://login.microsoftonline.com/${tenantId}`,
    `https://sts.windows.net/${tenantId}/`,
    `https://sts.windows.net/${tenantId}`
  ];

  return [...new Set(candidates.map((value) => value.replace(/\/$/, "")).concat(candidates))];
};

const isAllowedIssuer = (tokenIssuer: string, tenantId: string): boolean => {
  const normalized = String(tokenIssuer || "").trim().replace(/\/$/, "");
  const allowed = getAllowedIssuers(tenantId).map((value) => value.replace(/\/$/, ""));
  return allowed.includes(normalized);
};

const getAllowedAudiences = (): [string, ...string[]] => {
  const apiAudience = ENTRA_API_AUDIENCE();
  const apiClientId = ENTRA_CLIENT_ID();
  const audiences = [
    ...new Set(
      [apiAudience, apiClientId, `api://${apiClientId}`, `api://${apiClientId}/`].filter(Boolean)
    )
  ];

  const firstAudience = audiences[0];
  if (!firstAudience) {
    throw new Error("At least one Entra API audience must be configured");
  }

  return [firstAudience, ...audiences.slice(1)];
};

let client: ReturnType<typeof jwksClient> | null = null;

const getJwksClient = (): ReturnType<typeof jwksClient> => {
  if (client) {
    return client;
  }

  client = jwksClient({
    jwksUri: resolveEntraUri(ENTRA_JWKS_URI()),
    cache: true,
    cacheMaxAge: 10 * 60 * 1000,
    rateLimit: true,
    jwksRequestsPerMinute: 10
  });

  return client;
};

const getSigningKey = async (kid: string): Promise<string> => {
  const key = await getJwksClient().getSigningKey(kid);
  return key.getPublicKey();
};

const parseTokenPayload = (token: string): { header: JwtHeader; payload: JwtPayload } => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string") {
    throw new Error("Invalid token format");
  }

  return {
    header: decoded.header as JwtHeader,
    payload: decoded.payload as JwtPayload
  };
};

const hasGroupOverage = (payload: JwtPayload): boolean => {
  const claimNames = payload._claim_names as Record<string, string> | undefined;
  const hasGroupsOverageByClaimNames = claimNames?.groups === "src1";
  const hasGroupsOverageByIndicator =
    typeof payload.hasgroups === "boolean" ? payload.hasgroups : false;

  return Boolean(hasGroupsOverageByClaimNames || hasGroupsOverageByIndicator);
};

export const verifyEntraAccessToken = async (token: string): Promise<EntraClaims> => {
  if (!token) {
    throw new Error("Access token is required");
  }

  const { header, payload: uncheckedPayload } = parseTokenPayload(token);
  if (!header.kid) {
    throw new Error("Token header is missing kid");
  }

  const key = await getSigningKey(header.kid);
  const tenantId = ENTRA_TENANT_ID();
  const allowedAudiences = getAllowedAudiences();

  // Verify signature/expiry first. Issuer is checked manually because Entra may
  // emit either v2.0 (`login.microsoftonline.com/.../v2.0`) or v1 (`sts.windows.net/.../`).
  const verified = jwt.verify(token, key, {
    algorithms: ["RS256"],
    audience: allowedAudiences,
    clockTolerance: 5
  }) as JwtPayload;

  const tokenIssuer = String(verified.iss || uncheckedPayload.iss || "");
  if (!isAllowedIssuer(tokenIssuer, tenantId)) {
    console.error("[AUTH][ENTRA_TOKEN] Invalid issuer", {
      received: tokenIssuer,
      expectedAnyOf: getAllowedIssuers(tenantId)
    });
    throw new Error(
      `jwt issuer invalid. received: ${tokenIssuer || "(empty)"}; expected one of tenant issuers for ${tenantId}`
    );
  }

  const tokenAudience = String(verified.aud || "");
  if (!allowedAudiences.includes(tokenAudience)) {
    console.error("[AUTH][ENTRA_TOKEN] Invalid audience", {
      received: tokenAudience,
      expectedAnyOf: allowedAudiences
    });
    throw new Error("Token audience validation failed");
  }

  const tokenTid = String(verified.tid || "");
  if (!tokenTid || tokenTid.toLowerCase() !== tenantId.toLowerCase()) {
    throw new Error("Token tenant validation failed");
  }

  const oid = String(verified.oid || "");
  if (!oid) {
    throw new Error("Token does not contain oid claim");
  }

  console.info("[AUTH][ENTRA_TOKEN] Verified", {
    iss: tokenIssuer,
    aud: tokenAudience,
    tid: tokenTid,
    oid,
    preferred_username: verified.preferred_username || null
  });

  return {
    oid,
    sub: verified.sub,
    tid: tokenTid,
    preferred_username: verified.preferred_username as string | undefined,
    upn: verified.upn as string | undefined,
    email: (verified.email as string | undefined) || (verified.preferred_username as string | undefined),
    name: verified.name as string | undefined,
    groups: Array.isArray(verified.groups)
      ? (verified.groups.filter((value): value is string => typeof value === "string") as string[])
      : [],
    roles: Array.isArray(verified.roles)
      ? (verified.roles.filter((value): value is string => typeof value === "string") as string[])
      : [],
    amr: Array.isArray(verified.amr) ? verified.amr : undefined,
    acr: verified.acr as string | undefined,
    aud: tokenAudience,
    iss: tokenIssuer,
    exp: Number(verified.exp || 0),
    nbf: verified.nbf ? Number(verified.nbf) : undefined,
    hasGroupOverage: hasGroupOverage(verified),
    _claim_names: verified._claim_names,
    _claim_sources: verified._claim_sources
  };
};
