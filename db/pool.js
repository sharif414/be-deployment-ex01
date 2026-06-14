const { Pool } = require("pg");
const dotenv = require("dotenv");
const dns = require("node:dns/promises");

dotenv.config({ path: "./config.env" });

const requiredEnvKeys = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const missingEnvKeys = hasDatabaseUrl
  ? []
  : requiredEnvKeys.filter((key) => !process.env[key]);

const pool = new Pool(
  hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkDbConnection = async () => {
  if (missingEnvKeys.length > 0) {
    return {
      ok: false,
      reason: `Missing DB env vars: ${missingEnvKeys.join(", ")}`,
    };
  }

  const host = hasDatabaseUrl
    ? new URL(process.env.DATABASE_URL).hostname
    : process.env.DB_HOST;

  try {
    const resolved = await dns.lookup(host);
    const result = await pool.query("SELECT 1 AS health");

    return {
      ok: true,
      host,
      address: resolved.address,
      family: resolved.family,
      health: result.rows[0].health,
    };
  } catch (err) {
    return {
      ok: false,
      host,
      code: err.code,
      reason: err.message,
    };
  }
};

const checkDbConnectionWithRetry = async (
  retries = Number(process.env.DB_CONNECT_RETRIES || 3),
  delayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 1500),
) => {
  let lastResult;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    lastResult = await checkDbConnection();
    if (lastResult.ok) {
      return { ...lastResult, attempts: attempt };
    }

    if (attempt < retries) {
      await sleep(delayMs);
    }
  }

  return { ...lastResult, attempts: retries };
};

module.exports = pool;
module.exports.checkDbConnection = checkDbConnection;
module.exports.checkDbConnectionWithRetry = checkDbConnectionWithRetry;
