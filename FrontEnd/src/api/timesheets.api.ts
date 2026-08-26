import { httpClient } from "./httpClient";
import type { QueryParams } from "../types/api.types";
import type {
  TimesheetMonthResult,
  TimesheetSaveAllPayload,
  TimesheetSaveAllResult,
  TimesheetSavePayload,
  TimesheetSaveResult
} from "../types/timesheet.types";

export const timesheetsApi = {
  listByMonth: async (params?: QueryParams) => {
    const response = await httpClient.get<TimesheetMonthResult>("/timesheets", {
      params
    });
    return response.data;
  },
  saveMonth: async (payload: TimesheetSavePayload) => {
    const response = await httpClient.post<TimesheetSaveResult>("/timesheets", payload, {
      timeout: 120000
    });
    return response.data;
  },
  saveAllBatch: async (payload: TimesheetSaveAllPayload) => {
    const response = await httpClient.post<TimesheetSaveAllResult>(
      "/timesheets",
      { ...payload, saveAll: true },
      { timeout: 120000 }
    );
    return response.data;
  }
};
