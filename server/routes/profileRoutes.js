import express from "express";

import {
    createProfile,
    getMyProfiles,
    getProfile,
} from "../controllers/profileController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createProfile);

router.get("/", protect, getMyProfiles);

router.get("/:id", protect, getProfile);

export default router;