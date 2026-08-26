import { httpClient } from "./httpClient";

export const apiClientsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/api-clients", { params }),
  getById: async (id: string) => httpClient.get(`/api-clients/${id}`),
  create: async (payload: unknown) => httpClient.post("/api-clients", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/api-clients/${id}`, payload),
  setStatus: async (id: string, isActive: boolean) => httpClient.patch(`/api-clients/${id}/status`, { isActive }),
  listSecrets: async (id: string) => httpClient.get(`/api-clients/${id}/secrets`)
};
