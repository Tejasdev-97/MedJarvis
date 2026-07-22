import express from "express";

import {
    createPatient,
    getPatients,
    getPatient,
    updatePatient,
    deletePatient,
    scanPatient,
} from "../controllers/patientController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
    "/",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker"
    ),
    createPatient
);

router.get(
    "/",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Ambulance Staff"
    ),
    getPatients
);

router.get(
    "/scan/:medJarvisId",
    protect,
    scanPatient
);

router.get(
    "/:id",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker",
        "Ambulance Staff"
    ),
    getPatient
);

router.put(
    "/:id",
    protect,
    authorizeRoles(
        "Super Admin",
        "Hospital Manager",
        "Doctor",
        "Health Worker"
    ),
    updatePatient
);

router.delete(
    "/:id",
    protect,
    authorizeRoles("Super Admin"),
    deletePatient
);

export default router;