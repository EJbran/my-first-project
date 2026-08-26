export const HOLIDAY_TYPES = ["NATIONAL", "RELIGIOUS"] as const;

export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export interface Holiday {
  HolidayId: number;
  HolidayCode: string | null;
  HolidayNameAr: string;
  HolidayNameEn: string | null;
  HolidayType: string;
  HolidayDate: string;
  IsFixedDate: boolean;
  IsActive: boolean;
  Description: string | null;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export interface HolidayPayload {
  HolidayCode?: string | null;
  HolidayNameAr?: string;
  HolidayNameEn?: string | null;
  HolidayType?: string;
  HolidayDate?: string | null;
  IsFixedDate?: boolean;
  IsActive?: boolean;
  Description?: string | null;
}
