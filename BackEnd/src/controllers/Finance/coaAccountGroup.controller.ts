import { Op } from "sequelize";
import { CoaAccountGroup, ChartOfAccounts } from "../../model/Finance";
import {
  CoaAccountGroupPayload,
  normalizeCoaAccountGroupPayload,
  validateCoaAccountGroupPayload
} from "../../validators/Finance/coaAccountGroup.validator";

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
  "id_AccountGroupCode",
  "AccountGroupCode",
  "AccountClassCode",
  "AccountClassName",
  "AccountGroupName",
  "DefaultSuggestedModule",
  "DefaultAnalyticTemplate",
  "AllowedAnalyticTemplates",
  "IsActive",
  "CreatedAt",
  "UpdatedAt"
];

export const listCoaAccountGroups = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const activeOnly = req.query?.activeOnly === "true" || req.query?.activeOnly === "1";

    const where = {
      ...(activeOnly ? { IsActive: true } : {}),
      ...(search
        ? {
            [Op.or]: [
              { AccountGroupCode: { [Op.like]: `%${search}%` } },
              { AccountGroupName: { [Op.like]: `%${search}%` } },
              { AccountClassName: { [Op.like]: `%${search}%` } },
              { DefaultSuggestedModule: { [Op.like]: `%${search}%` } }
            ]
          }
        : {})
    };

    const rows = await CoaAccountGroup.findAll({
      where: Object.keys(where).length ? where : undefined,
      attributes: listAttributes,
      order: [
        ["AccountClassCode", "ASC"],
        ["AccountGroupCode", "ASC"]
      ]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getCoaAccountGroupById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await CoaAccountGroup.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Account group not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createCoaAccountGroup = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = normalizeCoaAccountGroupPayload({ ...(req.body || {}) } as CoaAccountGroupPayload);
    const errors = validateCoaAccountGroupPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const existing = await CoaAccountGroup.findOne({
      where: { AccountGroupCode: payload.AccountGroupCode as string }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        errors: ["AccountGroupCode must be unique"]
      });
    }

    const now = new Date();
    const row = await CoaAccountGroup.create({
      ...payload,
      CreatedAt: now,
      UpdatedAt: now
    } as never);

    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateCoaAccountGroup = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await CoaAccountGroup.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Account group not found" });
    }

    const payload = normalizeCoaAccountGroupPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as CoaAccountGroupPayload);

    const errors = validateCoaAccountGroupPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const duplicate = await CoaAccountGroup.findOne({
      where: {
        AccountGroupCode: payload.AccountGroupCode as string,
        id_AccountGroupCode: { [Op.ne]: row.id_AccountGroupCode }
      }
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        errors: ["AccountGroupCode must be unique"]
      });
    }

    await row.update({
      ...payload,
      UpdatedAt: new Date()
    } as never);

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteCoaAccountGroup = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await CoaAccountGroup.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Account group not found" });
    }

    const accountCount = await ChartOfAccounts.count({
      where: { AccountGroupCode: row.AccountGroupCode }
    });

    if (accountCount > 0) {
      await row.update({ IsActive: false, UpdatedAt: new Date() });
      return res.status(200).json({
        success: true,
        message:
          "Account group has linked accounts and cannot be deleted. It was deactivated instead.",
        data: row
      });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Account group deleted" });
  } catch (error) {
    return next(error);
  }
};
