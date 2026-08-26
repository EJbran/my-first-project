import { z } from "zod";
import {
  AFE_PRIORITIES,
  AFE_PROJECT_NATURES,
  AFE_STATUSES,
  AFE_TYPES
} from "../types/afe.types";

const optionalNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx): number | null => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid number"
      });
      return z.NEVER;
    }

    return parsed;
  });

const nonNegativeNumber = optionalNumber.superRefine((value, ctx) => {
  if (value !== null && value < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Must be greater than or equal to 0"
    });
  }
});

/**
 * Frontend AFE form validator.
 * Note: AFENo is required but intentionally NOT unique.
 */
export const afeFormSchema = z
  .object({
    SourceLineNo: optionalNumber,
    ImportBatchNo: z.string().trim().max(50).optional().or(z.literal("")),
    AFENo: z.string().trim().min(1, "AFENo is required").max(50),
    LegacyDescription: z.string().trim().max(500).optional().or(z.literal("")),
    LegacyLocationCode: z.string().trim().max(50).optional().or(z.literal("")),
    LegacyDepartmentCode: z.string().trim().max(50).optional().or(z.literal("")),
    LegacyDepartmentName: z.string().trim().max(200).optional().or(z.literal("")),
    AFEDescription: z.string().trim().min(1, "AFEDescription is required").max(500),
    AFEDescriptionArabic: z.string().trim().max(500).optional().or(z.literal("")),
    AFEType: z.enum(AFE_TYPES),
    AFECategory: z.string().trim().max(100).optional().or(z.literal("")),
    ProjectNature: z.enum([...AFE_PROJECT_NATURES, ""] as const).optional(),
    Priority: z.enum([...AFE_PRIORITIES, ""] as const).optional(),
    Status: z.enum(AFE_STATUSES),
    EPSAId: optionalNumber,
    DepartmentId: optionalNumber,
    LocationId: optionalNumber,
    DefaultChartAccountId: optionalNumber,
    CurrencyCode: z.string().trim().min(1, "CurrencyCode is required").max(10),
    EstimatedBudget: nonNegativeNumber,
    ApprovedBudget: nonNegativeNumber,
    CommittedAmount: nonNegativeNumber,
    ActualAmount: nonNegativeNumber,
    StartDate: z.string().optional().or(z.literal("")),
    EndDate: z.string().optional().or(z.literal("")),
    PlannedStartDate: z.string().optional().or(z.literal("")),
    PlannedEndDate: z.string().optional().or(z.literal("")),
    IsBudgetControlled: z.boolean(),
    IsCapitalizable: z.boolean().nullable(),
    RequiresAFEOnTransaction: z.boolean(),
    IsActive: z.boolean(),
    Notes: z.string().optional().or(z.literal(""))
  })
  .superRefine((values, ctx) => {
    if (values.StartDate && values.EndDate && values.EndDate < values.StartDate) {
      ctx.addIssue({
        code: "custom",
        path: ["EndDate"],
        message: "EndDate cannot be before StartDate"
      });
    }

    if (
      values.PlannedStartDate &&
      values.PlannedEndDate &&
      values.PlannedEndDate < values.PlannedStartDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["PlannedEndDate"],
        message: "PlannedEndDate cannot be before PlannedStartDate"
      });
    }
  });

export type AFEFormValues = z.output<typeof afeFormSchema>;
