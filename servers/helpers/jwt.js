import "dotenv/config";
import jwt from "jsonwebtoken";

const secretKey = process.env.JWT_KEY;

function signToken(payload) {
  return jwt.sign(payload, secretKey);
}

function verifyToken(token) {
  return jwt.verify(token, secretKey);
}

export { signToken, verifyToken };
