import type { ApiResponse } from "../types/api.types";
import type {
  MonthlySeniorityAwardReport,
  MonthlySeniorityAwardReportRequest
} from "../types/hrReports.types";
import { httpClient } from "./httpClient";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isMonthlySeniorityAwardReport = (value: unknown): value is MonthlySeniorityAwardReport =>
  isRecord(value)
  && value.reportType === "seniority-awards"
  && typeof value.period === "string"
  && typeof value.documentNumber === "string"
  && isRecord(value.summary)
  && Array.isArray(value.items)
  && isRecord(value.pagination);

const toQueryParams = (request: MonthlySeniorityAwardReportRequest) => ({
  month: request.month,
  page: request.page,
  pageSize: request.pageSize,
  search: request.search?.trim() || undefined,
  milestone: request.milestone ?? undefined,
  status: request.status ?? undefined,
  all: request.all || undefined
});

const getSeniorityAwards = async (request: MonthlySeniorityAwardReportRequest) => {
  const response = await httpClient.get<ApiResponse<MonthlySeniorityAwardReport>>(
    "/reports/seniority-awards",
    { params: toQueryParams(request) }
  );

  if (!response.data.success) {
    throw new Error(response.data.message);
  }
  if (!isMonthlySeniorityAwardReport(response.data.data)) {
    throw new Error("The seniority award report API returned an incomplete payload");
  }

  return response.data.data;
};

export const hrReportsApi = {
  getSeniorityAwards,
  getAllSeniorityAwards: (month: string) => getSeniorityAwards({ month, all: true })
};
