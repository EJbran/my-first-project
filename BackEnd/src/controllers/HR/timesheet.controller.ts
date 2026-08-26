import {
  listTimesheetsByMonth,
  saveAllTimesheetsBatch,
  saveTimesheetsByMonth
} from "../../services/HR/timesheet.service";

type RequestLike = {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
  user?: {
    departmentId?: number;
  };
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

export const listTimesheets = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const result = await listTimesheetsByMonth(req.query || {}, req.user?.departmentId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const saveTimesheets = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const body = req.body || {};
    const saveAll = Boolean(body.saveAll);

    if (saveAll) {
      const result = await saveAllTimesheetsBatch({
        year: body.year as string | number | undefined,
        month: body.month as string | number | undefined,
        search: typeof body.search === "string" ? body.search : undefined,
        activeOnly: body.activeOnly as string | boolean | undefined,
        page: body.page as string | number | undefined,
        pageSize: body.pageSize as string | number | undefined,
        departmentId: req.user?.departmentId
      });

      return res.status(200).json({
        success: true,
        message: `Saved batch ${result.page} (${result.processed}/${result.total})`,
        ...result
      });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "No timesheet rows provided to save"
      });
    }

    const result = await saveTimesheetsByMonth({
      year: body.year as string | number | undefined,
      month: body.month as string | number | undefined,
      rows: rows as Array<{
        ID_Employee: number;
        Job_Name?: string | null;
        days: Array<{ dayIndex: number; code?: string | null; afeId?: number | null }>;
      }>
    });

    return res.status(200).json({
      success: true,
      message: `Saved ${result.saved} timesheet(s)`,
      ...result
    });
  } catch (error) {
    return next(error);
  }
};
