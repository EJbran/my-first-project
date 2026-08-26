"use strict";

require("./load-local-env");
require("ts-node/register/transpile-only");

const fs = require("node:fs");
const path = require("node:path");
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../src/config/database");

// Register the foundational Sequelize-managed models first. Finance and HR are
// registered after their SQL migrations so migration-owned tables and foreign
// keys are created deterministically.
const authenticationModels = require("../src/model/Authentication/index.ts");
require("../src/model/General/index.ts");

const { User } = authenticationModels;

const EXPECTED_DATABASE = "HERP_LOCAL";
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const APPLICATION_MIGRATIONS = [
  "20260706-update-hybrid-entra-ad-auth.sql",
  "20260715-create-chart-of-accounts.sql",
  "20260716-create-epsa-department-chart-account.sql",
  "20260716-alter-epsa-department-chart-account-all-accounts.sql",
  "20260719-alter-epsa-department-chart-account-location.sql",
  "20260719-alter-epsa-department-chart-account-location-access-mode.sql",
  "20260721-create-holidays.sql",
  "20260721-create-time-sheet-code.sql",
  "20260726-create-sub-location.sql"
];

function assertDedicatedLocalDatabase() {
  const host = String(process.env.DB_HOST || "").trim().toLowerCase();
  const database = String(process.env.DB_NAME || "").trim();

  if (!ALLOWED_HOSTS.has(host) || database.toUpperCase() !== EXPECTED_DATABASE) {
    throw new Error(
      `Safety stop: local bootstrap is restricted to ${EXPECTED_DATABASE} on 127.0.0.1/localhost.`
    );
  }
}

function readSqlBatches(directoryName, fileName) {
  const filePath = path.resolve(
    __dirname,
    "..",
    "src",
    "database",
    directoryName,
    fileName
  );
  const sql = fs.readFileSync(filePath, "utf8");

  return sql
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function runSqlFile(directoryName, fileName) {
  for (const batch of readSqlBatches(directoryName, fileName)) {
    await sequelize.query(batch);
  }
}

async function runApplicationMigrations() {
  for (const fileName of APPLICATION_MIGRATIONS) {
    await runSqlFile("migrations", fileName);
  }
}

async function seedDevelopmentLogin() {
  const email = String(process.env.DEV_LOGIN_EMAIL || "developer@herp.local")
    .trim()
    .toLowerCase();
  const domain = String(
    process.env.DEV_LOGIN_DOMAIN || "HOO-PDC.vebalibya.local"
  ).trim();
  const displayName = String(
    process.env.DEV_LOGIN_DISPLAY_NAME || "Local Development Administrator"
  ).trim();
  const samAccountName = String(
    process.env.DEV_LOGIN_SAM_ACCOUNT_NAME || "herp_developer"
  ).trim();

  if (!email.includes("@")) {
    throw new Error("DEV_LOGIN_EMAIL must be a valid email address.");
  }

  const payload = {
    Username: email,
    Email: email,
    DisplayName: displayName,
    AuthProvider: "AD",
    DomainName: domain,
    SamAccountName: samAccountName,
    UserPrincipalName: email,
    PasswordHash: null,
    IsAdSynced: false,
    IsActive: true,
    IsLocked: false,
    FailedLoginCount: 0,
    LockoutUntil: null,
    MustChangePassword: false,
    DeletedAt: null,
    IsWeb: true,
    IsMobile: false
  };

  const existing = await User.findOne({ where: { Email: email } });
  if (existing) {
    await existing.update(payload);
  } else {
    await User.create(payload);
  }

  return email;
}

async function collectCounts() {
  const [counts] = await sequelize.query(
    `SELECT
       (SELECT COUNT_BIG(*) FROM [dbo].[jobs]) AS [jobs],
       (SELECT COUNT_BIG(*) FROM [dbo].[Employee]) AS [employees],
       (SELECT COUNT_BIG(*) FROM [dbo].[Position]) AS [positions],
       (SELECT COUNT_BIG(*) FROM [dbo].[LineLevel]) AS [lineLevels],
       (SELECT COUNT_BIG(*) FROM [dbo].[Position] WHERE [LineLevelId] IS NOT NULL)
         AS [classifiedPositions],
       (SELECT COUNT_BIG(*) FROM [dbo].[Vacation]) AS [vacations],
       (SELECT COUNT_BIG(*) FROM [dbo].[Position] WHERE [EmployeeId] IS NULL) AS [vacantPositions];`,
    { type: QueryTypes.SELECT }
  );

  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, Number(value)])
  );
}

async function main() {
  assertDedicatedLocalDatabase();
  await sequelize.authenticate();

  await runSqlFile("dev", "001-hr-schema.sql");
  await runSqlFile("dev", "004-vacation-schema.sql");

  // Create only missing authentication/general tables required by the
  // migration chain. Existing tables are never altered or dropped by sync.
  await sequelize.sync({ force: false, alter: false });

  await runApplicationMigrations();

  // Register every model used by the merged application. A second safe sync
  // creates only model-backed tables that do not have an explicit SQL migration
  // (for example AFE, Bank, and TimeSheet).
  require("../src/model/Finance/index.ts");
  require("../src/model/HR/index.ts");
  await sequelize.sync({ force: false, alter: false });

  await runSqlFile("dev", "003-auth-constraints.sql");
  await runSqlFile("dev", "002-sanitized-seed.sql");
  await runSqlFile("dev", "005-vacation-seed.sql");
  await runSqlFile("dev", "006-line-level-seed.sql");
  const loginEmail = await seedDevelopmentLogin();
  const counts = await collectCounts();

  console.log("[local-db] HERP_LOCAL bootstrap completed.");
  console.log(`[local-db] Development login: ${loginEmail} (password field may be empty).`);
  console.log(`[local-db] Synthetic seed counts: ${JSON.stringify(counts)}`);
}

main()
  .catch((error) => {
    console.error(
      "[local-db] Bootstrap failed:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
