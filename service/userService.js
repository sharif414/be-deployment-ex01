let pool;
const encrypt = require("../utils/encrypt");
const { hashPassword, comparePassword } = encrypt;

try {
  pool = require("../db/pool");
} catch (err) {
  console.error("Failed to load db pool:", err.message);
  pool = null;
}

const isValidEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const ALLOWED_ROLES = ["user", "admin"];

const validateUser = ({
  first_name,
  email,
  username,
  user_password,
  roles,
}) => {
  if (
    !first_name ||
    typeof first_name !== "string" ||
    first_name.trim() === ""
  ) {
    return "first_name is required and must be a non-empty string";
  }

  if (!isValidEmail(email)) {
    return "Email must be a valid email address";
  }

  if (username !== undefined && typeof username !== "string") {
    return "username must be a string";
  }

  if (user_password !== undefined && typeof user_password !== "string") {
    return "user_password must be a string";
  }

  if (roles !== undefined && !ALLOWED_ROLES.includes(roles)) {
    return `roles must be one of: ${ALLOWED_ROLES.join(", ")}`;
  }

  return null;
};

const sanitizeUser = (user) => {
  if (!user) return user;
  const { user_password, ...safeUser } = user;
  return safeUser;
};

exports.getAllUsers = async (req, res) => {
  if (!pool) {
    return res
      .status(503)
      .json({ status: "error", message: "Database connection not available" });
  }

  try {
    const {
      first_name,
      last_name,
      email,
      username,
      page = 1,
      limit = 10,
      sortBy = "id",
      order = "asc",
    } = req.query;

    const allowedSortFields = [
      "id",
      "first_name",
      "last_name",
      "email",
      "username",
    ];
    const allowedOrder = ["asc", "desc"];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        status: "fail",
        message:
          "Invalid sortBy. Allowed values are id, first_name, last_name, email, username",
      });
    }

    if (!allowedOrder.includes(order.toLowerCase())) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid order. Allowed values are asc or desc",
      });
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (pageNumber <= 0 || limitNumber <= 0) {
      return res.status(400).json({
        status: "fail",
        message: "Page and limit must be positive numbers",
      });
    }

    let sql = "SELECT * FROM public.users WHERE 1=1";
    const values = [];

    if (first_name) {
      values.push(`%${first_name}%`);
      sql += ` AND first_name ILIKE $${values.length}`;
    }

    if (last_name) {
      values.push(`%${last_name}%`);
      sql += ` AND last_name ILIKE $${values.length}`;
    }

    if (email) {
      values.push(`%${email}%`);
      sql += ` AND email ILIKE $${values.length}`;
    }

    if (username) {
      values.push(`%${username}%`);
      sql += ` AND username ILIKE $${values.length}`;
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
      data: response.rows.map(sanitizeUser),
    });
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error while retrieving users",
      error: err.message,
    });
  }
};
exports.signUp = async (req, res) => {
  if (!pool) {
    return res
      .status(503)
      .json({ status: "error", message: "Database connection not available" });
  }

  try {
    const { first_name, last_name, email, username, user_password, roles } =
      req.body;
    const validationError = validateUser({
      first_name,
      email,
      username,
      user_password,
      roles,
    });

    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }

    // Check duplicate username and email
    const duplicateCheck = await pool.query(
      `SELECT username, email FROM public.users WHERE username = $1 OR email = $2`,
      [username, email],
    );

    if (duplicateCheck.rows.length > 0) {
      const existing = duplicateCheck.rows[0];
      if (existing.username === username) {
        return res.status(409).json({
          status: "fail",
          message: "Username is already taken",
        });
      }
      if (existing.email === email) {
        return res.status(409).json({
          status: "fail",
          message: "Email is already registered",
        });
      }
    }

    const hashedPassword = user_password
      ? await hashPassword(user_password)
      : null;

    const sql = `
      INSERT INTO public.users (first_name, last_name, email, username, user_password, roles)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      first_name,
      last_name || null,
      email || null,
      username || null,
      hashedPassword,
      roles || "user",
    ];
    const response = await pool.query(sql, values);

    const token = await encrypt.generateJWT({
      id: response.rows[0].id,
      email: response.rows[0].email,
      username: response.rows[0].username,
      roles: response.rows[0].roles,
    });

    return res.status(201).json({
      status: "success",
      token,
      data: sanitizeUser(response.rows[0]),
    });
  } catch (err) {
    // Fallback catch for DB-level unique constraint violation
    if (err.code === "23505") {
      const field = err.constraint?.includes("username") ? "Username" : "Email";
      return res.status(409).json({
        status: "fail",
        message: `${field} is already taken`,
      });
    }

    console.error("Database error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error while creating user",
      error: err.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  if (!pool) {
    return res
      .status(503)
      .json({ status: "error", message: "Database connection not available" });
  }

  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) {
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user id" });
    }

    const response = await pool.query(
      "SELECT * FROM public.users WHERE id = $1",
      [id],
    );
    if (response.rowCount === 0) {
      return res
        .status(404)
        .json({ status: "fail", message: "user not found" });
    }

    return res
      .status(200)
      .json({ status: "success", data: sanitizeUser(response.rows[0]) });
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error while retrieving user",
      error: err.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  if (!pool) {
    return res
      .status(503)
      .json({ status: "error", message: "Database connection not available" });
  }

  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) {
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user id" });
    }

    const { first_name, last_name, email, username, user_password } = req.body;
    const validationError = validateUser({
      first_name,
      email,
      username,
      user_password,
    });

    if (validationError) {
      return res.status(400).json({ status: "fail", message: validationError });
    }

    const hashedPassword = user_password
      ? await hashPassword(user_password)
      : null;

    const sql = `
      UPDATE public.users
      SET first_name = $1,
          last_name = $2,
          email = $3,
          username = $4,
          user_password = $5
      WHERE id = $6
      RETURNING *;
    `;

    const values = [
      first_name,
      last_name || null,
      email || null,
      username || null,
      hashedPassword,
      id,
    ];
    const response = await pool.query(sql, values);

    if (response.rowCount === 0) {
      return res
        .status(404)
        .json({ status: "fail", message: "user not found" });
    }

    return res.status(200).json({
      status: "success",
      message: "user updated successfully",
      data: sanitizeUser(response.rows[0]),
    });
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating user",
      error: err.message,
    });
  }
};

exports.deleteUserById = async (req, res) => {
  if (!pool) {
    return res
      .status(503)
      .json({ status: "error", message: "Database connection not available" });
  }

  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) {
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user id" });
    }

    const response = await pool.query(
      "DELETE FROM public.users WHERE id = $1 RETURNING *",
      [id],
    );
    if (response.rowCount === 0) {
      return res
        .status(404)
        .json({ status: "fail", message: "user not found" });
    }

    return res.status(200).json({
      status: "success",
      message: "user deleted successfully",
      data: sanitizeUser(response.rows[0]),
    });
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error while deleting user",
      error: err.message,
    });
  }
};

exports.createBulkUsers = async (req, res) => {
  if (!pool) {
    return res
      .status(503)
      .json({ status: "error", message: "Database connection not available" });
  }

  try {
    const users = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Request body must be a non-empty array of users",
      });
    }

    for (const user of users) {
      const validationError = validateUser(user);
      if (validationError) {
        return res.status(400).json({
          status: "fail",
          message: validationError,
          invalidUser: user,
        });
      }
    }

    const values = [];

    const placeholders = await Promise.all(
      users.map(async (user, index) => {
        const baseIndex = index * 5;
        const hashedPassword = user.user_password
          ? await hashPassword(user.user_password)
          : null;

        values.push(
          user.first_name,
          user.last_name || null,
          user.email || null,
          user.username || null,
          hashedPassword,
        );

        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`;
      }),
    );

    const sql = `
      INSERT INTO public.users (first_name, last_name, email, username, user_password)
      VALUES ${placeholders.join(", ")}
      RETURNING *;
    `;

    const response = await pool.query(sql, values);

    return res.status(201).json({
      status: "success",
      message: "users created successfully",
      results: response.rowCount,
      data: response.rows.map(sanitizeUser),
    });
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error while creating bulk users",
      error: err.message,
    });
  }
};

exports.signIn = async (req, res, next) => {
  if (!pool) {
    return res
      .status(503)
      .json({ status: "error", message: "Database connection not available" });
  }

  try {
    const { username, user_password } = req.body;

    // Validate only sign-in fields
    if (!username || !user_password) {
      return res.status(400).json({
        status: "fail",
        message: "Username and password are required",
      });
    }

    // Fetch user by username first
    const sql = `
      SELECT * FROM public.users
      WHERE username = $1
    `;

    const response = await pool.query(sql, [username]);

    if (response.rows.length === 0) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid username or password",
      });
    }

    const user = response.rows[0];

    // Compare plain-text input password against stored hashed password
    const isPasswordValid = await comparePassword(
      user_password,
      user.user_password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid username or password",
      });
    }

    const token = await encrypt.generateJWT({
      id: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
    });

    return res
      .status(200)
      .cookie("token", token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: true,
      })
      .json({
        status: "success",
        data: sanitizeUser(user),
      });
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).json({
      status: "error",
      message: "Server error during sign in",
      error: err.message,
    });
  }
};

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "fail",
      message: "Authorization header missing or malformed",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded token data to request object
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired token",
    });
  }
};
