import { httpClient } from "./httpClient";

export const securityPoliciesApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/security-policies", { params }),
  getById: async (id: string) => httpClient.get(`/security-policies/${id}`),
  create: async (payload: unknown) => httpClient.post("/security-policies", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/security-policies/${id}`, payload),
  setStatus: async (id: string, isActive: boolean) =>
    httpClient.patch(`/security-policies/${id}/status`, { isActive })
};
