import { QueryTypes, type Sequelize } from "sequelize";
import { Epsa, sequelize } from "../../../model/General";
import {
  EpsaPayload,
  normalizeEpsaPayload,
  validateEpsaPayload
} from "../../../validators/General/epsa.validator";

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

type EpsaRow = {
  Id: number;
  InterstName: string;
  NOC: number | null;
  PC: number | null;
  EPSAType: string | null;
};

const database = sequelize as Sequelize;

const pickEpsaType = (row: Record<string, unknown>): string | null => {
  const value =
    row.EPSAType ??
    row.EpsaType ??
    row.epsatype ??
    row["EPSAType"] ??
    null;

  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
};

const mapEpsaRow = (row: Record<string, unknown>): EpsaRow => ({
  Id: Number(row.Id),
  InterstName: String(row.InterstName ?? ""),
  NOC: row.NOC == null || row.NOC === "" ? null : Number(row.NOC),
  PC: row.PC == null || row.PC === "" ? null : Number(row.PC),
  EPSAType: pickEpsaType(row)
});

export const listEpsas = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();

    const rows = await database.query<Record<string, unknown>>(
      `
        SELECT
          [Id],
          [InterstName],
          [NOC],
          [PC],
          [EPSAType]
        FROM [dbo].[EPSA]
        ${search ? "WHERE [InterstName] LIKE :search" : ""}
        ORDER BY [InterstName] ASC
      `,
      {
        replacements: search ? { search: `%${search}%` } : undefined,
        type: QueryTypes.SELECT
      }
    );

    return res.status(200).json({
      success: true,
      data: rows.map((row) => mapEpsaRow(row))
    });
  } catch (error) {
    return next(error);
  }
};

export const getEpsaById = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const rows = await database.query<Record<string, unknown>>(
      `
        SELECT
          [Id],
          [InterstName],
          [NOC],
          [PC],
          [EPSAType]
        FROM [dbo].[EPSA]
        WHERE [Id] = :id
      `,
      {
        replacements: { id: Number(req.params?.id) },
        type: QueryTypes.SELECT
      }
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ success: false, message: "EPSA not found" });
    }

    return res.status(200).json({ success: true, data: mapEpsaRow(row) });
  } catch (error) {
    return next(error);
  }
};

export const createEpsa = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const payload = normalizeEpsaPayload({ ...(req.body || {}) } as EpsaPayload);
    const errors = validateEpsaPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await Epsa.create(payload as never);
    return res.status(201).json({
      success: true,
      data: mapEpsaRow(row.get({ plain: true }) as Record<string, unknown>)
    });
  } catch (error) {
    return next(error);
  }
};

export const updateEpsa = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Epsa.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "EPSA not found" });
    }

    const payload = normalizeEpsaPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as EpsaPayload);

    const errors = validateEpsaPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload);
    return res.status(200).json({
      success: true,
      data: mapEpsaRow(row.get({ plain: true }) as Record<string, unknown>)
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteEpsa = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const row = await Epsa.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "EPSA not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "EPSA deleted" });
  } catch (error) {
    return next(error);
  }
};
