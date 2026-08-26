import type {
  JobCreatePayload,
  JobListParams,
  JobListResponse,
  JobOptions,
  JobRecord,
  JobResponse
} from "../types/job.types";
import { httpClient } from "./httpClient";

export const jobsApi = {
  list: async (params: JobListParams = {}): Promise<JobListResponse> => {
    const response = await httpClient.get<JobListResponse>("/jobs", { params });
    return response.data;
  },

  getById: async (jobId: number): Promise<JobResponse<JobRecord>> => {
    const response = await httpClient.get<JobResponse<JobRecord>>(`/jobs/${jobId}`);
    return response.data;
  },

  options: async (params?: { search?: string; limit?: number }): Promise<JobResponse<JobOptions>> => {
    const response = await httpClient.get<JobResponse<JobOptions>>("/jobs/options", { params });
    return response.data;
  },

  create: async (payload: JobCreatePayload): Promise<JobResponse<JobRecord>> => {
    const response = await httpClient.post<JobResponse<JobRecord>>("/jobs", payload);
    return response.data;
  }
};
