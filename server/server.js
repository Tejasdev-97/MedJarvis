import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthCardRoutes from "./routes/healthCardRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import medicalTimelineRoutes from "./routes/medicalTimelineRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

import connectDB from "./config/db.js";

// Routes
import patientRoutes from "./routes/patientRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "🚀 MedJarvis Backend Running",
    });
});

// API Routes
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/health-card", healthCardRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/timeline", medicalTimelineRoutes);

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found",
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});