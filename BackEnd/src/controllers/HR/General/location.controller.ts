import { Op } from "sequelize";
import { Location } from "../../../model/General";
import {
  LocationPayload,
  normalizeLocationPayload,
  validateLocationPayload
} from "../../../validators/General/location.validator";

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

const listAttributes = ["ID_Location", "LocationName_ar", "LocationName_en", "LocationCode"];

export const listLocations = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const where = search
      ? {
          [Op.or]: [
            { LocationName_en: { [Op.like]: `%${search}%` } },
            { LocationName_ar: { [Op.like]: `%${search}%` } },
            { LocationCode: { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined;

    const rows = await Location.findAll({
      where,
      attributes: listAttributes,
      order: [["LocationName_en", "ASC"]]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getLocationById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Location.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createLocation = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeLocationPayload({ ...(req.body || {}) } as LocationPayload);
    const errors = validateLocationPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await Location.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateLocation = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Location.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    const payload = normalizeLocationPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as LocationPayload);

    const errors = validateLocationPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteLocation = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Location.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Location deleted" });
  } catch (error) {
    return next(error);
  }
};
