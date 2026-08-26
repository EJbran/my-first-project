import { Op } from "sequelize";
import { CoaAccountGroup, ChartOfAccounts } from "../../model/Finance";
import {
  buildTypeClassWarning,
  ChartOfAccountsPayload,
  normalizeChartOfAccountsPayload,
  validateChartOfAccountsPayload
} from "../../validators/Finance/chartOfAccounts.validator";

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
  "Id",
  "NewAccountCode",
  "Type",
  "LegacyAcct",
  "CleanDescription",
  "LegacyDescription",
  "AccountClassName",
  "AccountGroupCode",
  "AccountGroupName",
  "SuggestedModule",
  "AnalyticTemplate",
  "IsActive",
  "CreatedAt",
  "UpdatedAt"
];

const parseAllowedTemplates = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|]/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};

const nextSequenceForGroup = async (accountGroupCode: string): Promise<string> => {
  const latest = await ChartOfAccounts.findOne({
    where: {
      AccountGroupCode: accountGroupCode,
      NewAccountCode: { [Op.like]: `%-${accountGroupCode}-%` }
    },
    order: [["NewAccountCode", "DESC"]],
    attributes: ["NewAccountCode"]
  });

  if (!latest?.NewAccountCode) {
    return "0001";
  }

  const parts = latest.NewAccountCode.split("-");
  const current = Number(parts[2] || "0");
  const next = Number.isFinite(current) ? current + 1 : 1;

  if (next > 9999) {
    throw new Error("Sequence overflow for this account group");
  }

  return String(next).padStart(4, "0");
};

const applyGroupDefaults = async (
  payload: ChartOfAccountsPayload
): Promise<{ payload: ChartOfAccountsPayload; errors: string[] }> => {
  const errors: string[] = [];

  if (!payload.AccountGroupCode) {
    errors.push("AccountGroupCode is required");
    return { payload, errors };
  }

  const group = await CoaAccountGroup.findOne({
    where: { AccountGroupCode: payload.AccountGroupCode }
  });

  if (!group) {
    errors.push("AccountGroupCode must exist in COA_AccountGroup");
    return { payload, errors };
  }

  if (!group.IsActive) {
    errors.push("Inactive account groups cannot be used for new accounts");
  }

  const withDefaults: ChartOfAccountsPayload = {
    ...payload,
    AccountClassName: payload.AccountClassName || group.AccountClassName,
    AccountGroupName: payload.AccountGroupName || group.AccountGroupName,
    SuggestedModule:
      payload.SuggestedModule === undefined || payload.SuggestedModule === null
        ? group.DefaultSuggestedModule
        : payload.SuggestedModule,
    AnalyticTemplate: payload.AnalyticTemplate || group.DefaultAnalyticTemplate
  };

  if (
    withDefaults.AccountClassName &&
    withDefaults.AccountClassName !== group.AccountClassName
  ) {
    errors.push("AccountClassName must match the selected account group");
  }

  if (
    withDefaults.AccountGroupName &&
    withDefaults.AccountGroupName !== group.AccountGroupName
  ) {
    errors.push("AccountGroupName must match the selected account group");
  }

  const allowedTemplates = parseAllowedTemplates(group.AllowedAnalyticTemplates);
  if (
    withDefaults.AnalyticTemplate &&
    allowedTemplates.length > 0 &&
    !allowedTemplates.includes(withDefaults.AnalyticTemplate)
  ) {
    errors.push(
      `AnalyticTemplate must be one of the group's AllowedAnalyticTemplates: ${allowedTemplates.join(", ")}`
    );
  }

  if (!withDefaults.NewAccountCode) {
    const sequence = await nextSequenceForGroup(group.AccountGroupCode);
    withDefaults.NewAccountCode = `${group.AccountClassCode}-${group.AccountGroupCode}-${sequence}`;
  } else {
    const expectedPrefix = `${group.AccountClassCode}-${group.AccountGroupCode}-`;
    if (!withDefaults.NewAccountCode.startsWith(expectedPrefix)) {
      errors.push(
        `NewAccountCode must start with ${expectedPrefix} using account group class and group codes`
      );
    }
  }

  return { payload: withDefaults, errors };
};

export const listChartOfAccounts = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const activeOnly = req.query?.activeOnly === "true" || req.query?.activeOnly === "1";
    const accountGroupCode = req.query?.accountGroupCode?.trim();

    const where = {
      ...(activeOnly ? { IsActive: true } : {}),
      ...(accountGroupCode ? { AccountGroupCode: accountGroupCode } : {}),
      ...(search
        ? {
            [Op.or]: [
              { NewAccountCode: { [Op.like]: `%${search}%` } },
              { LegacyAcct: { [Op.like]: `%${search}%` } },
              { CleanDescription: { [Op.like]: `%${search}%` } },
              { LegacyDescription: { [Op.like]: `%${search}%` } },
              { AccountGroupName: { [Op.like]: `%${search}%` } },
              { AccountClassName: { [Op.like]: `%${search}%` } }
            ]
          }
        : {})
    };

    const rows = await ChartOfAccounts.findAll({
      where: Object.keys(where).length ? where : undefined,
      attributes: listAttributes,
      order: [["NewAccountCode", "ASC"]]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getChartOfAccountsById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await ChartOfAccounts.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Chart of accounts entry not found" });
    }

    const warning = buildTypeClassWarning(row.get({ plain: true }) as ChartOfAccountsPayload);
    return res.status(200).json({
      success: true,
      data: row,
      warning: warning || undefined
    });
  } catch (error) {
    return next(error);
  }
};

export const createChartOfAccounts = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    let payload = normalizeChartOfAccountsPayload({ ...(req.body || {}) } as ChartOfAccountsPayload);
    const applied = await applyGroupDefaults(payload);
    payload = normalizeChartOfAccountsPayload(applied.payload);

    const errors = [...applied.errors, ...validateChartOfAccountsPayload(payload)];

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const duplicate = await ChartOfAccounts.findOne({
      where: { NewAccountCode: payload.NewAccountCode as string }
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        errors: ["NewAccountCode must be unique"]
      });
    }

    const group = await CoaAccountGroup.findOne({
      where: { AccountGroupCode: payload.AccountGroupCode as string }
    });
    if (!group?.IsActive) {
      return res.status(400).json({
        success: false,
        errors: ["Inactive account groups cannot be used for new accounts"]
      });
    }

    const now = new Date();
    const row = await ChartOfAccounts.create({
      ...payload,
      CreatedAt: now,
      UpdatedAt: now
    } as never);

    const warning = buildTypeClassWarning(payload);
    return res.status(201).json({
      success: true,
      data: row,
      warning: warning || undefined
    });
  } catch (error) {
    return next(error);
  }
};

export const updateChartOfAccounts = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await ChartOfAccounts.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Chart of accounts entry not found" });
    }

    const body = { ...(req.body || {}) } as ChartOfAccountsPayload;
    if (row.LegacyAcct) {
      delete body.LegacyAcct;
    }
    if (row.LegacyDescription) {
      delete body.LegacyDescription;
    }

    let payload = normalizeChartOfAccountsPayload({
      ...row.get({ plain: true }),
      ...body
    } as ChartOfAccountsPayload);

    const applied = await applyGroupDefaults(payload);
    const groupChanged = payload.AccountGroupCode !== row.AccountGroupCode;
    const groupErrors = applied.errors.filter((error) => {
      if (
        !groupChanged &&
        error === "Inactive account groups cannot be used for new accounts"
      ) {
        return false;
      }
      return true;
    });

    payload = normalizeChartOfAccountsPayload(applied.payload);
    const errors = [...groupErrors, ...validateChartOfAccountsPayload(payload)];

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const duplicate = await ChartOfAccounts.findOne({
      where: {
        NewAccountCode: payload.NewAccountCode as string,
        Id: { [Op.ne]: row.Id }
      }
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        errors: ["NewAccountCode must be unique"]
      });
    }

    await row.update({
      ...payload,
      LegacyAcct: row.LegacyAcct,
      LegacyDescription: row.LegacyDescription,
      UpdatedAt: new Date()
    } as never);

    const warning = buildTypeClassWarning(payload);
    return res.status(200).json({
      success: true,
      data: row,
      warning: warning || undefined
    });
  } catch (error) {
    return next(error);
  }
};

/** Soft-delete: deactivate the account. Hard delete is not allowed. */
export const deleteChartOfAccounts = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await ChartOfAccounts.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Chart of accounts entry not found" });
    }

    await row.update({ IsActive: false, UpdatedAt: new Date() });
    return res.status(200).json({
      success: true,
      message: "Chart of accounts entry deactivated",
      data: row
    });
  } catch (error) {
    return next(error);
  }
};
