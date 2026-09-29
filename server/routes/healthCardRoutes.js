import express from "express";

import {
    generateHealthCard,
    getHealthCard,
    getMyHealthCard,
    downloadHealthCardPDF,
    downloadQRCodePNG,
    scanHealthCard,
} from "../controllers/healthCardController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

// ============================================================
// Generate Health Card
// Healthcare staff / admin
// ============================================================

router.post(
    "/generate/:id",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker"
    ),
    generateHealthCard
);

// ============================================================
// Download Health Card PDF
// ============================================================

router.get(
    "/pdf/:id",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Patient"
    ),
    downloadHealthCardPDF
);

// ============================================================
// Download QR PNG
// ============================================================

router.get(
    "/qr/:id",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Patient"
    ),
    downloadQRCodePNG
);

// ============================================================
// Current logged-in patient's Health Card
// ============================================================

router.get(
    "/me",
    protect,
    authorizeRoles("Patient"),
    getMyHealthCard
);

// ============================================================
// Scan Health Card
// ============================================================

router.get(
    "/scan/:medJarvisId",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Ambulance Staff"
    ),
    scanHealthCard
);

// ============================================================
// Get specific Health Card
// ============================================================

router.get(
    "/:id",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Ambulance Staff",
        "Patient"
    ),
    getHealthCard
);

export default router;