import express from "express";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import {
    patientSummary,
    testGeminiKey,
} from "../controllers/aiController.js";

const router = express.Router();

// ============================================================
// TEST GEMINI KEY
// ============================================================

router.post(
    "/test-key",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Patient"
    ),
    testGeminiKey
);

// ============================================================
// AI PATIENT SUMMARY
// ============================================================

router.post(
    "/patient-summary",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Patient"
    ),
    patientSummary
);

export default router;