import { Op } from "sequelize";
import { Department, Epsa, Location } from "../../model/General";
import {
  ChartOfAccounts,
  EpsaDepartmentChartAccount
} from "../../model/Finance";
import type { LocationAccessMode } from "../../model/Finance/EpsaDepartmentChartAccount";
import {
  EpsaDepartmentChartAccountPayload,
  normalizeEpsaDepartmentChartAccountPayload,
  validateEpsaDepartmentChartAccountPayload
} from "../../validators/Finance/epsaDepartmentChartAccount.validator";

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
  "EPSAId",
  "DepartmentId",
  "ChartAccountId",
  "LocationID",
  "LocationAccessMode",
  "IsAllAccounts",
  "IsActive",
  "CreatedAt",
  "UpdatedAt"
];

const locationInclude = {
  model: Location,
  as: "Location",
  attributes: ["ID_Location", "LocationName_en", "LocationName_ar", "LocationCode"],
  required: false
};

const isManagerDepartment = (department: Department | null): boolean =>
  Boolean(department && (department.DepartmentType || "").trim().toLowerCase() === "manager");

const resolveLocationTargets = async (
  mode: LocationAccessMode,
  locationIds: number[]
): Promise<{
  targets: Array<{ mode: LocationAccessMode; locationId: number | null }>;
  errors: string[];
}> => {
  if (mode === "ALL") {
    return { targets: [{ mode: "ALL", locationId: null }], errors: [] };
  }

  if (!locationIds.length) {
    return {
      targets: [],
      errors: [`At least one LocationID is required when LocationAccessMode is ${mode}`]
    };
  }

  const locations = await Location.findAll({
    where: { ID_Location: { [Op.in]: locationIds } },
    attributes: ["ID_Location"]
  });
  const found = new Set(locations.map((location) => Number(location.ID_Location)));
  const missing = locationIds.filter((id) => !found.has(id));

  if (missing.length) {
    return {
      targets: [],
      errors: missing.map((id) => `LocationID ${id} must exist in dbo.Location`)
    };
  }

  return {
    targets: locationIds.map((locationId) => ({ mode, locationId })),
    errors: []
  };
};

const upsertSelectedMapping = async (
  epsaId: number,
  departmentId: number,
  chartAccountId: number,
  locationAccessMode: LocationAccessMode,
  locationId: number | null
): Promise<{
  row: EpsaDepartmentChartAccount;
  created: boolean;
  reactivated: boolean;
  skipped: boolean;
}> => {
  const existing = await EpsaDepartmentChartAccount.findOne({
    where: {
      EPSAId: epsaId,
      DepartmentId: departmentId,
      ChartAccountId: chartAccountId,
      IsAllAccounts: false,
      LocationAccessMode: locationAccessMode,
      LocationID: locationId
    }
  });

  if (existing) {
    if (existing.IsActive) {
      return { row: existing, created: false, reactivated: false, skipped: true };
    }

    await existing.update({
      LocationAccessMode: locationAccessMode,
      LocationID: locationId,
      IsActive: true,
      UpdatedAt: new Date()
    });
    return { row: existing, created: false, reactivated: true, skipped: false };
  }

  const now = new Date();
  const row = await EpsaDepartmentChartAccount.create({
    EPSAId: epsaId,
    DepartmentId: departmentId,
    ChartAccountId: chartAccountId,
    LocationID: locationId,
    LocationAccessMode: locationAccessMode,
    IsAllAccounts: false,
    IsActive: true,
    CreatedAt: now,
    UpdatedAt: now
  } as never);

  return { row, created: true, reactivated: false, skipped: false };
};

const upsertAllAccountsMapping = async (
  epsaId: number,
  departmentId: number,
  locationAccessMode: LocationAccessMode,
  locationId: number | null
): Promise<{
  row: EpsaDepartmentChartAccount;
  created: boolean;
  reactivated: boolean;
  skipped: boolean;
}> => {
  const existing = await EpsaDepartmentChartAccount.findOne({
    where: {
      EPSAId: epsaId,
      DepartmentId: departmentId,
      IsAllAccounts: true,
      LocationAccessMode: locationAccessMode,
      LocationID: locationId
    }
  });

  if (existing) {
    if (existing.IsActive) {
      return { row: existing, created: false, reactivated: false, skipped: true };
    }

    await existing.update({
      ChartAccountId: null,
      LocationID: locationId,
      LocationAccessMode: locationAccessMode,
      IsAllAccounts: true,
      IsActive: true,
      UpdatedAt: new Date()
    });
    return { row: existing, created: false, reactivated: true, skipped: false };
  }

  const now = new Date();
  const row = await EpsaDepartmentChartAccount.create({
    EPSAId: epsaId,
    DepartmentId: departmentId,
    ChartAccountId: null,
    LocationID: locationId,
    LocationAccessMode: locationAccessMode,
    IsAllAccounts: true,
    IsActive: true,
    CreatedAt: now,
    UpdatedAt: now
  } as never);

  return { row, created: true, reactivated: false, skipped: false };
};

const resolveManagerDepartmentIds = async (
  departmentId: number | null | undefined
): Promise<{ departmentIds: number[]; errors: string[] }> => {
  const errors: string[] = [];

  if (departmentId !== null && departmentId !== undefined) {
    const department = await Department.findByPk(departmentId);
    if (!department) {
      errors.push("DepartmentId must exist in dbo.Departments");
      return { departmentIds: [], errors };
    }

    if (!isManagerDepartment(department)) {
      errors.push("All Accounts can only be assigned to Manager departments");
      return { departmentIds: [], errors };
    }

    return { departmentIds: [department.Id], errors };
  }

  const managers = await Department.findAll({
    where: { DepartmentType: "Manager" },
    attributes: ["Id"]
  });

  if (!managers.length) {
    errors.push("No Manager departments were found");
    return { departmentIds: [], errors };
  }

  return {
    departmentIds: managers.map((department) => department.Id),
    errors
  };
};

export const listAccountMappings = async (req: RequestLike, res: ResponseLike, next: NextLike) => {
  try {
    const search = req.query?.search?.trim();
    const epsaId = req.query?.epsaId?.trim();
    const departmentId = req.query?.departmentId?.trim();
    const activeOnly = req.query?.activeOnly === "true" || req.query?.activeOnly === "1";

    const where = {
      ...(activeOnly ? { IsActive: true } : {}),
      ...(epsaId ? { EPSAId: Number(epsaId) } : {}),
      ...(departmentId ? { DepartmentId: Number(departmentId) } : {}),
      ...(search
        ? {
            [Op.or]: [
              { "$Epsa.InterstName$": { [Op.like]: `%${search}%` } },
              { "$Department.DepartmentName_English$": { [Op.like]: `%${search}%` } },
              { "$Department.DepartmentName_Arabic$": { [Op.like]: `%${search}%` } },
              { "$ChartAccount.NewAccountCode$": { [Op.like]: `%${search}%` } },
              { "$ChartAccount.CleanDescription$": { [Op.like]: `%${search}%` } },
              { "$Location.LocationName_en$": { [Op.like]: `%${search}%` } },
              { "$Location.LocationCode$": { [Op.like]: `%${search}%` } }
            ]
          }
        : {})
    };

    const rows = await EpsaDepartmentChartAccount.findAll({
      where: Object.keys(where).length ? where : undefined,
      attributes: listAttributes,
      include: [
        {
          model: Epsa,
          as: "Epsa",
          attributes: ["Id", "InterstName", "NOC", "PC", "EPSAType"],
          required: false
        },
        {
          model: Department,
          as: "Department",
          attributes: ["Id", "DepartmentName_English", "DepartmentName_Arabic", "DepartmentType"],
          required: false
        },
        {
          model: ChartOfAccounts,
          as: "ChartAccount",
          attributes: ["Id", "NewAccountCode", "CleanDescription", "IsActive"],
          required: false
        },
        locationInclude
      ],
      order: [
        ["EPSAId", "ASC"],
        ["DepartmentId", "ASC"],
        ["LocationAccessMode", "ASC"],
        ["LocationID", "ASC"],
        ["IsAllAccounts", "DESC"],
        ["ChartAccountId", "ASC"]
      ],
      subQuery: false
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

export const getAccountMappingById = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await EpsaDepartmentChartAccount.findByPk(Number(req.params?.id), {
      attributes: listAttributes,
      include: [
        {
          model: Epsa,
          as: "Epsa",
          attributes: ["Id", "InterstName", "NOC", "PC", "EPSAType"],
          required: false
        },
        {
          model: Department,
          as: "Department",
          attributes: ["Id", "DepartmentName_English", "DepartmentName_Arabic", "DepartmentType"],
          required: false
        },
        {
          model: ChartOfAccounts,
          as: "ChartAccount",
          attributes: ["Id", "NewAccountCode", "CleanDescription", "IsActive"],
          required: false
        },
        locationInclude
      ]
    });

    if (!row) {
      return res.status(404).json({ success: false, message: "Account mapping not found" });
    }

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const createAccountMappings = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const payload = normalizeEpsaDepartmentChartAccountPayload({
      ...(req.body || {})
    } as EpsaDepartmentChartAccountPayload);

    const errors = validateEpsaDepartmentChartAccountPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const epsaId = Number(payload.EPSAId);
    const epsa = await Epsa.findByPk(epsaId);
    if (!epsa) {
      return res.status(400).json({
        success: false,
        errors: ["EPSAId must exist in dbo.EPSA"]
      });
    }

    const locationAccessMode = (payload.LocationAccessMode || "ALL") as LocationAccessMode;
    const requestedLocationIds = (payload.LocationIDs || []) as number[];

    const { targets, errors: locationErrors } = await resolveLocationTargets(
      locationAccessMode,
      requestedLocationIds
    );

    if (locationErrors.length) {
      return res.status(400).json({ success: false, errors: locationErrors });
    }

    const created: EpsaDepartmentChartAccount[] = [];
    const reactivated: EpsaDepartmentChartAccount[] = [];
    const skipped: number[] = [];

    if (payload.UseAllActiveAccounts) {
      const { departmentIds, errors: departmentErrors } = await resolveManagerDepartmentIds(
        payload.DepartmentId
      );

      if (departmentErrors.length) {
        return res.status(400).json({ success: false, errors: departmentErrors });
      }

      for (const departmentId of departmentIds) {
        for (const target of targets) {
          const result = await upsertAllAccountsMapping(
            epsaId,
            departmentId,
            target.mode,
            target.locationId
          );
          if (result.created) {
            created.push(result.row);
          } else if (result.reactivated) {
            reactivated.push(result.row);
          } else if (result.skipped) {
            skipped.push(departmentId);
          }
        }
      }

      return res.status(201).json({
        success: true,
        data: [...created, ...reactivated],
        summary: {
          created: created.length,
          reactivated: reactivated.length,
          skipped: skipped.length,
          mode: "allAccounts"
        }
      });
    }

    const departmentId = Number(payload.DepartmentId);
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(400).json({
        success: false,
        errors: ["DepartmentId must exist in dbo.Departments"]
      });
    }

    if (!isManagerDepartment(department)) {
      return res.status(400).json({
        success: false,
        errors: ["DepartmentId must be a Manager department"]
      });
    }

    const chartAccountIds = payload.ChartAccountIds?.length
      ? payload.ChartAccountIds
      : payload.ChartAccountId !== null && payload.ChartAccountId !== undefined
        ? [payload.ChartAccountId]
        : [];

    const accounts = await ChartOfAccounts.findAll({
      where: { Id: { [Op.in]: chartAccountIds } },
      attributes: ["Id", "IsActive", "NewAccountCode"]
    });
    const accountById = new Map(accounts.map((account) => [Number(account.Id), account]));
    const referenceErrors: string[] = [];

    for (const chartAccountId of chartAccountIds as number[]) {
      const account = accountById.get(chartAccountId);
      if (!account) {
        referenceErrors.push(`ChartAccountId ${chartAccountId} must exist in dbo.ChartOfAccounts`);
        continue;
      }
      if (!account.IsActive) {
        referenceErrors.push(
          `ChartAccountId ${chartAccountId} (${account.NewAccountCode}) is not active`
        );
      }
    }

    if (referenceErrors.length) {
      return res.status(400).json({ success: false, errors: referenceErrors });
    }

    for (const chartAccountId of chartAccountIds as number[]) {
      for (const target of targets) {
        const result = await upsertSelectedMapping(
          epsaId,
          departmentId,
          chartAccountId,
          target.mode,
          target.locationId
        );
        if (result.created) {
          created.push(result.row);
        } else if (result.reactivated) {
          reactivated.push(result.row);
        } else if (result.skipped) {
          skipped.push(chartAccountId);
        }
      }
    }

    return res.status(201).json({
      success: true,
      data: [...created, ...reactivated],
      summary: {
        created: created.length,
        reactivated: reactivated.length,
        skipped: skipped.length,
        mode: "selectedAccounts"
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAccountMapping = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await EpsaDepartmentChartAccount.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Account mapping not found" });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const nextModeRaw = body.LocationAccessMode;
    const nextMode = nextModeRaw
      ? String(nextModeRaw).trim().toUpperCase()
      : row.LocationAccessMode;

    if (nextMode !== "ALL" && nextMode !== "INCLUDE" && nextMode !== "EXCLUDE") {
      return res.status(400).json({
        success: false,
        errors: ["LocationAccessMode must be one of: ALL, INCLUDE, EXCLUDE"]
      });
    }

    let nextLocationId =
      body.LocationID !== undefined
        ? body.LocationID === null || body.LocationID === ""
          ? null
          : Number(body.LocationID)
        : row.LocationID;

    if (nextMode === "ALL") {
      nextLocationId = null;
    } else if (nextLocationId == null || !Number.isFinite(nextLocationId)) {
      return res.status(400).json({
        success: false,
        errors: [`LocationID is required when LocationAccessMode is ${nextMode}`]
      });
    }

    const nextIsActive =
      body.IsActive === undefined
        ? row.IsActive
        : body.IsActive === true ||
          body.IsActive === 1 ||
          body.IsActive === "1" ||
          body.IsActive === "true";

    if (nextIsActive) {
      const duplicate = await EpsaDepartmentChartAccount.findOne({
        where: {
          EPSAId: row.EPSAId,
          DepartmentId: row.DepartmentId,
          IsAllAccounts: row.IsAllAccounts,
          ChartAccountId: row.ChartAccountId,
          LocationAccessMode: nextMode,
          LocationID: nextLocationId,
          IsActive: true,
          Id: { [Op.ne]: row.Id }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          errors: [
            "An active mapping already exists for this EPSA, Department, LocationAccessMode, Location, and Chart Account"
          ]
        });
      }
    }

    await row.update({
      LocationAccessMode: nextMode as LocationAccessMode,
      LocationID: nextLocationId,
      IsActive: nextIsActive,
      UpdatedAt: new Date()
    });

    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    return next(error);
  }
};

export const deleteAccountMapping = async (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => {
  try {
    const row = await EpsaDepartmentChartAccount.findByPk(Number(req.params?.id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Account mapping not found" });
    }

    await row.update({ IsActive: false, UpdatedAt: new Date() });
    return res.status(200).json({
      success: true,
      message: "Account mapping deactivated",
      data: row
    });
  } catch (error) {
    return next(error);
  }
};
