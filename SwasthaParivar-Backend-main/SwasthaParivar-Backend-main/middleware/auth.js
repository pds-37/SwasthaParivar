// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user.js";
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || "dev_secret_replace_in_prod";

export default async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header?.startsWith?.("Bearer ")) return res.status(401).json({ message: "Unauthorized" });

    const token = header.split(" ")[1];
    const payload = jwt.verify(token, jwtSecret);
    // attach user id and optionally fetch user
    req.userId = payload.id;
    // optional: load user doc
    req.user = await User.findById(payload.id).select("-password").lean();
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}
