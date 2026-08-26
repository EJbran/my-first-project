import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { User } from "../types/user.types";

export const usersApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<User>>("/users", { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },
  create: async (payload: Partial<User>) => httpClient.post("/users", payload),
  update: async (id: string, payload: Partial<User>) => httpClient.put(`/users/${id}`, payload),
  lock: async (id: string) => httpClient.patch(`/users/${id}/lock`),
  unlock: async (id: string) => httpClient.patch(`/users/${id}/unlock`),
  softDelete: async (id: string) => httpClient.patch(`/users/${id}/soft-delete`)
};
