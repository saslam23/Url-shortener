import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { linksRouter } from "./routes/links.js";    
import { redirectRouter } from "./routes/redirect.js";
const app = express();
app.use(cookieParser());
app.use(express.json());


app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
app.use("/api/auth", authRouter);
app.use("/api/links", linksRouter);
app.use("/", redirectRouter); // <- the redirect router
 const server = app.listen(process.env.PORT || 3000, () =>{
    console.log("Server is running on port " + (process.env.PORT || 3000));
})
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${process.env.PORT} is already in use`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});