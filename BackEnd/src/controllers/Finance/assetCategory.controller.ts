import { Op } from "sequelize";
import { AssetCategory } from "../../model/Finance";
import {
  AssetCategoryPayload,
  normalizeAssetCategoryPayload,
  validateAssetCategoryPayload
} from "../../validators/Finance/assetCategory.validator";

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
  "CategoryID",
  "CategoryName",
  "Percentage",
  "DepAccountID",
  "CreditAccountID",
  "Description"
];

export const listAssetCategories = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const search = req.query?.search?.trim();
    const rows = await AssetCategory.findAll({
      where: search
        ? {
            [Op.or]: [
              { CategoryName: { [Op.like]: `%${search}%` } },
              { Description: { [Op.like]: `%${search}%` } }
            ]
          }
        : undefined,
      attributes: listAttributes,
      order: [["CategoryID", "ASC"]]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getAssetCategoryById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AssetCategory.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Asset category not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createAssetCategory = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = normalizeAssetCategoryPayload({
      ...(req.body || {})
    } as AssetCategoryPayload);
    const errors = validateAssetCategoryPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await AssetCategory.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateAssetCategory = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AssetCategory.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Asset category not found" });
    }

    const payload = normalizeAssetCategoryPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as AssetCategoryPayload);
    const errors = validateAssetCategoryPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const updatePayload = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => value !== null && value !== undefined)
    );

    await row.update(updatePayload as never);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteAssetCategory = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AssetCategory.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Asset category not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Asset category deleted" });
  } catch (error) {
    return next(error);
  }
};
