let pool;
const errors = require("../utils/errors");

try {
  pool = require("../db/pool");
} catch (err) {
  console.error("Failed to load db pool:", err.message);
  pool = null;
}

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatecustomer = ({ name, email, age }) => {
  if (!name || typeof name !== "string" || name.trim() === "") {
    return "Name is required and must be a non-empty string";
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return "Email is required and must be a valid email address";
  }

  if (age === undefined || isNaN(Number(age)) || Number(age) <= 0) {
    return "Age is required and must be a positive number";
  }

  return null;
};

exports.getAllCustomers = async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: "error",
      message: "Database connection not available",
    });
  }

  try {
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
      return res.status(400).json({
        status: "fail",
        message: "Invalid sortBy. Allowed values are id, name, email, age",
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

    let sql = "SELECT * FROM public.customer WHERE 1=1";
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
    console.error("Database error:", err.message);

    return res.status(500).json({
      status: "error",
      message: "Server error while retrieving customers",
      error: err.message,
    });
  }
};

exports.createCustomer = async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: "error",
      message: "Database connection not available",
    });
  }

  try {
    const { name, email, age } = req.body;

    const validationError = validatecustomer({ name, email, age });

    if (validationError) {
      return res.status(400).json({
        status: "fail",
        message: validationError,
      });
    }

    const sql = `
      INSERT INTO public.customer (name, email, age)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [name, email, Number(age)];

    const response = await pool.query(sql, values);

    return res.status(201).json({
      status: "success",
      message: "customer created successfully",
      data: response.rows[0],
    });
  } catch (err) {
    console.error("Database error:", err.message);

    if (err.code === "23505") {
      return res.status(400).json({
        status: "fail",
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Server error while creating customer",
      error: err.message,
    });
  }
};

exports.getCustomerById = async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: "error",
      message: "Database connection not available",
    });
  }

  try {
    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid customer id",
      });
    }

    const sql = "SELECT * FROM public.customer WHERE id = $1";
    const values = [id];

    const response = await pool.query(sql, values);

    if (response.rowCount === 0) {
      return res.status(404).json({
        status: "fail",
        message: "customer not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: response.rows[0],
    });
  } catch (err) {
    console.error("Database error:", err.message);

    return res.status(500).json({
      status: "error",
      message: "Server error while retrieving customer",
      error: err.message,
    });
  }
};

exports.updateCustomer = async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: "error",
      message: "Database connection not available",
    });
  }

  try {
    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid customer id",
      });
    }

    const { name, email, age } = req.body;

    const validationError = validatecustomer({ name, email, age });

    if (validationError) {
      return res.status(400).json({
        status: "fail",
        message: validationError,
      });
    }

    const sql = `
      UPDATE public.customer
      SET name = $1,
          email = $2,
          age = $3
      WHERE id = $4
      RETURNING *;
    `;

    const values = [name, email, Number(age), id];

    const response = await pool.query(sql, values);

    if (response.rowCount === 0) {
      return res.status(404).json({
        status: "fail",
        message: "customer not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "customer updated successfully",
      data: response.rows[0],
    });
  } catch (err) {
    console.error("Database error:", err.message);

    if (err.code === "23505") {
      return res.status(400).json({
        status: "fail",
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Server error while updating customer",
      error: err.message,
    });
  }
};

exports.deleteCustomerById = async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: "error",
      message: "Database connection not available",
    });
  }

  try {
    const id = Number(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid customer id",
      });
    }

    const sql = "DELETE FROM public.customer WHERE id = $1 RETURNING *";
    const values = [id];

    const response = await pool.query(sql, values);

    if (response.rowCount === 0) {
      return res.status(404).json({
        status: "fail",
        message: "customer not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "customer deleted successfully",
      data: response.rows[0],
    });
  } catch (err) {
    console.error("Database error:", err.message);

    return res.status(500).json({
      status: "error",
      message: "Server error while deleting customer",
      error: err.message,
    });
  }
};

exports.createBulkCustomers = async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: "error",
      message: "Database connection not available",
    });
  }

  try {
    const customers = req.body;

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Request body must be a non-empty array of customers",
      });
    }

    for (const customer of customers) {
      const validationError = validatecustomer(customer);

      if (validationError) {
        return res.status(400).json({
          status: "fail",
          message: validationError,
          invalidUser: customer,
        });
      }
    }

    const values = [];

    const placeholders = customers
      .map((customer, index) => {
        const baseIndex = index * 3;

        values.push(customer.name, customer.email, Number(customer.age));

        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
      })
      .join(", ");

    const sql = `
      INSERT INTO public.customer (name, email, age)
      VALUES ${placeholders}
      RETURNING *;
    `;

    const response = await pool.query(sql, values);

    return res.status(201).json({
      status: "success",
      message: "customers created successfully",
      results: response.rowCount,
      data: response.rows,
    });
  } catch (err) {
    console.error("Database error:", err.message);

    if (err.code === "23505") {
      return res.status(400).json({
        status: "fail",
        message: "One or more emails already exist",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Server error while creating bulk customers",
      error: err.message,
    });
  }
};
