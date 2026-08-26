import { Op, Sequelize } from "sequelize";
import { Bank, BankSerialCheck } from "../../model/Finance";
import {
  BankSerialCheckPayload,
  formatSqlServerDateTime,
  normalizeBankSerialCheckPayload,
  toOptionalSqlDateTime,
  validateBankSerialCheckPayload
} from "../../validators/Finance/bankSerialCheck.validator";

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
  "ID_BANK_SERIAL_CHECKS",
  "From_Check",
  "To_Check",
  "Creation_date",
  "BANKID"
];

const toCreationDateLiteral = (value: unknown) => {
  const formatted = toOptionalSqlDateTime(value) ?? formatSqlServerDateTime(new Date());
  const safe = formatted.replace(/'/g, "''");
  return Sequelize.literal(`CONVERT(DATETIME, N'${safe}', 120)`);
};

export const listBankSerialChecks = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const search = req.query?.search?.trim();
    const bankId = req.query?.bankId?.trim();

    const where =
      bankId || search
        ? {
            ...(bankId ? { BANKID: Number(bankId) } : {}),
            ...(search
              ? {
                  [Op.or]: [
                    { From_Check: { [Op.like]: `%${search}%` } },
                    { To_Check: { [Op.like]: `%${search}%` } }
                  ]
                }
              : {})
          }
        : undefined;

    const rows = await BankSerialCheck.findAll({
      where,
      attributes: listAttributes,
      include: [
        {
          model: Bank,
          as: "Bank",
          attributes: ["Id", "Branch", "BankId", "GLCreditAccount"],
          required: false
        }
      ],
      order: [
        ["BANKID", "ASC"],
        ["ID_BANK_SERIAL_CHECKS", "ASC"]
      ]
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getBankSerialCheckById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await BankSerialCheck.findByPk(Number(req.params?.id), {
      include: [
        {
          model: Bank,
          as: "Bank",
          attributes: ["Id", "Branch", "BankId", "GLCreditAccount"],
          required: false
        }
      ]
    });

    if (!row) {
      return res.status(404).json({ success: false, message: "Bank serial check not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createBankSerialCheck = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = normalizeBankSerialCheckPayload({
      ...(req.body || {}),
      Creation_date:
        (req.body as BankSerialCheckPayload | undefined)?.Creation_date ??
        formatSqlServerDateTime(new Date())
    } as BankSerialCheckPayload);

    if (!payload.Creation_date) {
      payload.Creation_date = formatSqlServerDateTime(new Date());
    }

    const errors = validateBankSerialCheckPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await BankSerialCheck.create({
      From_Check: payload.From_Check,
      To_Check: payload.To_Check,
      BANKID: payload.BANKID,
      Creation_date: toCreationDateLiteral(payload.Creation_date)
    } as never);

    await row.reload();
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateBankSerialCheck = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await BankSerialCheck.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Bank serial check not found" });
    }

    const payload = normalizeBankSerialCheckPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as BankSerialCheckPayload);

    const errors = validateBankSerialCheckPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update({
      From_Check: payload.From_Check,
      To_Check: payload.To_Check,
      BANKID: payload.BANKID,
      Creation_date: toCreationDateLiteral(payload.Creation_date)
    } as never);

    await row.reload();
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteBankSerialCheck = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await BankSerialCheck.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Bank serial check not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Bank serial check deleted" });
  } catch (error) {
    return next(error);
  }
};
