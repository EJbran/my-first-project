import { AuthDomain } from "../../model/Authentication";
import {
  AuthDomainPayload,
  normalizeAuthDomainPayload,
  validateAuthDomainPayload
} from "../../validators/Authentication/authDomain.validator";

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

export const listAuthDomains = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const where: Record<string, unknown> = {};
    if (typeof req.query?.isActive === "string") {
      where.IsActive = req.query.isActive.toLowerCase() === "true";
    }

    if (req.query?.authMethod) {
      where.AuthMethod = req.query.authMethod;
    }

    const rows = await AuthDomain.findAll({ where });
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getAuthDomainById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AuthDomain.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Auth domain not found" });
    }
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createAuthDomain = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = normalizeAuthDomainPayload({ ...(req.body || {}) } as AuthDomainPayload);
    const errors = validateAuthDomainPayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const row = await AuthDomain.create(payload as never);
    return res.status(201).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateAuthDomain = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AuthDomain.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Auth domain not found" });
    }

    const payload = normalizeAuthDomainPayload({
      ...row.get({ plain: true }),
      ...(req.body || {})
    } as AuthDomainPayload);

    const errors = validateAuthDomainPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    if (payload.AuthMethod === "OIDC" && "ClientSecret" in payload) {
      delete (payload as Record<string, unknown>).ClientSecret;
    }

    await row.update(payload);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const updateAuthDomainStatus = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AuthDomain.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Auth domain not found" });
    }

    row.IsActive = Boolean(req.body?.IsActive);
    await row.save();
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteAuthDomain = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await AuthDomain.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Auth domain not found" });
    }

    await row.destroy();
    return res.status(200).json({ success: true, message: "Auth domain deleted" });
  } catch (error) {
    return next(error);
  }
};
