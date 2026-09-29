import { Op } from "sequelize";
import { Asset, AssetCategory, Department, sequelize, SubLocation } from "../../model/Finance";
import { recordAudit } from "../Authentication/audit.service";
import {
  AssetPayload,
  normalizeAssetPayload,
  validateAssetPayload
} from "../../validators/Finance/asset.validator";

type RequestLike = {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: { id: number; username: string };
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

const listAttributes = [
  "AssetID",
  "AssetCode",
  "AssetDescription",
  "CategoryID",
  "SubLocationID",
  "DepartmentID",
  "PurchaseDate",
  "InsertedDate",
  "PurchaseCost",
  "BookValue",
  "OpeningBalanceBookValue",
  "DepreciationValue",
  "NetValue",
  "ResponsibleID",
  "ResponsibleNote",
  "Status"
];


const categoryInclude = {
  model: AssetCategory,
  as: "Category",
  attributes: ["CategoryID", "CategoryName"]
};
const departmentInclude = {
  model: Department,
  as: "Department",
  attributes: [
    "Id",
    "DepartmentName_Arabic",
    "DepartmentName_English"
  ]
};

const subLocationInclude = {
  model: SubLocation,
  as: "SubLocation",
  attributes: [
    "Id",
    "Name",
    "Type",
    "LocationId"
  ]
};

export const listAssets = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();

    const where = search
      ? {
          [Op.or]: [
            { AssetCode: { [Op.like]: `%${search}%` } },
            { AssetDescription: { [Op.like]: `%${search}%` } },
            { Status: { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined;

    const rows = await Asset.findAll({
      where,
      attributes: listAttributes,
      include: [categoryInclude, departmentInclude, subLocationInclude],
      order: [["AssetID", "ASC"]],
      subQuery: false
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getAssetById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Asset.findByPk(Number(req.params?.id), {
      include: [categoryInclude, departmentInclude, subLocationInclude]
    });

    if (!row) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createAsset = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeAssetPayload({ ...(req.body || {}) } as AssetPayload);
    const errors = validateAssetPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const { AssetID: _AssetID, ...createPayload } = payload;
    const row = await sequelize.transaction(async (transaction) => {
      const created = await Asset.create(createPayload as never, { transaction });
      await recordAudit({
        actorUserId: req.user?.id,
        action: "CREATE",
        module: "Assets",
        entityName: "Asset",
        entityId: String(created.AssetID),
        newData: created.get({ plain: true }),
        requestInfo: {
          ipAddress: req.ip,
          userAgent: typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
          requestId: typeof req.headers?.["x-request-id"] === "string" ? req.headers["x-request-id"] : null
        },
        transaction
      });
      return created;
    });
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateAsset = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Asset.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const oldData = row.get({ plain: true });
    const payload = normalizeAssetPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as AssetPayload);

    const errors = validateAssetPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const { AssetID: _AssetID, ...updatePayload } = payload;
    const updatedRow = await sequelize.transaction(async (transaction) => {
      await row.update(updatePayload as never, { transaction });
      await recordAudit({
        actorUserId: req.user?.id,
        action: "UPDATE",
        module: "Assets",
        entityName: "Asset",
        entityId: String(row.AssetID),
        oldData,
        newData: row.get({ plain: true }),
        requestInfo: {
          ipAddress: req.ip,
          userAgent: typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
          requestId: typeof req.headers?.["x-request-id"] === "string" ? req.headers["x-request-id"] : null
        },
        transaction
      });
      return Asset.findByPk(Number(req.params?.id), {
        include: [categoryInclude, departmentInclude, subLocationInclude],
        transaction
      });
    });
    
    return res.status(200).json({ success: true, data: updatedRow });
  } catch (error) {
    return next(error);
  }
};

export const deleteAsset = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Asset.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    await sequelize.transaction(async (transaction) => {
      await recordAudit({
        actorUserId: req.user?.id,
        action: "DELETE",
        module: "Assets",
        entityName: "Asset",
        entityId: String(row.AssetID),
        oldData: row.get({ plain: true }),
        requestInfo: {
          ipAddress: req.ip,
          userAgent: typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
          requestId: typeof req.headers?.["x-request-id"] === "string" ? req.headers["x-request-id"] : null
        },
        transaction
      });
      await row.destroy({ transaction });
    });
    return res.status(200).json({ success: true, message: "Asset deleted" });
  } catch (error) {
    return next(error);
  }
};
