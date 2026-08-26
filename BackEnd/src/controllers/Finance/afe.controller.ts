import {
  createAFE,
  getAFEById,
  listAFEs,
  updateAFE,
  updateAFEStatus,
  type AFEListQuery
} from "../../services/Finance/afe.service";

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

/**
 * TODO permissions (when available):
 * - finance.afe.read
 * - finance.afe.create
 * - finance.afe.update
 * - finance.afe.deactivate
 */

export const listAFEsHandler = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const result = await listAFEs((req.query || {}) as AFEListQuery);
    return res.status(200).json({
      success: true,
      message: "AFE list loaded",
      data: result.data,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (error) {
    return next(error);
  }
};

export const getAFEByIdHandler = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const id = Number(req.params?.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid AFE Id" });
    }

    const row = await getAFEById(id);
    if (!row) {
      return res.status(404).json({ success: false, message: "AFE not found" });
    }

    return res.status(200).json({ success: true, message: "AFE loaded", data: row });
  } catch (error) {
    return next(error);
  }
};

export const createAFEHandler = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const result = await createAFE((req.body || {}) as never);
    if (!result.ok) {
      return res.status(400).json({ success: false, errors: result.errors });
    }

    return res.status(201).json({
      success: true,
      message: "AFE created",
      data: result.data
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAFEHandler = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const id = Number(req.params?.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid AFE Id" });
    }

    const result = await updateAFE(id, (req.body || {}) as never);
    if ("notFound" in result && result.notFound) {
      return res.status(404).json({ success: false, message: "AFE not found" });
    }

    if (!result.ok) {
      return res.status(400).json({ success: false, errors: result.errors });
    }

    return res.status(200).json({
      success: true,
      message: "AFE updated",
      data: result.data
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAFEStatusHandler = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const id = Number(req.params?.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid AFE Id" });
    }

    const result = await updateAFEStatus(id, (req.body || {}) as never);
    if ("notFound" in result && result.notFound) {
      return res.status(404).json({ success: false, message: "AFE not found" });
    }

    if (!result.ok) {
      return res.status(400).json({ success: false, errors: result.errors });
    }

    return res.status(200).json({
      success: true,
      message: "AFE status updated",
      data: result.data
    });
  } catch (error) {
    return next(error);
  }
};
