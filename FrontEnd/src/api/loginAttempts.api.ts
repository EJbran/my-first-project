import { httpClient } from "./httpClient";

export const loginAttemptsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/login-attempts", { params }),
  getById: async (id: string) => httpClient.get(`/login-attempts/${id}`),
  listByUser: async (userId: string) => httpClient.get(`/login-attempts/user/${userId}`)
};
