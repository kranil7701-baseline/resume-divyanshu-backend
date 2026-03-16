import dotenv from "dotenv";
dotenv.config();

import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import apiRoutes from "./routes/resume.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import generatedResumeRoutes from "./routes/generatedResumes.js";
import portfolioRoutes from "./routes/portfolio.js";
import jobRoutes from "./routes/jobs.js";
import { createClient } from "redis";

const app = express();
app.use(morgan("dev"));
app.use(cookieParser());
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://resume-divyanshu-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    console.log("Incoming request from origin:", origin);

    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.endsWith('.vercel.app') || 
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Manual OPTIONS handler for Preflight requests
app.options('*', cors());

// Stripe Webhook needs raw body - must be before body-parser
import { stripeWebhook } from "./controllers/payment.js";
app.post("/api/payment/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.DATABASE, {})
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB Error => ", err));

import proxyRoutes from "./controllers/resumeProxy.js";

// ... existing code ...

app.use("/api", apiRoutes);
app.use("/api", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api", generatedResumeRoutes);
app.use("/api", portfolioRoutes);
app.use("/api", proxyRoutes);
app.use("/api", jobRoutes);
app.get("/", (req, res) => { res.json("Backend index"); });






// const redisClient = createClient({
//   username: "default",
//   password: "YOUR_PASSWORD",
//   socket: {
//     host: "redis-14080.c11.us-east-1-2.ec2.cloud.redislabs.com",
//     port: 14080
//   }
// });


// const redisClient = createClient({
//   url: "redis://default:iw1CyWWrjv8CNShs5kP4TdO4rYg7KFNC@redis-14080.c11.us-east-1-2.ec2.cloud.redislabs.com:14080",
//   socket: {
//     tls: false
//   }
// });

// redisClient.on("error", (err) => console.log("Redis Error", err));

// async function connectRedis() {
//   await redisClient.connect();
//   console.log("Connected to Redis Cloud");
// }

// connectRedis();





const port = process.env.PORT || 8000;
app.listen(port, () => { console.log(`Server is running on port ${port}`); });