import { Op } from "sequelize";
import { Bank, BankGeneral } from "../../model/Finance";
import {
  BankPayload,
  normalizeBankPayload,
  validateBankPayload
} from "../../validators/Finance/bank.validator";

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

const listAttributes = ["Id", "BankId", "Branch", "SerialNum_Id", "GLCreditAccount"];

export const listBanks = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const where = search
      ? {
          [Op.or]: [
            { Branch: { [Op.like]: `%${search}%` } },
            { GLCreditAccount: { [Op.like]: `%${search}%` } },
            { "$BankGeneral.BackName$": { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined;

    const rows = await Bank.findAll({
      where,
      attributes: listAttributes,
      include: [
        {
          model: BankGeneral,
          as: "BankGeneral",
          attributes: ["Id", "BackName"],
          required: false
        }
      ],
      order: [["Id", "ASC"]],
      subQuery: false
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getBankById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Bank.findByPk(Number(req.params?.id), {
      include: [
        {
          model: BankGeneral,
          as: "BankGeneral",
          attributes: ["Id", "BackName"],
          required: false
        }
      ]
    });

    if (!row) {
      return res.status(404).json({ success: false, message: "Bank not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createBank = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeBankPayload({ ...(req.body || {}) } as BankPayload);
    const errors = validateBankPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await Bank.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateBank = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Bank.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Bank not found" });
    }

    const payload = normalizeBankPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as BankPayload);

    const errors = validateBankPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteBank = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Bank.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Bank not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Bank deleted" });
  } catch (error) {
    return next(error);
  }
};
