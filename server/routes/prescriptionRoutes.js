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

router.post(
    "/",
    protect,
    authorizeRoles("Doctor"),
    addPrescription
);

router.get(
    "/patient/:patientId",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin"
    ),
    getPatientPrescriptions
);

router.get(
    "/latest/:patientId",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin",
        "Ambulance Staff"
    ),
    getLatestPrescription
);

router.get(
    "/:id",
    protect,
    authorizeRoles(
        "Doctor",
        "Health Worker",
        "Hospital Manager",
        "Super Admin"
    ),
    getPrescription
);

export default router;