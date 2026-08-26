import dayjs, { type Dayjs } from "dayjs";

export type SeniorityReward = {
  serviceYears: number;
  annualNetReward: number;
  totalNetReward: number;
};

export type SeniorityMilestone = SeniorityReward & {
  eligibilityDate: Dayjs;
  isEarned: boolean;
};

export type SenioritySchedule = {
  asOf: Dayjs;
  contractDate: Dayjs;
  yearsOfService: number;
  milestones: SeniorityMilestone[];
  latestEarnedMilestone?: SeniorityMilestone;
  nextMilestone?: SeniorityMilestone;
  totalNetRewardToDate: number;
  progress: number;
};

const SENIORITY_REWARDS: readonly SeniorityReward[] = [
  { serviceYears: 5, annualNetReward: 300, totalNetReward: 1_500 },
  { serviceYears: 10, annualNetReward: 350, totalNetReward: 3_500 },
  { serviceYears: 15, annualNetReward: 400, totalNetReward: 6_000 },
  { serviceYears: 20, annualNetReward: 450, totalNetReward: 9_000 },
  { serviceYears: 25, annualNetReward: 500, totalNetReward: 12_500 },
  { serviceYears: 30, annualNetReward: 550, totalNetReward: 16_500 },
  { serviceYears: 35, annualNetReward: 600, totalNetReward: 21_000 },
  { serviceYears: 40, annualNetReward: 650, totalNetReward: 26_000 },
  { serviceYears: 45, annualNetReward: 700, totalNetReward: 31_500 },
  { serviceYears: 50, annualNetReward: 750, totalNetReward: 37_500 }
];

export const lydAmountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});

const parseContractDate = (value?: string): Dayjs | null => {
  if (!value) return null;
  const dateOnlyValue = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!dateOnlyValue) return null;

  const parsedDate = dayjs(dateOnlyValue);
  return parsedDate.isValid() && parsedDate.format("YYYY-MM-DD") === dateOnlyValue
    ? parsedDate.startOf("day")
    : null;
};

export const buildSenioritySchedule = (
  contractStart?: string,
  asOf: Dayjs = dayjs().startOf("day")
): SenioritySchedule | null => {
  const contractDate = parseContractDate(contractStart);
  if (!contractDate) return null;

  const normalizedAsOf = asOf.startOf("day");
  const yearsOfService = Math.max(0, normalizedAsOf.diff(contractDate, "year"));
  const milestones = SENIORITY_REWARDS.map((reward) => {
    const eligibilityDate = contractDate.add(reward.serviceYears, "year");
    return {
      ...reward,
      eligibilityDate,
      isEarned: !eligibilityDate.isAfter(normalizedAsOf, "day")
    };
  });
  const latestEarnedMilestone = milestones.findLast((milestone) => milestone.isEarned);
  const nextMilestone = milestones.find((milestone) => !milestone.isEarned);
  const totalNetRewardToDate = milestones.reduce(
    (total, milestone) => total + (milestone.isEarned ? milestone.totalNetReward : 0),
    0
  );
  const latestEarnedIndex = milestones.findLastIndex((milestone) => milestone.isEarned);
  const progress = latestEarnedIndex <= 0
    ? 0
    : (latestEarnedIndex / (milestones.length - 1)) * 100;

  return {
    asOf: normalizedAsOf,
    contractDate,
    yearsOfService,
    milestones,
    latestEarnedMilestone,
    nextMilestone,
    totalNetRewardToDate,
    progress
  };
};
