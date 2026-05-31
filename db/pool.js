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

const missingEnvKeys = requiredEnvKeys.filter((key) => !process.env[key]);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const checkDbConnection = async () => {
  if (missingEnvKeys.length > 0) {
    return {
      ok: false,
      reason: `Missing DB env vars: ${missingEnvKeys.join(", ")}`,
    };
  }

  try {
    const host = process.env.DB_HOST;
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
      host: process.env.DB_HOST,
      code: err.code,
      reason: err.message,
    };
  }
};

module.exports = pool;
module.exports.checkDbConnection = checkDbConnection;
