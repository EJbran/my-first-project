import { Op } from "sequelize";
import { Bank, BankGeneral, sequelize } from "../../model/Finance";
import {
  BankGeneralPayload,
  normalizeBankGeneralPayload,
  validateBankGeneralPayload
} from "../../validators/Finance/bankGeneral.validator";

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

export const listBankGenerals = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const where = search
      ? {
          BackName: { [Op.like]: `%${search}%` }
        }
      : undefined;

    const [rows, branchCounts] = await Promise.all([
      BankGeneral.findAll({
        where,
        attributes: ["Id", "BackName"],
        order: [["BackName", "ASC"]]
      }),
      Bank.findAll({
        attributes: [
          "BankId",
          [sequelize.fn("COUNT", sequelize.col("Id")), "BranchCount"]
        ],
        where: {
          BankId: { [Op.ne]: null }
        },
        group: ["BankId"],
        raw: true
      })
    ]);

    const countByBankId = new Map<number, number>();
    for (const item of branchCounts as unknown as Array<{
      BankId: number | null;
      BranchCount: number | string;
    }>) {
      if (item.BankId == null) {
        continue;
      }
      countByBankId.set(Number(item.BankId), Number(item.BranchCount ?? 0));
    }

    const data = rows.map((row) => ({
      Id: row.Id,
      BackName: row.BackName,
      BranchCount: countByBankId.get(row.Id) ?? 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const getBankGeneralById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await BankGeneral.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Bank general not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createBankGeneral = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeBankGeneralPayload({ ...(req.body || {}) } as BankGeneralPayload);
    const errors = validateBankGeneralPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await BankGeneral.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateBankGeneral = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await BankGeneral.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Bank general not found" });
    }

    const payload = normalizeBankGeneralPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as BankGeneralPayload);

    const errors = validateBankGeneralPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteBankGeneral = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await BankGeneral.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Bank general not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Bank general deleted" });
  } catch (error) {
    return next(error);
  }
};
