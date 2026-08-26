import { httpClient } from "./httpClient";
import type { ApiListResponse, ApiResponse, QueryParams } from "../types/api.types";
import type { ChartOfAccounts } from "../types/chartOfAccounts.types";

export type ChartOfAccountsApiResponse = ApiResponse<ChartOfAccounts> & {
  warning?: string;
};

export const chartOfAccountsApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<ApiListResponse<ChartOfAccounts>>("/chart-of-accounts", {
      params
    });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await httpClient.get<ChartOfAccountsApiResponse>(`/chart-of-accounts/${id}`);
    return response.data;
  },
  create: async (payload: Partial<ChartOfAccounts>) => httpClient.post("/chart-of-accounts", payload),
  update: async (id: string, payload: Partial<ChartOfAccounts>) =>
    httpClient.put(`/chart-of-accounts/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/chart-of-accounts/${id}`)
};
