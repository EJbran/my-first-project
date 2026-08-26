import axios from "axios";

type GraphTokenCache = {
  accessToken: string;
  expiresAtEpochMs: number;
} | null;

let tokenCache: GraphTokenCache = null;

const isGraphEnabled = (): boolean => String(process.env.GRAPH_ENABLED || "false").toLowerCase() === "true";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const fetchClientCredentialToken = async (): Promise<string> => {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtEpochMs > now + 60_000) {
    return tokenCache.accessToken;
  }

  const tenantId = required("GRAPH_TENANT_ID");
  const clientId = required("GRAPH_CLIENT_ID");
  const clientSecret = required("GRAPH_CLIENT_SECRET");
  const scope = process.env.GRAPH_SCOPE || "https://graph.microsoft.com/.default";

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope
  });

  const response = await axios.post(tokenUrl, body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  const accessToken = response.data?.access_token as string;
  const expiresIn = Number(response.data?.expires_in || 3600);

  tokenCache = {
    accessToken,
    expiresAtEpochMs: now + expiresIn * 1000
  };

  return accessToken;
};

export const getUserTransitiveGroupIds = async (userObjectId: string): Promise<string[]> => {
  if (!isGraphEnabled()) {
    return [];
  }

  const accessToken = await fetchClientCredentialToken();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userObjectId)}/transitiveMemberOf/microsoft.graph.group?$select=id,displayName`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const values = Array.isArray(response.data?.value) ? response.data.value : [];

  // TODO: add distributed cache (Redis/DB) for production traffic.
  return values
    .map((item: { id?: unknown }) => (typeof item.id === "string" ? item.id : null))
    .filter((id: string | null): id is string => Boolean(id));
};
