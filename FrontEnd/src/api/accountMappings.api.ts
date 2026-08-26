import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type {
  AccountMapping,
  AccountMappingCreatePayload,
  AccountMappingCreateSummary
} from "../types/accountMapping.types";

export type AccountMappingCreateResponse = ApiResponse<AccountMapping[]> & {
  summary?: AccountMappingCreateSummary;
};

export const accountMappingsApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<AccountMapping>>("/account-mappings", {
      params
    });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ApiResponse<AccountMapping>>(`/account-mappings/${id}`);
    return response.data;
  },
  create: async (payload: AccountMappingCreatePayload) =>
    httpClient.post("/account-mappings", payload),
  update: async (id: string, payload: Partial<AccountMapping>) =>
    httpClient.put(`/account-mappings/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/account-mappings/${id}`)
};
