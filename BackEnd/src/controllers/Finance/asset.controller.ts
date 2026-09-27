import { Op } from "sequelize";
import { Asset, AssetCategory, Department, SubLocation } from "../../model/Finance";
import {
  AssetPayload,
  normalizeAssetPayload,
  validateAssetPayload
} from "../../validators/Finance/asset.validator";

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
const row = await Asset.create(createPayload as never);
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

    const payload = normalizeAssetPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as AssetPayload);

    const errors = validateAssetPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const { AssetID: _AssetID, ...updatePayload } = payload;
    await row.update(updatePayload as never);
    
    // Reload with relationships
    const updatedRow = await Asset.findByPk(Number(req.params?.id), {
      include: [categoryInclude, departmentInclude, subLocationInclude]
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

    await row.destroy();
    return res.status(200).json({ success: true, message: "Asset deleted" });
  } catch (error) {
    return next(error);
  }
};
