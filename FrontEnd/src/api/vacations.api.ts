import type { VacationListParams, VacationListResponse } from "../types/vacation.types";
import { httpClient } from "./httpClient";

export const vacationsApi = {
  listForEmployee: async (
    employeeId: string | number,
    params: VacationListParams
  ): Promise<VacationListResponse> => {
    const response = await httpClient.get<VacationListResponse>(
      `/employees/${employeeId}/vacations`,
      { params }
    );
    return response.data;
  }
};
