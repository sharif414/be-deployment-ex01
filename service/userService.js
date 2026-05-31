let pool;
const { createError } = require("../utils/errors");

try {
  pool = require("../db/pool");
} catch (err) {
  console.warn("Database pool could not be initialized:", err.message);
}

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateUser = ({ name, email, age }) => {
  if (!name || typeof name !== "string" || name.trim() === "") {
    return "Name is required and must be a non-empty string";
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return "Email is required and must be a valid email address";
  }

  if (age === undefined || Number.isNaN(Number(age)) || Number(age) <= 0) {
    return "Age is required and must be a positive number";
  }

  return null;
};

const ensureDbPool = () => {
  if (!pool) {
    throw createError("Database connection not available", 503, "error");
  }
};

const shouldSimulateDbError = (req) => {
  return (
    process.env.SIMULATE_DB_QUERY_ERROR === "true" ||
    req.headers["x-simulate-db-error"] === "true" ||
    req.query.simulateDbError === "true"
  );
};

const maybeThrowSimulatedDbError = (req) => {
  if (shouldSimulateDbError(req)) {
    throw createError("Simulated database query failure", 500, "error");
  }
};

const toQueryError = (err, fallbackMessage) => {
  if (err.statusCode) return err;
  if (err.code === "23505") {
    return createError("Email already exists", 400, "fail");
  }
  return createError(fallbackMessage, 500, "error", { cause: err.message });
};

exports.getAllUsers = async (req, res, next) => {
  try {
    ensureDbPool();
    maybeThrowSimulatedDbError(req);

    const {
      age,
      name,
      email,
      page = 1,
      limit = 10,
      sortBy = "id",
      order = "asc",
    } = req.query;

    const allowedSortFields = ["id", "name", "email", "age"];
    const allowedOrder = ["asc", "desc"];

    if (!allowedSortFields.includes(sortBy)) {
      return next(
        createError(
          "Invalid sortBy. Allowed values are id, name, email, age",
          400,
          "fail",
        ),
      );
    }

    if (!allowedOrder.includes(order.toLowerCase())) {
      return next(createError("Invalid order. Allowed values are asc or desc", 400, "fail"));
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (pageNumber <= 0 || limitNumber <= 0) {
      return next(createError("Page and limit must be positive numbers", 400, "fail"));
    }

    let sql = "SELECT * FROM public.users WHERE 1=1";
    const values = [];

    if (age) {
      values.push(Number(age));
      sql += ` AND age = $${values.length}`;
    }

    if (name) {
      values.push(`%${name}%`);
      sql += ` AND name ILIKE $${values.length}`;
    }

    if (email) {
      values.push(`%${email}%`);
      sql += ` AND email ILIKE $${values.length}`;
    }

    const offset = (pageNumber - 1) * limitNumber;

    sql += ` ORDER BY ${sortBy} ${order.toUpperCase()}`;
    values.push(limitNumber);
    sql += ` LIMIT $${values.length}`;

    values.push(offset);
    sql += ` OFFSET $${values.length}`;

    const response = await pool.query(sql, values);

    return res.status(200).json({
      status: "success",
      page: pageNumber,
      limit: limitNumber,
      results: response.rowCount,
      data: response.rows,
    });
  } catch (err) {
    return next(toQueryError(err, "Server error while retrieving users"));
  }
};

exports.createUser = async (req, res, next) => {
  try {
    ensureDbPool();
    maybeThrowSimulatedDbError(req);

    const { name, email, age } = req.body;
    const validationError = validateUser({ name, email, age });

    if (validationError) {
      return next(createError(validationError, 400, "fail"));
    }

    const sql = `
      INSERT INTO public.users (name, email, age)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [name, email, Number(age)];
    const response = await pool.query(sql, values);

    return res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: response.rows[0],
    });
  } catch (err) {
    return next(toQueryError(err, "Server error while creating user"));
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    ensureDbPool();
    maybeThrowSimulatedDbError(req);

    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return next(createError("Invalid user id", 400, "fail"));
    }

    const sql = "SELECT * FROM public.users WHERE id = $1";
    const values = [id];
    const response = await pool.query(sql, values);

    if (response.rowCount === 0) {
      return next(createError("User not found", 404, "fail"));
    }

    return res.status(200).json({
      status: "success",
      data: response.rows[0],
    });
  } catch (err) {
    return next(toQueryError(err, "Server error while retrieving user"));
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    ensureDbPool();
    maybeThrowSimulatedDbError(req);

    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return next(createError("Invalid user id", 400, "fail"));
    }

    const { name, email, age } = req.body;
    const validationError = validateUser({ name, email, age });

    if (validationError) {
      return next(createError(validationError, 400, "fail"));
    }

    const sql = `
      UPDATE public.users
      SET name = $1,
          email = $2,
          age = $3
      WHERE id = $4
      RETURNING *;
    `;

    const values = [name, email, Number(age), id];
    const response = await pool.query(sql, values);

    if (response.rowCount === 0) {
      return next(createError("User not found", 404, "fail"));
    }

    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: response.rows[0],
    });
  } catch (err) {
    return next(toQueryError(err, "Server error while updating user"));
  }
};

exports.deleteUserById = async (req, res, next) => {
  try {
    ensureDbPool();
    maybeThrowSimulatedDbError(req);

    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return next(createError("Invalid user id", 400, "fail"));
    }

    const sql = "DELETE FROM public.users WHERE id = $1 RETURNING *";
    const values = [id];
    const response = await pool.query(sql, values);

    if (response.rowCount === 0) {
      return next(createError("User not found", 404, "fail"));
    }

    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
      data: response.rows[0],
    });
  } catch (err) {
    return next(toQueryError(err, "Server error while deleting user"));
  }
};

exports.createBulkUsers = async (req, res, next) => {
  try {
    ensureDbPool();
    maybeThrowSimulatedDbError(req);

    const users = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return next(createError("Request body must be a non-empty array of users", 400, "fail"));
    }

    for (const user of users) {
      const validationError = validateUser(user);

      if (validationError) {
        return next(createError(validationError, 400, "fail", { invalidUser: user }));
      }
    }

    const values = [];
    const placeholders = users
      .map((user, index) => {
        const baseIndex = index * 3;
        values.push(user.name, user.email, Number(user.age));
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
      })
      .join(", ");

    const sql = `
      INSERT INTO public.users (name, email, age)
      VALUES ${placeholders}
      RETURNING *;
    `;

    const response = await pool.query(sql, values);

    return res.status(201).json({
      status: "success",
      message: "Users created successfully",
      results: response.rowCount,
      data: response.rows,
    });
  } catch (err) {
    if (err.code === "23505") {
      return next(createError("One or more emails already exist", 400, "fail"));
    }
    return next(toQueryError(err, "Server error while creating bulk users"));
  }
};
