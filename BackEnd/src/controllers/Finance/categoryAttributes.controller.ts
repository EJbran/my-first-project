import { Op } from "sequelize";
import { CategoryAttributes } from "../../model/Finance";
import {
  CategoryAttributesPayload,
  normalizeCategoryAttributesPayload,
  validateCategoryAttributesPayload
} from "../../validators/Finance/categoryAttributes.validator";

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

const listAttributes = ["CategoryID", "CategoryDetails"];

export const listCategoryAttributes = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const rows = await CategoryAttributes.findAll({
      attributes: listAttributes,
      order: [["CategoryID", "ASC"]]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getCategoryAttributesById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await CategoryAttributes.findByPk(Number(req.params?.id));
    if (!row) {
      return res
        .status(404)
        .json({ success: false, message: "Category attributes not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createCategoryAttributes = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = normalizeCategoryAttributesPayload({
      ...(req.body || {})
    } as CategoryAttributesPayload);
    const errors = validateCategoryAttributesPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await CategoryAttributes.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateCategoryAttributes = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await CategoryAttributes.findByPk(Number(req.params?.id));
    if (!row) {
      return res
        .status(404)
        .json({ success: false, message: "Category attributes not found" });
    }

    const payload = normalizeCategoryAttributesPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as CategoryAttributesPayload);
    const errors = validateCategoryAttributesPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

   const updatePayload = {
  ...payload,
  CategoryDetails: payload.CategoryDetails ?? row.CategoryDetails
};

await row.update(updatePayload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteCategoryAttributes = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await CategoryAttributes.findByPk(Number(req.params?.id));
    if (!row) {
      return res
        .status(404)
        .json({ success: false, message: "Category attributes not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Category attributes deleted" });
  } catch (error) {
    return next(error);
  }
};
