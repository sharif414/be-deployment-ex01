const { verifyJWT } = require("../utils/encrypt");
const { createError } = require("../utils/errors");

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError("Authentication token is missing", 401, "fail"));
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = await verifyJWT(token);
    return next();
  } catch (err) {
    return next(createError("Invalid or expired token", 401, "fail"));
  }
};

exports.restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.roles)) {
      return next(
        createError("You do not have permission to perform this action", 403, "fail"),
      );
    }
    return next();
  };
};
