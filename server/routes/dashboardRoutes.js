import express from "express";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import {
    getDashboardStats,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get(
    "/stats",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Ambulance Staff",
        "Patient"
    ),
    getDashboardStats
);

export default router;