import { Op } from "sequelize";
import { Location, SubLocation } from "../../../model/General";
import {
  SubLocationPayload,
  normalizeSubLocationPayload,
  validateSubLocationPayload
} from "../../../validators/General/subLocation.validator";

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

const listAttributes = ["Id", "Name", "Type", "LocationId"];

const locationExists = async (locationId: number) => {
  const row = await Location.findByPk(locationId, { attributes: ["ID_Location"] });
  return Boolean(row);
};

export const listSubLocations = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const locationIdFilter = req.query?.locationId ? Number(req.query.locationId) : null;

    const whereClauses: Record<string, unknown>[] = [];

    if (search) {
      whereClauses.push({
        [Op.or]: [
          { Name: { [Op.like]: `%${search}%` } },
          { Type: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    if (locationIdFilter && Number.isInteger(locationIdFilter) && locationIdFilter > 0) {
      whereClauses.push({ LocationId: locationIdFilter });
    }

    const where = whereClauses.length ? { [Op.and]: whereClauses } : undefined;

    const rows = await SubLocation.findAll({
      where,
      attributes: listAttributes,
      order: [["Name", "ASC"]]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getSubLocationById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await SubLocation.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "SubLocation not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createSubLocation = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeSubLocationPayload({ ...(req.body || {}) } as SubLocationPayload);
    const errors = validateSubLocationPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    if (!(await locationExists(Number(payload.LocationId)))) {
      return res
        .status(400)
        .json({ success: false, errors: ["LocationId must reference an existing Location"] });
    }

    const row = await SubLocation.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateSubLocation = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await SubLocation.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "SubLocation not found" });
    }

    const payload = normalizeSubLocationPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as SubLocationPayload);

    const errors = validateSubLocationPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    if (!(await locationExists(Number(payload.LocationId)))) {
      return res
        .status(400)
        .json({ success: false, errors: ["LocationId must reference an existing Location"] });
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteSubLocation = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await SubLocation.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "SubLocation not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "SubLocation deleted" });
  } catch (error) {
    return next(error);
  }
};
