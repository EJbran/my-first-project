import { Op, WhereOptions } from "sequelize";
import { AFE } from "../../model/Finance";
import type { AFEAttributes } from "../../model/Finance/AFE";
import { Department, Location } from "../../model/General";
import {
  AFEPayload,
  AFEStatusPayload,
  normalizeAFEPayload,
  normalizeAFEStatusPayload,
  validateAFEPayload,
  validateAFEStatusPayload
} from "../../validators/Finance/afe.validator";

export type AFEListQuery = {
  page?: string;
  pageSize?: string;
  search?: string;
  ImportBatchNo?: string;
  AFENo?: string;
  LegacyLocationCode?: string;
  LegacyDepartmentCode?: string;
  EPSAId?: string;
  DepartmentId?: string;
  LocationId?: string;
  AFEType?: string;
  AFECategory?: string;
  ProjectNature?: string;
  Priority?: string;
  Status?: string;
  IsActive?: string;
  CurrencyCode?: string;
};

export type AFEResponse = AFEAttributes & {
  RemainingBudget: number | null;
  DepartmentName: string | null;
  DepartmentNameArabic: string | null;
  LocationName: string | null;
  LocationNameArabic: string | null;
  LocationCode: string | null;
  Department?: {
    Id: number;
    DepartmentName_English: string;
    DepartmentName_Arabic: string;
  } | null;
  Location?: {
    ID_Location: number;
    LocationName_en: string;
    LocationName_ar: string | null;
    LocationCode: string;
  } | null;
};

const departmentAttributes = [
  "Id",
  "DepartmentName_English",
  "DepartmentName_Arabic"
] as const;

const locationAttributes = [
  "ID_Location",
  "LocationName_en",
  "LocationName_ar",
  "LocationCode"
] as const;

const afeIncludes = [
  {
    model: Department,
    as: "Department",
    attributes: [...departmentAttributes],
    required: false
  },
  {
    model: Location,
    as: "Location",
    attributes: [...locationAttributes],
    required: false
  }
];

export type AFESummary = {
  total: number;
  active: number;
  onHold: number;
  closed: number;
  cancelled: number;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Positive integer from FK or legacy code string (e.g. "11" → 11). */
const toPositiveInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

type AFEPlain = AFEAttributes & {
  Department?: AFEResponse["Department"];
  Location?: AFEResponse["Location"];
};

const resolveDepartmentId = (plain: AFEPlain): number | null =>
  toPositiveInt(plain.DepartmentId) ?? toPositiveInt(plain.LegacyDepartmentCode);

const resolveLocationId = (plain: AFEPlain): number | null =>
  toPositiveInt(plain.LocationId) ?? toPositiveInt(plain.LegacyLocationCode);

/**
 * Imported AFEs often have null DepartmentId/LocationId and only legacy codes.
 * LegacyLocationCode maps to Location.ID_Location; LegacyDepartmentCode to Departments.Id.
 */
const enrichAFERows = async (rows: Array<AFE | AFEPlain>): Promise<AFEResponse[]> => {
  const plains: AFEPlain[] = rows.map((row) =>
    typeof (row as AFE).get === "function"
      ? ((row as AFE).get({ plain: true }) as AFEPlain)
      : (row as AFEPlain)
  );

  const departmentIds = new Set<number>();
  const locationIds = new Set<number>();

  plains.forEach((plain) => {
    const departmentId = resolveDepartmentId(plain);
    const locationId = resolveLocationId(plain);
    if (departmentId !== null) {
      departmentIds.add(departmentId);
    }
    if (locationId !== null) {
      locationIds.add(locationId);
    }
  });

  const [departments, locations] = await Promise.all([
    departmentIds.size
      ? Department.findAll({
          where: { Id: [...departmentIds] },
          attributes: [...departmentAttributes]
        })
      : Promise.resolve([]),
    locationIds.size
      ? Location.findAll({
          where: { ID_Location: [...locationIds] },
          attributes: [...locationAttributes]
        })
      : Promise.resolve([])
  ]);

  const departmentById = new Map(
    departments.map((row) => {
      const plain = row.get({ plain: true }) as NonNullable<AFEResponse["Department"]>;
      return [plain.Id, plain] as const;
    })
  );
  const locationById = new Map(
    locations.map((row) => {
      const plain = row.get({ plain: true }) as NonNullable<AFEResponse["Location"]>;
      return [plain.ID_Location, plain] as const;
    })
  );

  return plains.map((plain) => {
    const departmentId = resolveDepartmentId(plain);
    const locationId = resolveLocationId(plain);
    const department =
      plain.Department ??
      (departmentId !== null ? departmentById.get(departmentId) ?? null : null);
    const location =
      plain.Location ??
      (locationId !== null ? locationById.get(locationId) ?? null : null);

    return toAFEResponse({
      ...plain,
      Department: department,
      Location: location
    });
  });
};

export const calculateRemainingBudget = (
  approvedBudget: unknown,
  committedAmount: unknown,
  actualAmount: unknown
): number | null => {
  const approved = toNumber(approvedBudget);
  if (approved === null) {
    return null;
  }

  const committed = toNumber(committedAmount) ?? 0;
  const actual = toNumber(actualAmount) ?? 0;
  return Number((approved - committed - actual).toFixed(2));
};

export const toAFEResponse = (row: AFE | Record<string, unknown>): AFEResponse => {
  const plain =
    typeof (row as AFE).get === "function"
      ? ((row as AFE).get({ plain: true }) as AFEPlain)
      : (row as AFEPlain);

  const department = plain.Department ?? null;
  const location = plain.Location ?? null;

  return {
    ...plain,
    EstimatedBudget: toNumber(plain.EstimatedBudget),
    ApprovedBudget: toNumber(plain.ApprovedBudget),
    CommittedAmount: toNumber(plain.CommittedAmount) ?? 0,
    ActualAmount: toNumber(plain.ActualAmount) ?? 0,
    RemainingBudget: calculateRemainingBudget(
      plain.ApprovedBudget,
      plain.CommittedAmount,
      plain.ActualAmount
    ),
    Department: department,
    Location: location,
    DepartmentName:
      department?.DepartmentName_English?.trim() ||
      plain.LegacyDepartmentName?.trim() ||
      null,
    DepartmentNameArabic: department?.DepartmentName_Arabic?.trim() || null,
    LocationName: location?.LocationName_en?.trim() || null,
    LocationNameArabic: location?.LocationName_ar?.trim() || null,
    LocationCode: location?.LocationCode?.trim() || null
  };
};

const parseOptionalBoolFilter = (value?: string): boolean | undefined => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return undefined;
};

const buildWhere = (query: AFEListQuery): WhereOptions => {
  const and: WhereOptions[] = [];

  const exactFilters: Array<[keyof AFEListQuery, string]> = [
    ["ImportBatchNo", "ImportBatchNo"],
    ["AFENo", "AFENo"],
    ["LegacyLocationCode", "LegacyLocationCode"],
    ["LegacyDepartmentCode", "LegacyDepartmentCode"],
    ["AFEType", "AFEType"],
    ["AFECategory", "AFECategory"],
    ["ProjectNature", "ProjectNature"],
    ["Priority", "Priority"],
    ["Status", "Status"],
    ["CurrencyCode", "CurrencyCode"]
  ];

  exactFilters.forEach(([queryKey, field]) => {
    const value = query[queryKey]?.trim();
    if (value) {
      and.push({ [field]: value });
    }
  });

  const idFilters: Array<[keyof AFEListQuery, string]> = [
    ["EPSAId", "EPSAId"],
    ["DepartmentId", "DepartmentId"],
    ["LocationId", "LocationId"]
  ];

  idFilters.forEach(([queryKey, field]) => {
    const raw = query[queryKey]?.trim();
    if (!raw) {
      return;
    }

    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      and.push({ [field]: parsed });
    }
  });

  const isActive = parseOptionalBoolFilter(query.IsActive);
  if (isActive !== undefined) {
    and.push({ IsActive: isActive });
  }

  const search = query.search?.trim();
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    const orFilters: WhereOptions[] = [
      { ImportBatchNo: like },
      { AFENo: like },
      { AFEDescription: like },
      { AFEDescriptionArabic: like },
      { LegacyDescription: like },
      { LegacyLocationCode: like },
      { LegacyDepartmentCode: like },
      { AFEType: like },
      { AFECategory: like },
      { Status: like },
      { Notes: like }
    ];

    const sourceLineNo = Number(search);
    if (Number.isInteger(sourceLineNo)) {
      orFilters.push({ SourceLineNo: sourceLineNo });
    }

    and.push({ [Op.or]: orFilters });
  }

  if (!and.length) {
    return {};
  }

  return { [Op.and]: and };
};

export const getAFESummary = async (): Promise<AFESummary> => {
  const [total, active, onHold, closed, cancelled] = await Promise.all([
    AFE.count(),
    AFE.count({ where: { Status: "ACTIVE" } }),
    AFE.count({ where: { Status: "ON_HOLD" } }),
    AFE.count({ where: { Status: "CLOSED" } }),
    AFE.count({ where: { Status: "CANCELLED" } })
  ]);

  return { total, active, onHold, closed, cancelled };
};

export const listAFEs = async (query: AFEListQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(1000, Math.max(1, Number(query.pageSize) || 50));
  const where = buildWhere(query);

  const [count, rows] = await Promise.all([
    AFE.count({ where }),
    AFE.findAll({
      where,
      include: afeIncludes,
      order: [
        ["SourceLineNo", "ASC"],
        ["Id", "ASC"]
      ],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      subQuery: false
    })
  ]);

  const [summary, data] = await Promise.all([
    getAFESummary(),
    enrichAFERows(rows)
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    },
    summary
  };
};

export const getAFEById = async (id: number) => {
  const row = await AFE.findByPk(id, { include: afeIncludes });
  if (!row) {
    return null;
  }

  const [enriched] = await enrichAFERows([row]);
  return enriched ?? null;
};

export const createAFE = async (body: AFEPayload) => {
  const payload = normalizeAFEPayload(body);
  const errors = validateAFEPayload(payload);

  if (errors.length) {
    return { ok: false as const, errors };
  }

  const created = await AFE.create(payload as never);
  const row = await AFE.findByPk(created.Id, { include: afeIncludes });
  const [enriched] = await enrichAFERows([row as AFE]);
  return { ok: true as const, data: enriched };
};

export const updateAFE = async (id: number, body: AFEPayload) => {
  const row = await AFE.findByPk(id);
  if (!row) {
    return { ok: false as const, notFound: true as const };
  }

  const current = row.get({ plain: true }) as AFEAttributes;
  const payload = normalizeAFEPayload({
    ...current,
    ...body,
    // Preserve legacy description unless explicitly provided in body.
    LegacyDescription:
      body.LegacyDescription !== undefined
        ? body.LegacyDescription
        : current.LegacyDescription
  } as AFEPayload);

  const errors = validateAFEPayload(payload);
  if (errors.length) {
    return { ok: false as const, errors };
  }

  await row.update(payload as never);
  const refreshed = await AFE.findByPk(id, { include: afeIncludes });
  const [enriched] = await enrichAFERows([refreshed as AFE]);
  return { ok: true as const, data: enriched };
};

export const updateAFEStatus = async (id: number, body: AFEStatusPayload) => {
  const row = await AFE.findByPk(id);
  if (!row) {
    return { ok: false as const, notFound: true as const };
  }

  const payload = normalizeAFEStatusPayload(body);
  const errors = validateAFEStatusPayload(payload);
  if (errors.length) {
    return { ok: false as const, errors };
  }

  const updates: Partial<AFEAttributes> = {};
  if (typeof payload.IsActive === "boolean") {
    updates.IsActive = payload.IsActive;
  }
  if (typeof payload.Status === "string") {
    updates.Status = payload.Status;
  }

  await row.update(updates as never);
  const refreshed = await AFE.findByPk(id, { include: afeIncludes });
  const [enriched] = await enrichAFERows([refreshed as AFE]);
  return { ok: true as const, data: enriched };
};
