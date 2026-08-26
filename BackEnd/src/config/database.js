require("dotenv").config();
const { Sequelize } = require("sequelize");
const sql = require("mssql");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

const dbHost = getRequiredEnv("DB_HOST");
const dbPort = Number(process.env.DB_PORT || 1433);
const dbUser = getRequiredEnv("DB_USER");
const dbPassword = getRequiredEnv("DB_PASSWORD");
const dbName = getRequiredEnv("DB_NAME");
const dbEncrypt = parseBoolean(process.env.DB_ENCRYPT, true);
const dbTrustServerCertificate = parseBoolean(
  process.env.DB_TRUST_SERVER_CERTIFICATE,
  false
);

if (!Number.isInteger(dbPort) || dbPort <= 0) {
  throw new Error("DB_PORT must be a valid positive integer");
}

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: "mssql",
  dialectModule: require("tedious"),
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  dialectOptions: {
    options: {
      encrypt: dbEncrypt,
      trustServerCertificate: dbTrustServerCertificate,
      // Default tedious requestTimeout is 15000ms; raise to avoid false timeouts on LAN SQL.
      requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT_MS || 60000),
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 30000)
    }
  }
});

const mssqlConfig = {
  user: dbUser,
  password: dbPassword,
  server: dbHost,
  database: dbName,
  port: dbPort,
  options: {
    encrypt: dbEncrypt,
    trustServerCertificate: dbTrustServerCertificate
  }
};

async function connectWithMssql() {
  const pool = await sql.connect(mssqlConfig);
  console.log("MSSQL connected successfully.");
  return pool;
}

async function connectWithSequelize() {
  await sequelize.authenticate();
  console.log("Sequelize connected successfully.");
}

module.exports = {
  sequelize,
  connectWithMssql,
  connectWithSequelize
};
