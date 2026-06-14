const bcrypt = require("bcrypt");
const saltRounds = 10;
var jwt = require("jsonwebtoken");

exports.hashPassword = async (plainTextPassword) => {
  try {
    const hash = await bcrypt.hash(plainTextPassword, saltRounds);
    return hash;
  } catch (err) {
    console.error("Error hashing password:", err.message);
    throw new Error("Password hashing failed");
  }
};

exports.generateJWT = async (data) => {
  const token = jwt.sign(data, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  return token;
};

exports.comparePassword = async (plainTextPassword, hash) => {
  try {
    return await bcrypt.compare(plainTextPassword, hash);
  } catch (err) {
    console.error("Error comparing password:", err.message);
    throw new Error("Password comparison failed");
  }
};

exports.verifyJWT = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    console.error("JWT verification error:", err.message);
    throw new Error("Invalid or expired token");
  }
};
