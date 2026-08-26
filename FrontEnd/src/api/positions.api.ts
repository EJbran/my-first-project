import type {
  CurrentPosition,
  CreatePositionPayload,
  PositionListParams,
  PositionListResponse,
  PositionOptions,
  PositionRecord,
  PositionResponse,
  ReleaseEmployeePositionPayload,
  ReleaseEmployeePositionResult,
  SetEmployeePositionPayload,
  VacantPosition
} from "../types/position.types";
import { httpClient } from "./httpClient";

const PAGE_SIZE = 100;

const loadAllVacantPositionPages = async (): Promise<PositionResponse<VacantPosition[]>> => {
  const firstPage = await positionsApi.vacant({ page: 1, pageSize: PAGE_SIZE });
  if (!firstPage.success) return firstPage;

  const remainingPageNumbers = Array.from(
    { length: Math.max(0, firstPage.pagination.totalPages - 1) },
    (_value, index) => index + 2
  );
  const remainingPages = await Promise.all(
    remainingPageNumbers.map((page) => positionsApi.vacant({ page, pageSize: PAGE_SIZE }))
  );
  const failedPage = remainingPages.find((result) => !result.success);
  if (failedPage && !failedPage.success) return failedPage;

  return {
    success: true,
    message: firstPage.message ?? "Vacant positions loaded successfully",
    data: [
      ...firstPage.data,
      ...remainingPages.flatMap((result) => (result.success ? result.data : []))
    ]
  };
};

export const positionsApi = {
  list: async (
    params: PositionListParams = {}
  ): Promise<PositionListResponse<PositionRecord>> => {
    const response = await httpClient.get<PositionListResponse<PositionRecord>>(
      "/positions",
      { params }
    );
    return response.data;
  },

  getById: async (positionId: string | number): Promise<PositionResponse<PositionRecord>> => {
    const response = await httpClient.get<PositionResponse<PositionRecord>>(
      `/positions/${positionId}`
    );
    return response.data;
  },

  options: async (): Promise<PositionResponse<PositionOptions>> => {
    const response = await httpClient.get<PositionResponse<PositionOptions>>(
      "/positions/options"
    );
    return response.data;
  },

  create: async (payload: CreatePositionPayload): Promise<PositionResponse<PositionRecord>> => {
    const response = await httpClient.post<PositionResponse<PositionRecord>>(
      "/positions",
      payload
    );
    return response.data;
  },

  current: async (
    employeeId: string | number
  ): Promise<PositionResponse<CurrentPosition | null>> => {
    const response = await httpClient.get<PositionResponse<CurrentPosition>>(
      `/positions/employees/${employeeId}/current`,
      { validateStatus: (status) => status === 200 || status === 404 }
    );

    if (response.status === 404) {
      return {
        success: true,
        message: "This employee does not occupy a position",
        data: null
      };
    }
    return response.data;
  },

  vacant: async (
    params: PositionListParams = {}
  ): Promise<PositionListResponse<VacantPosition>> => {
    const response = await httpClient.get<PositionListResponse<VacantPosition>>(
      "/positions/vacant",
      { params }
    );
    return response.data;
  },

  allVacant: loadAllVacantPositionPages,

  assign: async (payload: SetEmployeePositionPayload) => {
    const response = await httpClient.post<PositionResponse<CurrentPosition | null>>(
      "/positions/assign",
      payload
    );
    return response.data;
  },

  transfer: async (payload: SetEmployeePositionPayload) => {
    const response = await httpClient.post<PositionResponse<CurrentPosition | null>>(
      "/positions/transfer",
      payload
    );
    return response.data;
  },

  release: async (payload: ReleaseEmployeePositionPayload) => {
    const response = await httpClient.post<PositionResponse<ReleaseEmployeePositionResult>>(
      "/positions/release",
      payload
    );
    return response.data;
  }
};
