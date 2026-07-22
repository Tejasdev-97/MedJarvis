import express from "express";

import {
    registerUser,
    createFirstProfile,
    loginUser,
    selectProfile,
    createProfile,
    getProfiles,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/create-profile", createProfile);

router.get("/profiles/:accountId", getProfiles);

router.post("/create-first-profile", createFirstProfile);

router.post("/login", loginUser);

router.post("/select-profile", selectProfile);

export default router;