import express from "express";

import protect from "../middleware/authMiddleware.js";

import {

    patientSummary,

    testGeminiKey,

} from "../controllers/aiController.js";

const router = express.Router();

router.post(

    "/test-key",

    protect,

    testGeminiKey

);

router.post(

    "/patient-summary",

    protect,

    patientSummary

);

export default router;