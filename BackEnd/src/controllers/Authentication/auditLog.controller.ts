import { Op } from "sequelize";
import { AuditLog, User } from "../../model/Authentication";

type RequestLike = {
  query?: Record<string, string | undefined>;
};

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

const parseData = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const listAssetAuditLogs = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const page = Math.max(0, Number.parseInt(req.query?.page ?? "0", 10) || 0);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query?.pageSize ?? "10", 10) || 10));
    const where: Record<string | symbol, unknown> = { EntityName: "Asset" };
    const assetId = req.query?.assetId?.trim();
    const assetCode = req.query?.assetCode?.trim();
    const userSearch = req.query?.user?.trim();
    const action = req.query?.action?.trim();
    const dateFrom = req.query?.dateFrom?.trim();
    const dateTo = req.query?.dateTo?.trim();

    if (assetId) where.EntityId = assetId;
    if (action) where.Action = { [Op.like]: `%${action}%` };

    if (assetCode) {
      where[Op.or] = [
        { OldData: { [Op.like]: `%${assetCode}%` } },
        { NewData: { [Op.like]: `%${assetCode}%` } }
      ];
    }

    if (dateFrom || dateTo) {
      const createdAt: Record<string | symbol, Date> = {};
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00.000Z`);
        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid dateFrom" });
        }
        createdAt[Op.gte] = from;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T00:00:00.000Z`);
        if (Number.isNaN(to.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid dateTo" });
        }
        to.setUTCDate(to.getUTCDate() + 1);
        createdAt[Op.lt] = to;
      }
      where.CreatedAt = createdAt;
    }

    const result = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: "ActorUser",
        attributes: ["Id", "Username", "DisplayName", "Email"],
        required: Boolean(userSearch),
        ...(userSearch ? {
          where: {
            [Op.or]: [
              { Username: { [Op.like]: `%${userSearch}%` } },
              { DisplayName: { [Op.like]: `%${userSearch}%` } },
              { Email: { [Op.like]: `%${userSearch}%` } }
            ]
          }
        } : {})
      }],
      limit: pageSize,
      offset: page * pageSize,
      order: [["CreatedAt", "DESC"], ["Id", "DESC"]],
      distinct: true
    });

    const data = result.rows.map((entry) => {
      const row = entry.get({ plain: true }) as Record<string, unknown>;
      const actor = row.ActorUser as { DisplayName?: string | null; Username?: string | null; Email?: string | null } | null;
      return {
        ...row,
        ActorUserName: actor?.DisplayName || actor?.Username || actor?.Email || null,
        OldData: parseData(row.OldData),
        NewData: parseData(row.NewData)
      };
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total: result.count,
        totalPages: Math.ceil(result.count / pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
};