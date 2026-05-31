const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const userRouter = require("./router/userRouter");
const { checkDbConnection } = require("./db/pool");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(morgan("dev"));
app.use(express.static("./public"));

app.use("/api/v1/users", userRouter);

app.listen(port, async () => {
  console.log(`[startup] server up on port ${port}`);

  const dbHealth = await checkDbConnection();
  if (dbHealth.ok) {
    console.log(
      `[startup] db up (${dbHealth.host} -> ${dbHealth.address}, IPv${dbHealth.family})`
    );
  } else {
    console.error(`[startup] db down: ${dbHealth.reason}`);
    if (dbHealth.code === "ENOTFOUND") {
      console.error(
        "[startup] hint: DB_HOST DNS failed. Check host value and internet/VPN/DNS settings."
      );
    }
  }
});
