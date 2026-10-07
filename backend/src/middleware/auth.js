import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) return res.status(401).json({ message: "Please sign in to continue." });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Your session is invalid or has expired. Please sign in again." });
    }
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "This account is no longer available." });
    req.user = user;
    next();
  } catch {
    next(new Error("Unable to verify the signed-in user."));
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to do that." });
    }
    next();
  };
}