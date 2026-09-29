import express from "express";

import {
    addPrescription,
    getPatientPrescriptions,
    getPrescription,
    getLatestPrescription,
} from "../controllers/prescriptionController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

// ============================================================
// ADD PRESCRIPTION
// Doctor only
// ============================================================

router.post(
    "/",
    protect,
    authorizeRoles("Doctor"),
    addPrescription
);

// ============================================================
// GET PATIENT PRESCRIPTIONS
// ============================================================

router.get(
    "/patient/:patientId",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin",
        "Patient"
    ),
    getPatientPrescriptions
);

// ============================================================
// GET LATEST PRESCRIPTION
// ============================================================

router.get(
    "/latest/:patientId",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin",
        "Ambulance Staff",
        "Patient"
    ),
    getLatestPrescription
);

// ============================================================
// GET SINGLE PRESCRIPTION
// ============================================================

router.get(
    "/:id",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin",
        "Patient"
    ),
    getPrescription
);

export default router;