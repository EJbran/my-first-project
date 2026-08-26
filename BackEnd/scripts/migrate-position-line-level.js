"use strict";

require("dotenv").config();

const { QueryTypes, Transaction } = require("sequelize");
const { sequelize } = require("../src/config/database");

const APPLY_CONFIRMATION = "POSITION_LINE_LEVEL";
const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const confirmation = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);

const LEVEL_NAMES = {
  chairman: "Board Committee Chairman",
  committeeMember: "Board Committee Member",
  departmentManager: "Department Manager",
  supervisor: "Supervisor",
  coordinator: "Coordinator",
  sectionHead: "Section Head",
  unitSupervisor: "Unit Supervisor",
  employee: "Employee"
};

const ENGLISH_WORD_PATTERNS = {
  chairman: /(^|\s)chairman(?=\s|$)/,
  manager: /(^|\s)manager(?=\s|$)/,
  coordinator: /(^|\s)coordinator(?=\s|$)/,
  supervisor: /(^|\s)supervisor(?=\s|$)/
};

const normalizeEnglish = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const normalizeArabic = (value) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ک/g, "ك")
    .replace(/[^\u0600-\u06FF0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const hasEnglishPhrase = (text, phrase) =>
  text.includes(normalizeEnglish(phrase));

const hasArabicPhrase = (text, phrase) =>
  (() => {
    const normalizedPhrase = normalizeArabic(phrase);
    return normalizedPhrase.length > 0 && text.includes(normalizedPhrase);
  })();

const hasArabicWord = (words, ...candidates) =>
  candidates.some((candidate) => words.has(normalizeArabic(candidate)));

const classificationRules = [
  {
    code: "CHAIRMAN",
    levelName: LEVEL_NAMES.chairman,
    matches: ({ english, arabic }) =>
      ENGLISH_WORD_PATTERNS.chairman.test(english)
      || (
        /\bchair\b/.test(english)
        && (english.includes("committee") || english.includes("board"))
      )
      || hasArabicPhrase(arabic, "رئيس لجنة")
      || hasArabicPhrase(arabic, "رئيس اللجنة")
      || hasArabicPhrase(arabic, "رئيس مجلس الإدارة")
  },
  {
    code: "COMMITTEE_MEMBER",
    levelName: LEVEL_NAMES.committeeMember,
    matches: ({ english, arabic }) =>
      (english.includes("committee") && english.includes("member"))
      || hasArabicPhrase(arabic, "عضو لجنة")
      || hasArabicPhrase(arabic, "عضو اللجنة")
  },
  {
    code: "DEPARTMENT_MANAGER",
    levelName: LEVEL_NAMES.departmentManager,
    matches: ({ english, arabic, arabicWords }) =>
      ENGLISH_WORD_PATTERNS.manager.test(english)
      || hasArabicWord(arabicWords, "مدير", "مديرة")
  },
  {
    code: "SECTION_HEAD",
    levelName: LEVEL_NAMES.sectionHead,
    matches: ({ english, arabic }) =>
      hasEnglishPhrase(english, "section head")
      || (english.includes("head of") && english.includes("section"))
      || hasArabicPhrase(arabic, "رئيس قسم")
      || hasArabicPhrase(arabic, "رئيس القسم")
  },
  {
    code: "UNIT_SUPERVISOR",
    levelName: LEVEL_NAMES.unitSupervisor,
    matches: ({ english, arabic }) =>
      hasEnglishPhrase(english, "unit supervisor")
      || (english.includes("supervisor of") && english.includes("unit"))
      || hasArabicPhrase(arabic, "مشرف وحدة")
      || hasArabicPhrase(arabic, "مشرف الوحدة")
  },
  {
    code: "COORDINATOR",
    levelName: LEVEL_NAMES.coordinator,
    matches: ({ english, arabicWords }) =>
      ENGLISH_WORD_PATTERNS.coordinator.test(english)
      || hasArabicWord(arabicWords, "منسق", "منسقة")
  },
  {
    code: "SUPERVISOR",
    levelName: LEVEL_NAMES.supervisor,
    matches: ({ english, arabicWords }) =>
      ENGLISH_WORD_PATTERNS.supervisor.test(english)
      || hasArabicWord(arabicWords, "مراقب", "مشرف", "مشرفة")
  }
];

const classifyJob = (job, levelByName) => {
  const normalized = {
    english: normalizeEnglish(job.Job_Name_EN),
    arabic: normalizeArabic(job.Job_Name_AR)
  };
  normalized.arabicWords = new Set(normalized.arabic.split(" ").filter(Boolean));
  const matchedRules = classificationRules.filter((rule) => rule.matches(normalized));
  const selectedRule = matchedRules[0] || {
    code: "EMPLOYEE",
    levelName: LEVEL_NAMES.employee
  };
  const level = levelByName.get(selectedRule.levelName.toLowerCase());

  if (!level) {
    throw new Error(`LineLevel row is missing for ${selectedRule.levelName}.`);
  }

  return {
    jobId: Number(job.Job_ID),
    jobNameArabic: String(job.Job_Name_AR || ""),
    jobNameEnglish: String(job.Job_Name_EN || ""),
    ruleCode: selectedRule.code,
    levelId: Number(level.Line_ID),
    levelName: selectedRule.levelName,
    matchedRules: matchedRules.map((rule) => rule.code)
  };
};

const toSafeCount = (value, label) => {
  const number = Number(value || 0);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`${label} returned an invalid count.`);
  }
  return number;
};

const loadState = async () => {
  const [levels, jobs, positionCounts, schemaRows, relationRows, summaryRows] =
    await Promise.all([
      sequelize.query(
        `
          SELECT [Line_ID], [SortLine], [ArabicDescription], [EnglishDescription]
          FROM [dbo].[LineLevel]
          ORDER BY [SortLine] DESC, [Line_ID];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT [Job_ID], [Job_Name_AR], [Job_Name_EN]
          FROM [dbo].[jobs]
          ORDER BY [Job_ID];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT
            [Job_ID],
            COUNT_BIG(*) AS [positionCount],
            SUM(CASE WHEN [EmployeeId] IS NOT NULL THEN 1 ELSE 0 END) AS [occupiedCount],
            SUM(CASE WHEN [EmployeeId] IS NULL THEN 1 ELSE 0 END) AS [vacantCount]
          FROM [dbo].[Position]
          WHERE [Job_ID] IS NOT NULL
          GROUP BY [Job_ID];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT
            CASE WHEN COL_LENGTH(N'dbo.Position', N'LineLevelId') IS NULL
              THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END AS [hasLineLevelColumn];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT
            (SELECT COUNT_BIG(*) FROM sys.foreign_keys
              WHERE [parent_object_id] = OBJECT_ID(N'dbo.Position')
                AND [name] = N'FK_Position_LineLevel') AS [foreignKeyCount],
            (SELECT COUNT_BIG(*) FROM sys.indexes
              WHERE [object_id] = OBJECT_ID(N'dbo.Position')
                AND [name] = N'IX_Position_LineLevelId') AS [indexCount];
        `,
        { type: QueryTypes.SELECT, raw: true }
      ),
      sequelize.query(
        `
          SELECT
            COUNT_BIG(*) AS [totalPositions],
            SUM(CASE WHEN [EmployeeId] IS NOT NULL THEN 1 ELSE 0 END) AS [occupiedPositions],
            SUM(CASE WHEN [Job_ID] IS NULL THEN 1 ELSE 0 END) AS [positionsWithoutJob],
            SUM(CASE WHEN [EmployeeId] IS NOT NULL AND [Job_ID] IS NULL THEN 1 ELSE 0 END)
              AS [occupiedPositionsWithoutJob]
          FROM [dbo].[Position];
        `,
        { type: QueryTypes.SELECT, raw: true }
      )
    ]);

  const levelByName = new Map(
    levels.map((level) => [
      String(level.EnglishDescription || "").trim().toLowerCase(),
      level
    ])
  );
  const requiredLevelNames = Object.values(LEVEL_NAMES);
  const missingLevels = requiredLevelNames.filter(
    (name) => !levelByName.has(name.toLowerCase())
  );

  if (missingLevels.length > 0) {
    throw new Error(`Missing LineLevel rows: ${missingLevels.join(", ")}.`);
  }

  const positionsByJob = new Map(
    positionCounts.map((row) => [
      Number(row.Job_ID),
      {
        positionCount: toSafeCount(row.positionCount, "positionCount"),
        occupiedCount: toSafeCount(row.occupiedCount, "occupiedCount"),
        vacantCount: toSafeCount(row.vacantCount, "vacantCount")
      }
    ])
  );
  const classifications = jobs.map((job) => ({
    ...classifyJob(job, levelByName),
    ...(positionsByJob.get(Number(job.Job_ID)) || {
      positionCount: 0,
      occupiedCount: 0,
      vacantCount: 0
    })
  }));

  return {
    levels,
    levelByName,
    classifications,
    hasLineLevelColumn: Boolean(schemaRows[0]?.hasLineLevelColumn),
    foreignKeyCount: toSafeCount(relationRows[0]?.foreignKeyCount, "foreignKeyCount"),
    indexCount: toSafeCount(relationRows[0]?.indexCount, "indexCount"),
    summary: {
      totalPositions: toSafeCount(summaryRows[0]?.totalPositions, "totalPositions"),
      occupiedPositions: toSafeCount(
        summaryRows[0]?.occupiedPositions,
        "occupiedPositions"
      ),
      positionsWithoutJob: toSafeCount(
        summaryRows[0]?.positionsWithoutJob,
        "positionsWithoutJob"
      ),
      occupiedPositionsWithoutJob: toSafeCount(
        summaryRows[0]?.occupiedPositionsWithoutJob,
        "occupiedPositionsWithoutJob"
      )
    }
  };
};

const buildPreview = (state) => {
  const distribution = new Map();

  for (const classification of state.classifications) {
    const current = distribution.get(classification.levelName) || {
      levelId: classification.levelId,
      jobs: 0,
      positions: 0,
      occupied: 0,
      vacant: 0
    };
    current.jobs += 1;
    current.positions += classification.positionCount;
    current.occupied += classification.occupiedCount;
    current.vacant += classification.vacantCount;
    distribution.set(classification.levelName, current);
  }

  const samples = Object.fromEntries(
    Object.values(LEVEL_NAMES).map((levelName) => [
      levelName,
      state.classifications
        .filter(
          (classification) =>
            classification.levelName === levelName
            && classification.positionCount > 0
        )
        .slice(0, 12)
        .map((classification) => ({
          jobId: classification.jobId,
          english: classification.jobNameEnglish,
          arabic: classification.jobNameArabic,
          positions: classification.positionCount,
          occupied: classification.occupiedCount,
          rule: classification.ruleCode
        }))
    ])
  );

  const preview = {
    mode: shouldApply ? "apply" : "preflight",
    target: {
      database: process.env.DB_NAME,
      host: process.env.DB_HOST
    },
    currentSchema: {
      hasLineLevelColumn: state.hasLineLevelColumn,
      foreignKeyCount: state.foreignKeyCount,
      indexCount: state.indexCount
    },
    positionSummary: state.summary,
    proposedDistribution: Object.fromEntries(distribution),
    ambiguousJobCount: state.classifications.filter(
      (classification) => classification.matchedRules.length > 1
    ).length,
    jobsWithBlankTitles: state.classifications
      .filter(
        (classification) =>
          !classification.jobNameEnglish.trim()
          && !classification.jobNameArabic.trim()
      )
      .map((classification) => classification.jobId)
  };

  if (shouldApply || args.has("--summary")) {
    return preview;
  }

  return {
    ...preview,
    ambiguousJobs: state.classifications
      .filter((classification) => classification.matchedRules.length > 1)
      .slice(0, 100)
      .map((classification) => ({
        jobId: classification.jobId,
        english: classification.jobNameEnglish,
        arabic: classification.jobNameArabic,
        selectedRule: classification.ruleCode,
        matchedRules: classification.matchedRules,
        positions: classification.positionCount
      })),
    samples
  };
};

const applyMigration = async (state) =>
  sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      await sequelize.query(
        `
          DECLARE @applicationLockResult int;
          EXEC @applicationLockResult = sys.sp_getapplock
            @Resource = N'HERP_Position_LineLevel_Migration',
            @LockMode = N'Exclusive',
            @LockOwner = N'Transaction',
            @LockTimeout = 15000;

          IF @applicationLockResult < 0
            THROW 51000, N'Could not obtain the position line-level migration lock.', 1;

          IF COL_LENGTH(N'dbo.Position', N'LineLevelId') IS NULL
          BEGIN
            ALTER TABLE [dbo].[Position] ADD [LineLevelId] int NULL;
          END;

          IF NOT EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE [parent_object_id] = OBJECT_ID(N'dbo.Position')
              AND [name] = N'FK_Position_LineLevel'
          )
          BEGIN
            ALTER TABLE [dbo].[Position] WITH CHECK
              ADD CONSTRAINT [FK_Position_LineLevel]
              FOREIGN KEY ([LineLevelId])
              REFERENCES [dbo].[LineLevel] ([Line_ID]);
            ALTER TABLE [dbo].[Position]
              CHECK CONSTRAINT [FK_Position_LineLevel];
          END;

          IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE [object_id] = OBJECT_ID(N'dbo.Position')
              AND [name] = N'IX_Position_LineLevelId'
          )
          BEGIN
            CREATE INDEX [IX_Position_LineLevelId]
              ON [dbo].[Position] ([LineLevelId]);
          END;
        `,
        { transaction }
      );

      const classificationJson = JSON.stringify(
        state.classifications.map((classification) => ({
          jobId: classification.jobId,
          lineLevelId: classification.levelId
        }))
      );

      await sequelize.query(
        `
          WITH classification AS (
            SELECT
              [jobId] AS [Job_ID],
              [lineLevelId] AS [LineLevelId]
            FROM OPENJSON(:classificationJson)
            WITH (
              [jobId] int N'$.jobId',
              [lineLevelId] int N'$.lineLevelId'
            )
          )
          UPDATE position
          SET position.[LineLevelId] = classification.[LineLevelId]
          FROM [dbo].[Position] AS position
          INNER JOIN classification
            ON classification.[Job_ID] = position.[Job_ID]
          WHERE position.[LineLevelId] IS NULL
             OR position.[LineLevelId] <> classification.[LineLevelId];

          UPDATE [dbo].[Position]
          SET [LineLevelId] = NULL
          WHERE [Job_ID] IS NULL
            AND [LineLevelId] IS NOT NULL;
        `,
        { replacements: { classificationJson }, transaction }
      );

      const verificationRows = await sequelize.query(
        `
          SELECT
            SUM(CASE WHEN position.[Job_ID] IS NOT NULL
                       AND position.[LineLevelId] IS NULL THEN 1 ELSE 0 END)
              AS [classifiedJobPositionsMissingLevel],
            SUM(CASE WHEN position.[LineLevelId] IS NOT NULL
                       AND lineLevel.[Line_ID] IS NULL THEN 1 ELSE 0 END)
              AS [invalidLineLevelReferences],
            SUM(CASE WHEN position.[Job_ID] IS NULL
                       AND position.[LineLevelId] IS NOT NULL THEN 1 ELSE 0 END)
              AS [positionsWithoutJobWithLevel],
            COUNT_BIG(*) AS [totalPositions],
            SUM(CASE WHEN position.[LineLevelId] IS NOT NULL THEN 1 ELSE 0 END)
              AS [positionsWithLineLevel]
          FROM [dbo].[Position] AS position
          LEFT JOIN [dbo].[LineLevel] AS lineLevel
            ON lineLevel.[Line_ID] = position.[LineLevelId];
        `,
        { type: QueryTypes.SELECT, raw: true, transaction }
      );

      const verification = {
        classifiedJobPositionsMissingLevel: toSafeCount(
          verificationRows[0]?.classifiedJobPositionsMissingLevel,
          "classifiedJobPositionsMissingLevel"
        ),
        invalidLineLevelReferences: toSafeCount(
          verificationRows[0]?.invalidLineLevelReferences,
          "invalidLineLevelReferences"
        ),
        positionsWithoutJobWithLevel: toSafeCount(
          verificationRows[0]?.positionsWithoutJobWithLevel,
          "positionsWithoutJobWithLevel"
        ),
        totalPositions: toSafeCount(
          verificationRows[0]?.totalPositions,
          "totalPositions"
        ),
        positionsWithLineLevel: toSafeCount(
          verificationRows[0]?.positionsWithLineLevel,
          "positionsWithLineLevel"
        )
      };

      if (
        verification.classifiedJobPositionsMissingLevel !== 0
        || verification.invalidLineLevelReferences !== 0
        || verification.positionsWithoutJobWithLevel !== 0
      ) {
        throw new Error(
          `Line-level verification failed: ${JSON.stringify(verification)}`
        );
      }

      return verification;
    }
  );

async function main() {
  if (shouldApply && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(
      `Apply requires --confirm=${APPLY_CONFIRMATION}. Run without --apply for a read-only preview.`
    );
  }

  await sequelize.authenticate();
  const state = await loadState();
  const preview = buildPreview(state);
  console.log(JSON.stringify(preview, null, 2));

  if (!shouldApply) {
    console.log(
      `[line-level] Preflight only. Apply with --apply --confirm=${APPLY_CONFIRMATION}.`
    );
    return;
  }

  const verification = await applyMigration(state);
  console.log(
    JSON.stringify(
      {
        status: "APPLIED",
        verification
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      "[line-level] Failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
