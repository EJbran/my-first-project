import { httpClient } from "./httpClient";
import type { ApiResponse } from "../types/api.types";
import type { AuthResult, CredentialLoginPayload } from "../auth/auth.types";

export const authApi = {
  ssoCallback: async (accessToken: string, idToken?: string): Promise<AuthResult> => {
    const response = await httpClient.post<ApiResponse<AuthResult>>("/auth/sso/callback", {
      accessToken,
      ...(idToken ? { idToken } : {})
    });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data;
  },
  localLogin: async (payload: CredentialLoginPayload): Promise<AuthResult> => {
    const response = await httpClient.post<ApiResponse<AuthResult>>("/auth/local-login", payload);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data;
  },
  me: async (): Promise<Record<string, unknown>> => {
    const response = await httpClient.get<ApiResponse<Record<string, unknown>>>("/auth/me");
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data;
  },
  refresh: async (refreshToken: string): Promise<AuthResult> => {
    const response = await httpClient.post<ApiResponse<AuthResult>>("/auth/refresh", { refreshToken });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data;
  },
  logout: async (): Promise<void> => {
    await httpClient.post("/auth/logout");
  }
};
