import { Op } from "sequelize";
import { Holiday } from "../../model/HR";
import {
  HolidayPayload,
  normalizeHolidayPayload,
  validateHolidayPayload
} from "../../validators/HR/holiday.validator";

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

export const listHolidays = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const holidayType = req.query?.HolidayType?.trim();
    const isActiveRaw = req.query?.IsActive?.trim();

    const and: Record<string, unknown>[] = [];

    if (search) {
      and.push({
        [Op.or]: [
          { HolidayCode: { [Op.like]: `%${search}%` } },
          { HolidayNameAr: { [Op.like]: `%${search}%` } },
          { HolidayNameEn: { [Op.like]: `%${search}%` } },
          { HolidayType: { [Op.like]: `%${search}%` } },
          { Description: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    if (holidayType) {
      and.push({ HolidayType: holidayType });
    }

    if (isActiveRaw === "true" || isActiveRaw === "1") {
      and.push({ IsActive: true });
    } else if (isActiveRaw === "false" || isActiveRaw === "0") {
      and.push({ IsActive: false });
    }

    const rows = await Holiday.findAll({
      where: and.length ? { [Op.and]: and } : undefined,
      order: [
        ["HolidayDate", "ASC"],
        ["HolidayId", "ASC"]
      ]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getHolidayById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Holiday.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createHoliday = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeHolidayPayload({ ...(req.body || {}) } as HolidayPayload);
    const errors = validateHolidayPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await Holiday.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateHoliday = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Holiday.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    const payload = normalizeHolidayPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as HolidayPayload);

    const errors = validateHolidayPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload as never);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteHoliday = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Holiday.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Holiday deleted" });
  } catch (error) {
    return next(error);
  }
};
