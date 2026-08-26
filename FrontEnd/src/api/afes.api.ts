import { httpClient } from "./httpClient";
import type { ApiResponse } from "../types/api.types";
import type { ApiErrorResponse } from "../types/common.types";
import type { AFE, AFEListResult, AFEPayload } from "../types/afe.types";
import type { QueryParams } from "../types/api.types";

export const afesApi = {
  list: async (params?: QueryParams) => {
    const response = await httpClient.get<AFEListResult | ApiErrorResponse>(
      "/finance/afe",
      { params }
    );
    return response.data;
  },

  getById: async (id: string | number) => {
    const response = await httpClient.get<ApiResponse<AFE>>(`/finance/afe/${id}`);
    return response.data;
  },

  create: async (payload: AFEPayload) => httpClient.post("/finance/afe", payload),

  update: async (id: string | number, payload: AFEPayload) =>
    httpClient.put(`/finance/afe/${id}`, payload),

  updateStatus: async (
    id: string | number,
    payload: { IsActive?: boolean; Status?: string }
  ) => httpClient.patch(`/finance/afe/${id}/status`, payload)
};
