import { httpClient } from "./httpClient";

export const userSessionsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/user-sessions", { params }),
  getById: async (id: string) => httpClient.get(`/user-sessions/${id}`),
  listByUser: async (userId: string) => httpClient.get(`/user-sessions/user/${userId}`),
  revoke: async (id: string) => httpClient.patch(`/user-sessions/${id}/revoke`),
  revokeAll: async (userId: string) => httpClient.patch(`/user-sessions/user/${userId}/revoke-all`)
};
