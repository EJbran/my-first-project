import { Op } from "sequelize";
import { AdGroupRoleMapping } from "../../model/Authentication";
import {
  AdGroupRoleMappingPayload,
  validateAdGroupRoleMappingPayload
} from "../../validators/Authentication/adGroupRoleMapping.validator";

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

export const listAdGroupRoleMappings = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const where: Record<string, unknown> = {};

    if (req.query?.authDomainId) {
      where.AuthDomainId = Number(req.query.authDomainId);
    }

    if (req.query?.roleId) {
      where.RoleId = Number(req.query.roleId);
    }

    if (req.query?.entraGroupObjectId) {
      where.EntraGroupObjectId = req.query.entraGroupObjectId;
    }

    if (req.query?.adGroupSid) {
      where.AdGroupSid = req.query.adGroupSid;
    }

    if (typeof req.query?.isActive === "string") {
      where.IsActive = req.query.isActive.toLowerCase() === "true";
    }

    if (req.query?.search) {
      where[Op.or as unknown as string] = [
        {
          AdGroupName: {
            [Op.like]: `%${req.query.search}%`
          }
        },
        {
          AdGroupSid: {
            [Op.like]: `%${req.query.search}%`
          }
        }
      ];
    }

    const rows = await AdGroupRoleMapping.findAll({ where });
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getAdGroupRoleMappingById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AdGroupRoleMapping.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Mapping not found" });
    }
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createAdGroupRoleMapping = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = (req.body || {}) as AdGroupRoleMappingPayload;
    const errors = validateAdGroupRoleMappingPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await AdGroupRoleMapping.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateAdGroupRoleMapping = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AdGroupRoleMapping.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Mapping not found" });
    }

    const payload = (req.body || {}) as AdGroupRoleMappingPayload;
    const merged = {
      ...row.get({ plain: true }),
      ...payload
    };
    const errors = validateAdGroupRoleMappingPayload(merged);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateAdGroupRoleMappingStatus = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AdGroupRoleMapping.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Mapping not found" });
    }

    const isActive = Boolean(req.body?.IsActive);
    row.IsActive = isActive;
    await row.save();

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdGroupRoleMapping = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AdGroupRoleMapping.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Mapping not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Mapping deleted" });
  } catch (error) {
    return next(error);
  }
};
