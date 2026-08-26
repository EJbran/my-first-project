export const APP_NAME = "IMS - Harouge Oil Operations";
export const APP_FULL_NAME = "Integrated Management System";

/** Local-only: skip login and open dashboard while Entra apps are pending. */
export const AUTH_BYPASS = String(import.meta.env.VITE_AUTH_BYPASS ?? "").toLowerCase() === "true";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export const ENTRA_CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID ?? "";
export const ENTRA_TENANT_ID = import.meta.env.VITE_ENTRA_TENANT_ID ?? "";
export const ENTRA_AUTHORITY =
  import.meta.env.VITE_ENTRA_AUTHORITY ?? `https://login.microsoftonline.com/${ENTRA_TENANT_ID}`;
export const ENTRA_API_SCOPE = import.meta.env.VITE_ENTRA_API_SCOPE ?? "";

export const missingEntraConfig = (): string[] => {
  const missing: string[] = [];
  if (!ENTRA_CLIENT_ID) missing.push("VITE_ENTRA_CLIENT_ID");
  if (!ENTRA_TENANT_ID) missing.push("VITE_ENTRA_TENANT_ID");
  if (!ENTRA_AUTHORITY || ENTRA_AUTHORITY.includes("YOUR_TENANT_ID")) {
    missing.push("VITE_ENTRA_AUTHORITY");
  }
  if (!ENTRA_API_SCOPE || ENTRA_API_SCOPE.includes("YOUR_API_CLIENT_ID")) {
    missing.push("VITE_ENTRA_API_SCOPE");
  }
  return missing;
};

export const hasEntraConfig = (): boolean => missingEntraConfig().length === 0;
