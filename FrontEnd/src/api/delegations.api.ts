import { httpClient } from "./httpClient";

export const delegationsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/delegations", { params }),
  getById: async (id: string) => httpClient.get(`/delegations/${id}`),
  create: async (payload: unknown) => httpClient.post("/delegations", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/delegations/${id}`, payload),
  approve: async (id: string) => httpClient.patch(`/delegations/${id}/approve`),
  revoke: async (id: string) => httpClient.patch(`/delegations/${id}/revoke`),
  listActive: async () => httpClient.get("/delegations/active")
};
