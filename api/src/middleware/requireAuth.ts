import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string; 
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if(!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}
//httpOnly Cookie is set in the login route, and this middleware checks for that cookie and verifies the JWT token. If the token is valid, it extracts the userId from the token payload and attaches it to the request object for use in subsequent middleware or route handlers. If the token is invalid or missing, it responds with a 401 Unauthorized status.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET!);
    if(typeof payload === "string" || !payload.sub){
        return res.status(401).json({ error: "Unauthorized" });
    }
    req.userId = payload.sub; //sets the userId to the userId from the token payload. so user id can be accessed in the subsequent middleware or route handlers using req.userId.
    next();// proceeds to the next middleware or route handler step
}catch (err){
    console.error("JWT verification error:", err);
    return res.status(401).json({ error: "Unauthorized" });
}
  }
/*   const token = authHeader.substring(7); // Remove "Bearer " */
