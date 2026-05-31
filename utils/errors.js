exports.createError = (message, statusCode = 500, status = "error", extra = {}) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.status = status;
  Object.assign(err, extra);
  return err;
};

exports.notFoundRoute = (req, res, next) => {
  return next(
    exports.createError(`Can't find ${req.originalUrl} on this server!`, 404, "fail"),
  );
};

exports.ApiError = (err, req, res, _next) => {
  console.error("Unexpected error:", err);
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  const response = {
    status,
    message: err.message || "An unexpected error occurred",
  };

  if (err.invalidUser) {
    response.invalidUser = err.invalidUser;
  }

  return res.status(statusCode).json(response);
};

exports.mapError = (err, statusCode = 500, status = "error") => {
  return exports.createError(err?.message || "Mapped error", statusCode, status);
};
