import {
  isObfuscatedPath,
  isPlaintextPath,
  toBrowserPathname,
  toLogicalPathname
} from "./routeCrypto";

let installed = false;
let suppressMask = false;

type HistoryState = {
  usr?: unknown;
  key?: string;
  idx?: number;
  masked?: {
    pathname: string;
    search: string;
    hash: string;
  };
  [key: string]: unknown;
};

const composeUrl = (pathname: string, search: string, hash: string): string =>
  `${pathname}${search || ""}${hash || ""}`;

const resolveUrlArgument = (
  url: string | URL | null | undefined
): { pathname: string; search: string; hash: string; absolute: boolean } | null => {
  if (url == null || url === "") {
    return null;
  }

  if (typeof url !== "string") {
    return {
      pathname: url.pathname || "/",
      search: url.search || "",
      hash: url.hash || "",
      absolute: true
    };
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    const parsed = new URL(url);
    return {
      pathname: parsed.pathname || "/",
      search: parsed.search || "",
      hash: parsed.hash || "",
      absolute: true
    };
  }

  const hashIndex = url.indexOf("#");
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const searchIndex = withoutHash.indexOf("?");
  const pathname = searchIndex >= 0 ? withoutHash.slice(0, searchIndex) : withoutHash;
  const search = searchIndex >= 0 ? withoutHash.slice(searchIndex) : "";

  return {
    pathname: pathname || "/",
    search,
    hash,
    absolute: false
  };
};

const mergeState = (
  data: unknown,
  logical: { pathname: string; search: string; hash: string },
  shouldMask: boolean
): HistoryState => {
  const base =
    data && typeof data === "object" ? ({ ...(data as HistoryState) } as HistoryState) : {};

  if (!shouldMask) {
    if ("masked" in base) {
      delete base.masked;
    }
    return base;
  }

  return {
    ...base,
    masked: {
      pathname: logical.pathname,
      search: logical.search,
      hash: logical.hash
    }
  };
};

/**
 * Patch browser history so React Router keeps logical paths
 * while the address bar shows long encrypted /x/... URLs.
 * Uses history.state.masked (React Router URL masking).
 * /login and /signing-in stay plaintext for Entra SSO.
 */
export const installRouteObfuscation = (): void => {
  if (installed || typeof window === "undefined") {
    return;
  }
  installed = true;

  const { history } = window;
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  const rewrite = (
    data: unknown,
    url: string | URL | null | undefined
  ): { data: unknown; url: string | URL | null | undefined } => {
    const parts = resolveUrlArgument(url);
    if (!parts) {
      return { data, url };
    }

    const logicalPath = toLogicalPathname(parts.pathname);
    const keepPlain = isPlaintextPath(logicalPath) || logicalPath === "/";
    const browserPath = keepPlain ? logicalPath : toBrowserPathname(logicalPath);
    const logical = {
      pathname: logicalPath,
      search: parts.search,
      hash: parts.hash
    };
    const nextUrl = composeUrl(browserPath, parts.search, parts.hash);
    const nextData = mergeState(data, logical, !keepPlain);

    if (parts.absolute && typeof url === "string") {
      const parsed = new URL(url);
      return { data: nextData, url: `${parsed.origin}${nextUrl}` };
    }

    return { data: nextData, url: nextUrl };
  };

  history.pushState = (data, unused, url) => {
    const next = rewrite(data, url);
    return originalPushState(next.data, unused, next.url as string);
  };

  history.replaceState = (data, unused, url) => {
    const next = rewrite(data, url);
    return originalReplaceState(next.data, unused, next.url as string);
  };

  // If an old entry has no masked state, decode /x/... before React Router reads it.
  window.addEventListener(
    "popstate",
    () => {
      const state = history.state as HistoryState | null;
      if (state?.masked) {
        return;
      }
      const current = window.location.pathname;
      if (!isObfuscatedPath(current)) {
        return;
      }
      const logical = toLogicalPathname(current);
      if (logical === current) {
        return;
      }
      suppressMask = true;
      originalReplaceState(
        mergeState(history.state, {
          pathname: logical,
          search: window.location.search,
          hash: window.location.hash
        }, true),
        "",
        composeUrl(logical, window.location.search, window.location.hash)
      );
      suppressMask = false;
    },
    true
  );

  // Initial load: decode obfuscated URL so the router can match routes.
  const bootPath = window.location.pathname;
  if (isObfuscatedPath(bootPath)) {
    const logical = toLogicalPathname(bootPath);
    originalReplaceState(
      mergeState(history.state, {
        pathname: logical,
        search: window.location.search,
        hash: window.location.hash
      }, true),
      "",
      composeUrl(logical, window.location.search, window.location.hash)
    );
  }
};

/** Keep address bar encrypted after React Router navigations. */
export const maskCurrentUrl = (logicalPathname: string, search = "", hash = ""): void => {
  if (suppressMask || typeof window === "undefined") {
    return;
  }

  if (isPlaintextPath(logicalPathname) || logicalPathname === "/") {
    const next = composeUrl(logicalPathname, search, hash);
    const current = composeUrl(
      window.location.pathname,
      window.location.search,
      window.location.hash
    );
    if (next !== current) {
      window.history.replaceState(window.history.state, "", next);
    }
    return;
  }

  // Already showing an obfuscated URL for this logical route — keep it.
  if (isObfuscatedPath(window.location.pathname)) {
    const decoded = toLogicalPathname(window.location.pathname);
    if (decoded === logicalPathname) {
      return;
    }
  }

  const browserPath = toBrowserPathname(logicalPathname);
  const next = composeUrl(browserPath, search, hash);
  window.history.replaceState(window.history.state, "", next);
};
