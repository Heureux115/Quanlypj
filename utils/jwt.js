
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!SECRET) {
    console.warn("JWT secret missing. Set JWT_ACCESS_SECRET or JWT_SECRET in your .env file.");
}

function signToken(payload) {
    if (!SECRET) throw new Error("JWT secret is not set. Set JWT_ACCESS_SECRET in .env");
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
    if (!SECRET) throw new Error("JWT secret is not set. Set JWT_ACCESS_SECRET in .env");
    return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };