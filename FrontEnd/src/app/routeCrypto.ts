/**
 * Obfuscates in-app route paths in the browser address bar.
 * /login and /signing-in stay plaintext (Entra redirect URI).
 */

const ROUTE_SECRET =
  String(import.meta.env.VITE_ROUTE_CRYPTO_SECRET || "HERP-IMS-ROUTE-CRYPTO-v1").trim() ||
  "HERP-IMS-ROUTE-CRYPTO-v1";

/** Prefix for obfuscated paths: /x/<long-token> */
export const OBFUSCATED_PREFIX = "/x/";

const PLAINTEXT_PATHS = new Set(["/login", "/signing-in"]);

const FINGERPRINT_LEN = 64;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const normalized = padded + "=".repeat(padLen);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/** Expand secret into a deterministic keystream (sync, no SubtleCrypto). */
const keystream = (length: number, salt: string): Uint8Array => {
  const out = new Uint8Array(length);
  let state =
    2166136261 ^
    Array.from(`${ROUTE_SECRET}|${salt}`).reduce(
      (hash, ch) => Math.imul(hash ^ ch.charCodeAt(0), 16777619),
      2166136261
    );

  for (let i = 0; i < length; i += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    out[i] = state & 0xff;
  }
  return out;
};

const fingerprint = (payload: string): string => {
  const bytes = keystream(FINGERPRINT_LEN / 2, `fp|${payload}`);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const normalizePath = (path: string): string => {
  if (!path) {
    return "/";
  }
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) {
    return withSlash.slice(0, -1);
  }
  return withSlash;
};

export const isPlaintextPath = (pathname: string): boolean => {
  const path = normalizePath(pathname.split("?")[0].split("#")[0]);
  return PLAINTEXT_PATHS.has(path);
};

export const isObfuscatedPath = (pathname: string): boolean =>
  normalizePath(pathname).startsWith(OBFUSCATED_PREFIX);

/**
 * Encrypt a logical app path into a long hashed URL segment.
 * Example: /dashboard -> /x/a3f1...c9e2.<cipher>
 */
export const encodeRoutePath = (pathname: string): string => {
  const path = normalizePath(pathname);
  if (isPlaintextPath(path) || path === "/") {
    return path === "/" ? path : path;
  }

  if (isObfuscatedPath(path)) {
    return path;
  }

  const nonce = crypto.getRandomValues(new Uint8Array(24));
  const pad = crypto.getRandomValues(new Uint8Array(48));
  const payload = JSON.stringify({
    p: path,
    n: Array.from(nonce),
    r: Array.from(pad),
    t: Date.now()
  });

  const data = textEncoder.encode(payload);
  const salt = toBase64Url(nonce);
  const key = keystream(data.length, salt);
  const cipher = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    cipher[i] = data[i] ^ key[i];
  }

  const body = `${salt}.${toBase64Url(cipher)}`;
  const fp = fingerprint(body);
  return `${OBFUSCATED_PREFIX}${fp}${body}`;
};

/**
 * Decrypt an obfuscated pathname back to the logical route.
 * Returns null if the token is invalid.
 */
export const decodeRoutePath = (pathname: string): string | null => {
  const path = normalizePath(pathname);
  if (!isObfuscatedPath(path)) {
    return null;
  }

  const token = path.slice(OBFUSCATED_PREFIX.length);
  if (token.length <= FINGERPRINT_LEN + 2) {
    return null;
  }

  const fp = token.slice(0, FINGERPRINT_LEN);
  const body = token.slice(FINGERPRINT_LEN);
  if (fingerprint(body) !== fp) {
    return null;
  }

  const parts = body.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [salt, cipherB64] = parts;
  try {
    const cipher = fromBase64Url(cipherB64);
    const key = keystream(cipher.length, salt);
    const data = new Uint8Array(cipher.length);
    for (let i = 0; i < cipher.length; i += 1) {
      data[i] = cipher[i] ^ key[i];
    }
    const parsed = JSON.parse(textDecoder.decode(data)) as { p?: unknown };
    if (typeof parsed.p !== "string" || !parsed.p.startsWith("/")) {
      return null;
    }
    return normalizePath(parsed.p);
  } catch {
    return null;
  }
};

/** Map browser pathname <-> React Router logical pathname. */
export const toBrowserPathname = (logicalPathname: string): string => {
  const path = normalizePath(logicalPathname);
  if (isPlaintextPath(path) || path === "/") {
    return path;
  }
  return encodeRoutePath(path);
};

export const toLogicalPathname = (browserPathname: string): string => {
  const path = normalizePath(browserPathname);
  if (isPlaintextPath(path)) {
    return path;
  }
  if (isObfuscatedPath(path)) {
    return decodeRoutePath(path) || "/";
  }
  // Legacy plaintext deep links (bookmarks): accept and re-obfuscate on next navigate.
  return path;
};
