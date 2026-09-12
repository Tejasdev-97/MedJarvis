import express from "express";

import {
    createEmergencyEvent,
} from "../controllers/emergencyController.js";

const router = express.Router();

router.post("/", createEmergencyEvent);

export default router;