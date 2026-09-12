import express from "express";

const router = express.Router();

router.post("/test", async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        if (!process.env.FAST2SMS_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "FAST2SMS_API_KEY is missing",
            });
        }

        const response = await fetch(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                method: "POST",
                headers: {
                    Authorization: process.env.FAST2SMS_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    route: "q",
                    message:
                        message ||
                        "MedJarvis Test Alert: SMS communication is working.",
                    numbers: phone,
                    sms_details: "1",
                }),
            }
        );

        const data = await response.json();

        console.log("Fast2SMS response:", data);

        if (!response.ok || data.return === false) {
            return res.status(response.status || 400).json({
                success: false,
                message: "Fast2SMS rejected the request",
                data,
            });
        }

        return res.json({
            success: true,
            message: "SMS sent successfully",
            data,
        });
    } catch (error) {
        console.error("SMS TEST ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;