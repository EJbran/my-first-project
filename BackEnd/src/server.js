require("dotenv").config();
require("ts-node/register/transpile-only");
const express = require("express");
const { DataTypes, Op } = require("sequelize");
const {
  sequelize,
  connectWithMssql,
  connectWithSequelize
} = require("./config/database");
const { User } = require("./model/Authentication/index.ts");
require("./model/General/index.ts");
require("./model/Finance/index.ts");
require("./model/HR/index.ts");

const authRoutes = require("./routes/Authentication/auth.routes.ts").default;
const adGroupRoleMappingRoutes = require("./routes/Authentication/adGroupRoleMapping.routes.ts").default;
const authDomainRoutes = require("./routes/Authentication/authDomain.routes.ts").default;

const locationRoutes = require("./routes/General/location.routes.ts").default;
const subLocationRoutes = require("./routes/General/subLocation.routes.ts").default;
const departmentRoutes = require("./routes/General/department.routes.ts").default;
const epsaRoutes = require("./routes/General/epsa.routes.ts").default;
const bankGeneralRoutes = require("./routes/Finance/bankGeneral.routes.ts").default;
const bankRoutes = require("./routes/Finance/bank.routes.ts").default;
const bankSerialCheckRoutes = require("./routes/Finance/bankSerialCheck.routes.ts").default;
const chartGroupRoutes = require("./routes/Finance/coaAccountGroup.routes.ts").default;
const chartOfAccountsRoutes = require("./routes/Finance/chartOfAccounts.routes.ts").default;
const accountMappingRoutes = require("./routes/Finance/epsaDepartmentChartAccount.routes.ts").default;
const afeRoutes = require("./routes/Finance/afe.routes.ts").default;
const assetRoutes = require("./routes/Finance/asset.routes.ts").default;
const assetCategoryRoutes = require("./routes/Finance/assetCategory.routes.ts").default;
const categoryAttributesRoutes = require("./routes/Finance/categoryAttributes.routes.ts").default;
const timeSheetCodeRoutes = require("./routes/HR/timeSheetCode.routes.ts").default;
const holidayRoutes = require("./routes/HR/holiday.routes.ts").default;
const timesheetRoutes = require("./routes/HR/timesheet.routes.ts").default;
const employeeRoutes = require("./routes/HR/employee.routes.ts").default;
const organizationRoutes = require("./routes/HR/organization.routes.ts").default;
const reportRoutes = require("./routes/HR/report.routes.ts").default;
const positionRoutes = require("./routes/HR/position.routes.ts").default;
const jobRoutes = require("./routes/HR/job.routes.ts").default;
const { errorHandler } = require("./middleware/errorHandler.ts");

const app = express();
const port = Number(process.env.PORT || 3000);

const parseQualifiedTableName = (qualifiedTableName) => {
  const [schemaName, tableName] = String(qualifiedTableName || "").split(".");

  if (!schemaName || !tableName) {
    throw new Error(`Invalid qualified table name: ${qualifiedTableName}`);
  }

  return {
    schemaName,
    tableName
  };
};

async function tableExists(qualifiedTableName) {
  const queryInterface = sequelize.getQueryInterface();
  const { schemaName, tableName } = parseQualifiedTableName(qualifiedTableName);

  try {
    await queryInterface.describeTable({
      tableName,
      schema: schemaName
    });

    return true;
  } catch (_error) {
    return false;
  }
}

async function getMissingColumns(schemaName, tableName, requiredColumns) {
  const queryInterface = sequelize.getQueryInterface();
  const describedColumns = await queryInterface.describeTable({
    tableName,
    schema: schemaName
  });

  const existing = new Set(Object.keys(describedColumns).map((column) => column.toLowerCase()));

  return requiredColumns.filter((column) => !existing.has(column.toLowerCase()));
}

async function addMissingUsersColumns(missingColumns) {
  const queryInterface = sequelize.getQueryInterface();
  const tableRef = { tableName: "Users", schema: "dbo" };
  const columnDefinitions = {
    DomainName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    IsAdSynced: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    IsMobile: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    IsWeb: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  };

  for (const column of missingColumns) {
    const columnDefinition = columnDefinitions[column];
    if (!columnDefinition) {
      continue;
    }

    console.warn(`Adding missing column dbo.Users.${column} ...`);
    await queryInterface.addColumn(tableRef, column, columnDefinition);
  }
}

async function getUsersPasswordConstraint() {
  const [constraints] = await sequelize.query(`
    SELECT
      [name] AS [constraintName],
      [definition],
      [is_disabled] AS [isDisabled],
      [is_not_trusted] AS [isNotTrusted]
    FROM sys.check_constraints
    WHERE [parent_object_id] = OBJECT_ID(N'dbo.Users')
      AND [name] = N'CK_Users_Password_By_Provider';
  `);

  const passwordConstraint = Array.isArray(constraints) ? constraints[0] : null;

  if (!passwordConstraint) {
    return null;
  }

  return {
    name: String(passwordConstraint.constraintName || ""),
    definition: String(passwordConstraint.definition || ""),
    isDisabled: Boolean(passwordConstraint.isDisabled),
    isNotTrusted: Boolean(passwordConstraint.isNotTrusted)
  };
}

const isExpectedUsersPasswordConstraint = (definition) => {
  const normalized = String(definition || "")
    .replace(/[\[\]()]/g, "")
    .replace(/\bN'/gi, "'")
    .replace(/\s+/g, "")
    .toUpperCase();
  return (
    normalized.includes("AUTHPROVIDERIN('AD','LDAP','SSO')ANDPASSWORDHASHISNULL") &&
    normalized.includes("AUTHPROVIDER='LOCAL'ANDPASSWORDHASHISNOTNULL")
  );
};

async function ensureUsersPasswordConstraint(autoSync) {
  const constraint = await getUsersPasswordConstraint();
  const hasExpectedConstraint =
    constraint &&
    !constraint.isDisabled &&
    !constraint.isNotTrusted &&
    isExpectedUsersPasswordConstraint(constraint.definition);

  if (hasExpectedConstraint) {
    return;
  }

  if (!autoSync) {
    throw new Error(
      "dbo.Users has an incompatible CK_Users_Password_By_Provider constraint. Enable DB_AUTO_SYNC=true once to auto-fix or apply migration manually."
    );
  }

  // Align data to the intended hybrid model. DB check-constraint changes are migration-managed.
  await User.update(
    { PasswordHash: null },
    {
      where: {
        AuthProvider: {
          [Op.in]: ["AD", "LDAP", "SSO"]
        }
      }
    }
  );

  if (!constraint?.name) {
    console.warn(
      "CK_Users_Password_By_Provider was not found via Sequelize metadata. Enforce at migration/model level."
    );
    return;
  }

  console.warn(
    "CK_Users_Password_By_Provider exists but is not modified here. Use Sequelize migration/queryInterface to manage constraints."
  );
}

async function ensureAuthSchema() {
  const autoSync = String(process.env.DB_AUTO_SYNC || "false").toLowerCase() === "true";
  const usersTableExists = await tableExists("dbo.Users");

  if (!usersTableExists) {
    if (!autoSync) {
      throw new Error(
        "Missing required table dbo.Users. Verify DB_NAME points to the initialized ERP database or enable DB_AUTO_SYNC=true for development bootstrap."
      );
    }

    console.warn(
      "dbo.Users not found. Running sequelize.sync({ alter: true }) because DB_AUTO_SYNC=true."
    );
    await sequelize.sync({ alter: true });

    const usersTableExistsAfterSync = await tableExists("dbo.Users");
    if (!usersTableExistsAfterSync) {
      throw new Error(
        "Schema bootstrap failed: dbo.Users is still missing after sequelize.sync({ alter: true })."
      );
    }
  }

  const requiredUserColumns = ["DomainName", "IsAdSynced", "IsMobile", "IsWeb"];
  const missingUserColumns = await getMissingColumns("dbo", "Users", requiredUserColumns);
  if (missingUserColumns.length > 0) {
    if (!autoSync) {
      throw new Error(
        `dbo.Users is missing required columns: ${missingUserColumns.join(", ")}. Run DB migrations or set DB_AUTO_SYNC=true for development auto-fix.`
      );
    }

    console.warn(
      `dbo.Users is missing columns (${missingUserColumns.join(", ")}). Running targeted ALTER TABLE statements because DB_AUTO_SYNC=true.`
    );
    await addMissingUsersColumns(missingUserColumns);

    const missingAfterSync = await getMissingColumns("dbo", "Users", requiredUserColumns);
    if (missingAfterSync.length > 0) {
      throw new Error(
        `Schema auto-fix failed: dbo.Users is still missing columns: ${missingAfterSync.join(", ")}.`
      );
    }
  }

  const policiesTableExists = await tableExists("dbo.SecurityPolicies");
  if (!policiesTableExists) {
    console.warn(
      "dbo.SecurityPolicies is missing. Authentication policy values will fall back to defaults."
    );
  }

  await ensureUsersPasswordConstraint(autoSync);
}

async function ensureDefaultAdUser() {
  const defaultEmail = String(
    process.env.DEV_LOGIN_EMAIL || "zied.hasni@harouge.com"
  )
    .trim()
    .toLowerCase();
  const defaultUsername = defaultEmail;
  const defaultSamAccountName = String(
    process.env.DEV_LOGIN_SAM_ACCOUNT_NAME || "z_hasni"
  ).trim();
  const defaultDomain = String(
    process.env.DEV_LOGIN_DOMAIN || "HOO-PDC.vebalibya.local"
  ).trim();
  const defaultDisplayName = String(
    process.env.DEV_LOGIN_DISPLAY_NAME || "Zied Hasni"
  ).trim();

  const existing = await User.findOne({
    where: {
      Email: defaultEmail
    }
  });

  if (existing) {
    const updates = {};

    if (!String(existing.DomainName || "").trim()) {
      updates.DomainName = defaultDomain;
    }

    if (!String(existing.SamAccountName || "").trim()) {
      updates.SamAccountName = defaultSamAccountName;
    }

    if (!String(existing.UserPrincipalName || "").trim()) {
      updates.UserPrincipalName = defaultEmail;
    }

    if (!["AD", "LDAP"].includes(String(existing.AuthProvider || ""))) {
      updates.AuthProvider = "AD";
    }

    const effectiveAuthProvider = updates.AuthProvider || existing.AuthProvider;
    if (["AD", "LDAP", "SSO"].includes(String(effectiveAuthProvider || ""))) {
      updates.PasswordHash = null;
    }

    if (Object.keys(updates).length > 0) {
      await existing.update(updates);
    }

    console.log(`Default AD user already exists: ${defaultEmail}`);
    return;
  }

  await User.create({
    Username: defaultUsername,
    Email: defaultEmail,
    DisplayName: defaultDisplayName,
    AuthProvider: "AD",
    DomainName: defaultDomain,
    SamAccountName: defaultSamAccountName,
    UserPrincipalName: defaultEmail,
    PasswordHash: null,
    IsActive: true,
    IsWeb: true,
    IsMobile: false
  });

  console.log(`Default AD user created: ${defaultEmail}`);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Vary", "Origin");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-id, x-request-id"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    message: "Backend is running"
  });
});

app.use(authRoutes);
app.use(adGroupRoleMappingRoutes);
app.use(authDomainRoutes);

app.use(locationRoutes);
app.use(subLocationRoutes);
app.use(departmentRoutes);
app.use(epsaRoutes);
app.use(bankGeneralRoutes);
app.use(bankRoutes);
app.use(bankSerialCheckRoutes);
app.use(chartGroupRoutes);
app.use(chartOfAccountsRoutes);
app.use(accountMappingRoutes);
app.use(afeRoutes);
app.use(assetRoutes);
app.use(assetCategoryRoutes);
app.use(categoryAttributesRoutes);
app.use(timeSheetCodeRoutes);
app.use(holidayRoutes);
app.use(timesheetRoutes);
app.use(employeeRoutes);
app.use(organizationRoutes);
app.use(reportRoutes);
app.use(jobRoutes);
app.use(positionRoutes);
app.use(errorHandler);

async function bootstrap() {
  try {
    await connectWithMssql();
    await connectWithSequelize();
    await ensureAuthSchema();

    try {
      await ensureDefaultAdUser();
    } catch (error) {
      console.warn(
        "Default AD user seed failed; continuing startup.",
        error instanceof Error ? error.message : error
      );
    }

    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

bootstrap();
