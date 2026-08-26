import { httpClient } from "./httpClient";

export const authDomainsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/auth-domains", { params }),
  getById: async (id: string) => httpClient.get(`/auth-domains/${id}`),
  create: async (payload: unknown) => httpClient.post("/auth-domains", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/auth-domains/${id}`, payload),
  setStatus: async (id: string, isActive: boolean) => httpClient.patch(`/auth-domains/${id}/status`, { isActive }),
  remove: async (id: string) => httpClient.delete(`/auth-domains/${id}`)
};
