import type { User } from "../types/user.types";

export type LoginMode = "MICROSOFT" | "LOCAL" | "AD" | "OTHER";

export type CredentialConnection = "AD" | "LOCAL" | "OTHER";

export interface CredentialLoginPayload {
  username: string;
  email?: string;
  password: string;
  domain?: string;
  connection: CredentialConnection;
}

export interface AuthResult {
  user: User;
  roles: string[];
  permissions: string[];
  sessionId: string;
  refreshToken?: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  roles: string[];
  permissions: string[];
  sessionId: string | null;
  loginMode: LoginMode | null;
  loginWithCredentials: (payload: CredentialLoginPayload) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  loginLocal: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
}
