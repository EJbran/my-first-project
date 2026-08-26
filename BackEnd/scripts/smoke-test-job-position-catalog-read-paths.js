require("dotenv").config();
require("ts-node/register/transpile-only");

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");
const {
  getJobById,
  getJobOptions,
  listJobs
} = require("../src/controllers/HR/job.controller.ts");
const {
  getPositionById,
  getPositionOptions,
  listPositions
} = require("../src/controllers/HR/position.controller.ts");
const { JOB_TEXT_FIELDS } = require("../src/validators/HR/job.validator.ts");

const invoke = (handler, request) => new Promise((resolve, reject) => {
  let statusCode = 200;
  const response = {
    status(code) {
      statusCode = code;
      return response;
    },
    json(payload) {
      resolve({ statusCode, payload });
      return payload;
    }
  };
  Promise.resolve(handler(request, response, reject)).catch(reject);
});

const assertSuccess = (label, result, expectedStatus = 200) => {
  if (result.statusCode !== expectedStatus || result.payload?.success !== true) {
    throw new Error(`${label} failed with HTTP ${result.statusCode}: ${JSON.stringify(result.payload)}`);
  }
};

const idsFrom = (result, field) => result.payload.data.map((row) => String(row[field]));

const assertDisjoint = (label, first, second) => {
  const firstSet = new Set(first);
  if (second.some((value) => firstSet.has(value))) {
    throw new Error(`${label} returned overlapping rows across pages.`);
  }
};

const main = async () => {
  const aggregateRows = await sequelize.query(
    `
      SELECT
        (SELECT COUNT_BIG(*) FROM [dbo].[jobs]) AS [Jobs],
        (SELECT COUNT_BIG(*) FROM [dbo].[Position]) AS [Positions],
        (SELECT COUNT_BIG(*) FROM [dbo].[Position] WHERE [EmployeeId] IS NOT NULL)
          AS [Occupied],
        (SELECT COUNT_BIG(*) FROM [dbo].[Position] WHERE [EmployeeId] IS NULL)
          AS [Vacant],
        (SELECT COUNT_BIG(*) FROM [dbo].[Position] WHERE [Job_ID] IS NULL)
          AS [MissingJob],
        (SELECT COUNT(DISTINCT CONVERT(nvarchar(4000), [Job_Family])) FROM [dbo].[jobs])
          AS [JobFamilies],
        (SELECT COUNT_BIG(*) FROM [dbo].[jobs]
          WHERE [Role_Criticality] LIKE N'%Critical%'
            AND [Role_Criticality] NOT LIKE N'%Review Required%')
          AS [CriticalRoles],
        (SELECT COUNT_BIG(*) FROM [dbo].[jobs]
          WHERE [Role_Criticality] LIKE N'%Review Required%')
          AS [UnderReview],
        (SELECT MIN([Job_ID]) FROM [dbo].[jobs]) AS [MinJobId],
        (SELECT MAX([Job_ID]) FROM [dbo].[jobs]) AS [MaxJobId],
        (SELECT MIN([Id]) FROM [dbo].[Position]) AS [MinPositionId],
        (SELECT MAX([Id]) FROM [dbo].[Position]) AS [MaxPositionId];
    `,
    { type: QueryTypes.SELECT, raw: true }
  );
  const aggregate = Object.fromEntries(
    Object.entries(aggregateRows[0]).map(([key, value]) => [key, Number(value ?? 0)])
  );
  if (aggregate.Jobs < 2 || aggregate.Positions < 2) {
    throw new Error(`Catalog fixtures are unavailable: ${JSON.stringify(aggregate)}`);
  }

  const [jobsPageOne, jobsPageTwo, positionsPageOne, positionsPageTwo] = await Promise.all([
    invoke(listJobs, { query: { page: "1", pageSize: "10" } }),
    invoke(listJobs, { query: { page: "2", pageSize: "10" } }),
    invoke(listPositions, { query: { page: "1", pageSize: "10" } }),
    invoke(listPositions, { query: { page: "2", pageSize: "10" } })
  ]);
  for (const [label, result] of [
    ["jobs page one", jobsPageOne],
    ["jobs page two", jobsPageTwo],
    ["positions page one", positionsPageOne],
    ["positions page two", positionsPageTwo]
  ]) assertSuccess(label, result);

  if (Number(jobsPageOne.payload.pagination.total) !== aggregate.Jobs) {
    throw new Error("Job pagination total does not match dbo.jobs.");
  }
  const jobSummary = jobsPageOne.payload.summary;
  if (
    Number(jobSummary?.totalJobs) !== aggregate.Jobs
    || Number(jobSummary?.jobFamilies) !== aggregate.JobFamilies
    || Number(jobSummary?.criticalRoles) !== aggregate.CriticalRoles
    || Number(jobSummary?.underReview) !== aggregate.UnderReview
  ) {
    throw new Error("Job catalog summary disagrees with dbo.jobs aggregates.");
  }
  if (Number(positionsPageOne.payload.pagination.total) !== aggregate.Positions) {
    throw new Error("Position pagination total does not match dbo.Position.");
  }
  assertDisjoint(
    "Jobs",
    idsFrom(jobsPageOne, "Job_ID"),
    idsFrom(jobsPageTwo, "Job_ID")
  );
  assertDisjoint(
    "Positions",
    idsFrom(positionsPageOne, "PositionId"),
    idsFrom(positionsPageTwo, "PositionId")
  );

  const [jobsAscending, jobsDescending] = await Promise.all([
    invoke(listJobs, {
      query: { page: "1", pageSize: "10", sortBy: "jobId", sortDirection: "asc" }
    }),
    invoke(listJobs, {
      query: { page: "1", pageSize: "10", sortBy: "jobId", sortDirection: "desc" }
    })
  ]);
  assertSuccess("jobs ascending sort", jobsAscending);
  assertSuccess("jobs descending sort", jobsDescending);
  const ascendingIds = jobsAscending.payload.data.map((row) => Number(row.Job_ID));
  const descendingIds = jobsDescending.payload.data.map((row) => Number(row.Job_ID));
  if (
    ascendingIds[0] !== aggregate.MinJobId
    || descendingIds[0] !== aggregate.MaxJobId
    || ascendingIds.some((value, index) => index > 0 && value < ascendingIds[index - 1])
    || descendingIds.some((value, index) => index > 0 && value > descendingIds[index - 1])
  ) {
    throw new Error("Allowlisted Job ID sorting did not return deterministic ascending/descending pages.");
  }

  const [positionsAscending, positionsDescending] = await Promise.all([
    invoke(listPositions, {
      query: { page: "1", pageSize: "10", sortBy: "positionId", sortDirection: "asc" }
    }),
    invoke(listPositions, {
      query: { page: "1", pageSize: "10", sortBy: "positionId", sortDirection: "desc" }
    })
  ]);
  assertSuccess("positions ascending sort", positionsAscending);
  assertSuccess("positions descending sort", positionsDescending);
  const ascendingPositionIds = positionsAscending.payload.data.map((row) => Number(row.PositionId));
  const descendingPositionIds = positionsDescending.payload.data.map((row) => Number(row.PositionId));
  if (
    ascendingPositionIds[0] !== aggregate.MinPositionId
    || descendingPositionIds[0] !== aggregate.MaxPositionId
    || ascendingPositionIds.some(
      (value, index) => index > 0 && value < ascendingPositionIds[index - 1]
    )
    || descendingPositionIds.some(
      (value, index) => index > 0 && value > descendingPositionIds[index - 1]
    )
  ) {
    throw new Error(
      "Allowlisted Position ID sorting did not return deterministic ascending/descending pages."
    );
  }

  const [completeDataFirst, missingJobFirst] = await Promise.all([
    invoke(listPositions, {
      query: { page: "1", pageSize: "10", sortBy: "dataStatus", sortDirection: "asc" }
    }),
    invoke(listPositions, {
      query: { page: "1", pageSize: "10", sortBy: "dataStatus", sortDirection: "desc" }
    })
  ]);
  assertSuccess("complete Position data first", completeDataFirst);
  assertSuccess("missing-job Position data first", missingJobFirst);
  if (
    completeDataFirst.payload.data.some((row) => row.JobId === null)
    || missingJobFirst.payload.data.some((row) => row.JobId !== null)
  ) {
    throw new Error(
      "Position dataStatus sorting does not match Complete versus Missing Job semantics."
    );
  }

  const firstJob = jobsPageOne.payload.data[0];
  const firstPosition = positionsPageOne.payload.data[0];
  if (!firstJob || !firstPosition) throw new Error("First catalog pages were unexpectedly empty.");
  if (Object.prototype.hasOwnProperty.call(firstJob, "Role_Purpose")) {
    throw new Error("The paginated job summary exposes a large profile field.");
  }

  const [jobDetail, jobOptions, positionDetail, positionOptions] = await Promise.all([
    invoke(getJobById, { params: { jobId: String(firstJob.Job_ID) } }),
    invoke(getJobOptions, { query: { limit: "15" } }),
    invoke(getPositionById, { params: { positionId: String(firstPosition.PositionId) } }),
    invoke(getPositionOptions, { query: {} })
  ]);
  assertSuccess("job detail", jobDetail);
  assertSuccess("job options", jobOptions);
  assertSuccess("position detail", positionDetail);
  assertSuccess("position options", positionOptions);

  for (const field of ["Job_ID", ...JOB_TEXT_FIELDS, "TotalPositions", "OccupiedPositions", "VacantPositions"]) {
    if (!Object.prototype.hasOwnProperty.call(jobDetail.payload.data, field)) {
      throw new Error(`Job detail is missing ${field}.`);
    }
  }
  const firstJobOption = jobOptions.payload.data.jobs[0];
  if (firstJobOption && !Object.prototype.hasOwnProperty.call(firstJobOption, "JobId")) {
    throw new Error("Job options do not expose the JobId alias.");
  }

  const englishSearch = Array.from(String(firstJob.Job_Name_EN)).slice(0, 8).join("").trim();
  const arabicSearch = Array.from(String(firstJob.Job_Name_AR)).slice(0, 4).join("").trim();
  const [englishResult, arabicResult, familyResult, occupiedResult, vacantResult] = await Promise.all([
    invoke(listJobs, { query: { page: "1", pageSize: "10", search: englishSearch } }),
    invoke(listJobs, { query: { page: "1", pageSize: "10", search: arabicSearch } }),
    invoke(listJobs, {
      query: { page: "1", pageSize: "10", jobFamily: String(firstJob.Job_Family) }
    }),
    invoke(listPositions, { query: { page: "1", pageSize: "10", occupancy: "occupied" } }),
    invoke(listPositions, { query: { page: "1", pageSize: "10", occupancy: "vacant" } })
  ]);
  for (const [label, result] of [
    ["English job search", englishResult],
    ["Arabic job search", arabicResult],
    ["job-family filter", familyResult],
    ["occupied position filter", occupiedResult],
    ["vacant position filter", vacantResult]
  ]) assertSuccess(label, result);
  if (
    Number(englishResult.payload.pagination.total) < 1
    || Number(arabicResult.payload.pagination.total) < 1
    || Number(familyResult.payload.pagination.total) < 1
  ) {
    throw new Error("One or more job search/filter paths did not find their source row.");
  }
  if (
    Number(occupiedResult.payload.pagination.total) !== aggregate.Occupied
    || Number(vacantResult.payload.pagination.total) !== aggregate.Vacant
  ) {
    throw new Error("Position occupancy filters disagree with dbo.Position.");
  }

  const summary = positionsPageOne.payload.summary;
  if (
    Number(summary?.total) !== aggregate.Positions
    || Number(summary?.occupied) !== aggregate.Occupied
    || Number(summary?.vacant) !== aggregate.Vacant
    || Number(summary?.missingJob) !== aggregate.MissingJob
  ) {
    throw new Error("Position summary disagrees with dbo.Position aggregates.");
  }

  if (aggregate.MissingJob > 0) {
    const missingRows = await sequelize.query(
      `SELECT TOP (1) [Id] AS [PositionId] FROM [dbo].[Position] WHERE [Job_ID] IS NULL ORDER BY [Id];`,
      { type: QueryTypes.SELECT, raw: true }
    );
    const missingDetail = await invoke(getPositionById, {
      params: { positionId: String(missingRows[0].PositionId) }
    });
    assertSuccess("missing-job position detail", missingDetail);
    if (missingDetail.payload.data.JobId !== null || missingDetail.payload.data.Job_Name_EN !== null) {
      throw new Error("A legacy missing-job Position was not preserved by the enriched LEFT JOIN.");
    }
  }

  const [
    badJobPage,
    badPositionPage,
    badJobSort,
    badPositionSort,
    badPositionSortDirection
  ] = await Promise.all([
    invoke(listJobs, { query: { page: "1", pageSize: "101" } }),
    invoke(listPositions, { query: { page: "1", pageSize: "101" } }),
    invoke(listJobs, {
      query: { page: "1", pageSize: "10", sortBy: "Job_ID; DROP TABLE dbo.jobs" }
    }),
    invoke(listPositions, {
      query: { page: "1", pageSize: "10", sortBy: "Id; DROP TABLE dbo.Position" }
    }),
    invoke(listPositions, {
      query: { page: "1", pageSize: "10", sortBy: "positionId", sortDirection: "desc; DROP" }
    })
  ]);
  if (
    badJobPage.statusCode !== 400
    || badPositionPage.statusCode !== 400
    || badJobSort.statusCode !== 400
    || badPositionSort.statusCode !== 400
    || badPositionSortDirection.statusCode !== 400
  ) {
    throw new Error("Invalid catalog paging or sorting input was not rejected.");
  }

  console.log(JSON.stringify({
    status: "passed",
    databaseAggregates: aggregate,
    checks: {
      jobPagesAreStableAndDisjoint: true,
      positionPagesAreStableAndDisjoint: true,
      jobListUsesSummaryProjection: true,
      jobCatalogSummaryMatchesDatabase: true,
      allowlistedAscendingAndDescendingJobSort: true,
      invalidJobSortRejectedBeforeQuery: true,
      allowlistedAscendingAndDescendingPositionSort: true,
      positionDataStatusSortUsesJobCompleteness: true,
      invalidPositionSortRejectedBeforeQuery: true,
      jobDetailHasAllDatabaseFields: true,
      englishAndArabicSearch: true,
      jobFamilyFilter: true,
      occupiedAndVacantFilters: true,
      legacyMissingJobsPreserved: aggregate.MissingJob > 0,
      positionSummaryMatchesDatabase: true,
      pageSizeCapEnforced: true,
      optionsLoaded: true
    },
    privacy: "Only aggregate counts and booleans are printed."
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
