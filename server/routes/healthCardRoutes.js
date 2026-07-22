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

const router = express.Router();

router.post(
    "/generate/:id",
    protect,
    generateHealthCard
);

router.get(
    "/pdf/:id",
    protect,
    downloadHealthCardPDF
);

router.get(
    "/qr/:id",
    protect,
    downloadQRCodePNG
);

router.get(
    "/me",
    protect,
    getMyHealthCard
);

router.get(
    "/scan/:medJarvisId",
    protect,
    scanHealthCard
);

router.get(
    "/:id",
    protect,
    getHealthCard
);

export default router;