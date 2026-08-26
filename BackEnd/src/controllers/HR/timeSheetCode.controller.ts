import { Op } from "sequelize";
import { TimeSheetCode } from "../../model/HR";
import {
  TimeSheetCodePayload,
  normalizeTimeSheetCodePayload,
  validateTimeSheetCodePayload
} from "../../validators/HR/timeSheetCode.validator";

type RequestLike = {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

export const listTimeSheetCodes = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const search = req.query?.search?.trim();
    const where = search
      ? {
          [Op.or]: [
            { Code: { [Op.like]: `%${search}%` } },
            { Code_Description: { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined;

    const rows = await TimeSheetCode.findAll({
      where,
      attributes: ["ID", "Code_Description", "Code"],
      order: [
        ["Code", "ASC"],
        ["ID", "ASC"]
      ]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getTimeSheetCodeById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await TimeSheetCode.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Time sheet code not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createTimeSheetCode = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = normalizeTimeSheetCodePayload({
      ...(req.body || {})
    } as TimeSheetCodePayload);
    const errors = validateTimeSheetCodePayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await TimeSheetCode.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateTimeSheetCode = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await TimeSheetCode.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Time sheet code not found" });
    }

    const payload = normalizeTimeSheetCodePayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as TimeSheetCodePayload);

    const errors = validateTimeSheetCodePayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteTimeSheetCode = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await TimeSheetCode.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Time sheet code not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Time sheet code deleted" });
  } catch (error) {
    return next(error);
  }
};
