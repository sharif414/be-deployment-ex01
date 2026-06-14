const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config({ path: "./config.env" });

const router = require("./router/router");
const customerRouter = require("./router/customerRouter");
const errors = require("./utils/errors");
const { checkDbConnectionWithRetry } = require("./db/pool");

const app = express();
const port = process.env.PORT || 3000;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // limit each IP to 15 requests per windowMs
});

app.use(limiter);
app.use(helmet());
app.use(express.json({ limit: "10kb" })); // Limit JSON body to 10kb
app.use(morgan("dev"));
app.use(express.static("./public"));

app.use("/api/v1/users", router);
app.use("/api/v1/customers", customerRouter);

// Middleware for undefined routes -> 404 Not Found
app.use(errors.notFoundRoute);

// Global error handler
app.use(errors.ApiError);

app.listen(port, async () => {
  console.log(`[startup] server up on port ${port}`);

  try {
    const dbHealth = await checkDbConnectionWithRetry();
    if (dbHealth.ok) {
      console.log(
        `[startup] db up (${dbHealth.host} -> ${dbHealth.address}, IPv${dbHealth.family}) after ${dbHealth.attempts} attempt(s)`,
      );
    } else {
      console.error(
        `[startup] db down after ${dbHealth.attempts} attempt(s): ${dbHealth.reason}`,
      );
      if (dbHealth.code === "ENOTFOUND") {
        console.error(
          "[startup] hint: DB_HOST DNS failed. Check host value and internet/VPN/DNS settings.",
        );
      }
    }
  } catch (err) {
    console.error(`[startup] db check failed unexpectedly: ${err.message}`);
  }
});
