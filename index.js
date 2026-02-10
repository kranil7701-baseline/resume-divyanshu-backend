import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import apiRoutes from "./routes/resume.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cookieParser());

mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.DATABASE, {})
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB Error => ", err));

import proxyRoutes from "./controllers/resumeProxy.js";

// ... existing code ...

app.use("/api", apiRoutes);
app.use("/api", authRoutes);
app.use("/api", proxyRoutes);
app.get("/", (req, res) => { res.json("Backend index"); });

const port = process.env.PORT || 8000;
app.listen(port, () => { console.log(`Server is running on port ${port}`); });