import {Router} from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {z} from "zod";
import {createUser, findUserByEmail} from "../services/users.js";
import {requireAuth} from "../middleware/requireAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const authLimit = rateLimit({
  name: "auth",
  capacity: 5,
  refillPerSec: 1 / 12,  // ~5 per minute sustained
  keyFn: (req) => req.ip,
});
export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}
const jwtSecret = JWT_SECRET as string;
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60;
const COOKIE_MAX_AGE_MS = JWT_EXPIRES_IN* 1000;
const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(72)
});

function setAuthCookie(res: any, userId: string) {
    const token = jwt.sign({}, jwtSecret, { subject: userId, expiresIn: JWT_EXPIRES_IN }); //create a JWT token with the userId as the subject and set it to expire in 7 days
    res.cookie("token", token,{
        httpOnly: true, 
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production", //only send the cookie over HTTPS in production
        maxAge: COOKIE_MAX_AGE_MS
})
}
authRouter.post("/register",authLimit, async (req, res) =>{
   
    const parsed = loginSchema.safeParse(req.body); //want to validate against the login schema. 
    if(!parsed.success){
      
        return res.status(400).json({error: "Invalid input", details: parsed.error.format()});
    }
    try{

        const {email, password} = parsed.data;

        const existingUser = await findUserByEmail(email);
  
        if(existingUser){
            return res.status(400).json({error: "User already exists"});
        }
        
        const user = await createUser(email, password);
       
        setAuthCookie(res, user.id.toString());//sets the JWT token in an httpOnly cookie for authentication, and log the user in immediately after registration
        return res.status(201).json({message: "User registered successfully", user: {id: user.id, email: user.email}});
    }catch (error: any) {
    console.error("REGISTER ERROR:", error);
    if (error.code === "23505") {
        return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Internal server error" });
}
})

authRouter.post("/login",authLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  try {
    const user = await findUserByEmail(parsed.data.email);
    const ok = user && (await bcrypt.compare(parsed.data.password, user.password_hash)); //comparing the password from the request with the hashed password in the database using bcrypt.
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    setAuthCookie(res, user.id);//sets the JWT token in an httpOnly cookie for authentication
    res.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.userId });
});