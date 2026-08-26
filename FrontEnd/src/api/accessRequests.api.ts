import { httpClient } from "./httpClient";

export const accessRequestsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/access-requests", { params }),
  getById: async (id: string) => httpClient.get(`/access-requests/${id}`),
  create: async (payload: unknown) => httpClient.post("/access-requests", payload),
  cancel: async (id: string) => httpClient.patch(`/access-requests/${id}/cancel`),
  listByUser: async (userId: string) => httpClient.get(`/access-requests/user/${userId}`),
  listPending: async () => httpClient.get("/access-requests/pending")
};
