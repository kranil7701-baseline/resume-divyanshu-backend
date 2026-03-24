import dotenv from "dotenv";
dotenv.config();

import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

// Route imports
import apiRoutes from "./routes/resume.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import generatedResumeRoutes from "./routes/generatedResumes.js";
import portfolioRoutes from "./routes/portfolio.js";
import jobRoutes from "./routes/jobs.js";
import proxyRoutes from "./controllers/resumeProxy.js";
import { stripeWebhook } from "./controllers/payment.js";

const app = express();

// 1. CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://resume-divyanshu-frontend.vercel.app',
  'https://resume-divyanshu-backend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept,Origin',
  optionsSuccessStatus: 204
}));

// 2. Middleware
app.use(morgan("dev"));
app.use(cookieParser());

// Stripe Webhook needs raw body - must be before body-parser
app.post("/api/payment/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// 3. Database Connection
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.DATABASE, {})
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB Error => ", err));

// 4. Routes
app.use("/api", apiRoutes);
app.use("/api", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api", generatedResumeRoutes);
app.use("/api", portfolioRoutes);
app.use("/api", proxyRoutes);
app.use("/api", jobRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running", status: "ok" });
});

// 5. Port
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});