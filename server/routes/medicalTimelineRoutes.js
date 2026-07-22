import express from "express";

import {
    addTimelineEvent,
    getPatientTimeline,
} from "../controllers/medicalTimelineController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

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

router.get(
    "/:patientId",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin",
        "Ambulance Staff"
    ),
    getPatientTimeline
);

export default router;