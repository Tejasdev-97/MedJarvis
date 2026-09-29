import express from "express";

import {
    addTimelineEvent,
    getPatientTimeline,
} from "../controllers/medicalTimelineController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

// ============================================================
// ADD TIMELINE EVENT
// Healthcare staff only
// ============================================================

router.post(
    "/",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager"
    ),
    addTimelineEvent
);

// ============================================================
// GET PATIENT TIMELINE
//
// Staff:
//     /timeline/:patientId
//
// Patient:
//     The controller ignores the supplied patientId and
//     resolves the patient from the logged-in profile.
// ============================================================

router.get(
    "/:patientId",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin",
        "Ambulance Staff",
        "Patient"
    ),
    getPatientTimeline
);

export default router;