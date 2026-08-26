"use strict";

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const backendRoot = path.resolve(__dirname, "..");
const localEnvPath = path.join(backendRoot, ".env.local");
const exampleEnvPath = path.join(backendRoot, ".env.local.example");

const stop = (message) => {
  console.error(`[local-env] ${message}`);
  process.exit(1);
};

if (!fs.existsSync(localEnvPath)) {
  stop(
    `Missing ${localEnvPath}. Copy ${exampleEnvPath} to .env.local and add local-only values.`
  );
}

// The dedicated local file is authoritative. In particular, inherited shell
// variables must never redirect start:dev-db to the company database.
const loadResult = dotenv.config({ path: localEnvPath, override: true });
if (loadResult.error) {
  stop(`Could not load ${localEnvPath}: ${loadResult.error.message}`);
}

// These defaults are intentionally populated before server.js performs its
// existing default .env load. That keeps local development from inheriting
// production-oriented optional settings that were omitted from .env.local.
const safeLocalDefaults = {
  NODE_ENV: "development",
  PORT: "3000",
  DB_PORT: "1433",
  DB_ENCRYPT: "false",
  DB_TRUST_SERVER_CERTIFICATE: "true",
  DB_AUTO_SYNC: "false",
  AD_LDAP_SERVER: "",
  AD_LDAP_PORT: "389",
  AD_LDAP_USE_TLS: "false",
  ENTRA_TENANT_ID: "",
  ENTRA_CLIENT_ID: "",
  ENTRA_API_AUDIENCE: "",
  ENTRA_ISSUER: "",
  ENTRA_JWKS_URI: "",
  ENTRA_GROUP_SYNC_MODE: "token_or_graph",
  GRAPH_ENABLED: "false",
  GRAPH_TENANT_ID: "",
  GRAPH_CLIENT_ID: "",
  GRAPH_CLIENT_SECRET: "",
  GRAPH_SCOPE: "https://graph.microsoft.com/.default",
  REFRESH_TOKEN_DAYS: "7"
};

const parsedLocalValues = loadResult.parsed || {};
for (const [name, value] of Object.entries(safeLocalDefaults)) {
  if (!Object.prototype.hasOwnProperty.call(parsedLocalValues, name)) {
    process.env[name] = value;
  }
}

const requiredLocalDatabaseValues = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingValues = requiredLocalDatabaseValues.filter(
  (name) => !String(process.env[name] ?? "").trim()
);

if (missingValues.length > 0) {
  stop(
    `.env.local must define non-empty local values for: ${missingValues.join(", ")}.`
  );
}

const localHost = String(process.env.DB_HOST).trim().toLowerCase();
const localDatabase = String(process.env.DB_NAME).trim().toUpperCase();
const allowedLocalHosts = new Set(["127.0.0.1", "localhost", "::1"]);

if (!allowedLocalHosts.has(localHost) || localDatabase !== "HERP_LOCAL") {
  stop(
    "Safety stop: local development is restricted to HERP_LOCAL on 127.0.0.1/localhost."
  );
}

if (String(process.env.NODE_ENV).trim().toLowerCase() === "production") {
  stop("Safety stop: .env.local cannot use NODE_ENV=production.");
}

console.log("[local-env] Loaded BackEnd/.env.local for local development.");
