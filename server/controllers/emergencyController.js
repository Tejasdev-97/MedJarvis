import EmergencyEvent from "../models/EmergencyEvent.js";
import Band from "../models/Band.js";
import MonitoringSession from "../models/MonitoringSession.js";

export const createEmergencyEvent = async (req, res) => {
    try {
        const {
            bandId,
            type = "fall",
            severity = "HIGH",
            spo2,
            heartRate,
            temperature,
            accelMagnitude,
            gyroMagnitude,
            tilt,
            latitude,
            longitude,
        } = req.body;

        // ========================================================
        // BAND ID REQUIRED
        // ========================================================

        if (!bandId) {
            return res.status(400).json({
                success: false,
                message: "bandId is required",
            });
        }

        // ========================================================
        // FIND BAND
        // ========================================================

        const band = await Band.findOne({
            bandId,
            isActive: true,
        });

        if (!band) {
            return res.status(404).json({
                success: false,
                message: "Band not found",
            });
        }

        // ========================================================
        // FIND ACTIVE MONITORING SESSION
        // BAND -> SESSION -> PATIENT
        // ========================================================

        const session = await MonitoringSession.findOne({
            band: band._id,
            status: "active",
        }).populate("patient");

        if (!session || !session.patient) {
            return res.status(409).json({
                success: false,
                message:
                    "No active monitoring session found for this band",
            });
        }

        const patient = session.patient;

        // ========================================================
        // EMERGENCY CONTACT
        // ========================================================

        const phone = patient.emergencyContact;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Emergency contact is missing",
            });
        }

        // ========================================================
        // TEST MODE
        // ========================================================

        const testMode = req.body.testMode === true;

        // ========================================================
        // MESSAGE
        // ========================================================

        const message =
            `MedJarvis Emergency Alert: A high-confidence ${type} event ` +
            `has been detected for patient ${patient.medJarvisId}. ` +
            `Please check on the patient immediately.`;

        // ========================================================
        // CREATE EMERGENCY EVENT
        // ========================================================

        const event = await EmergencyEvent.create({
            patient: patient._id,

            band: band._id,

            session: session._id,

            type,
            severity,

            status: "detected",

            message,

            spo2,
            heartRate,
            temperature,
            accelMagnitude,
            gyroMagnitude,
            tilt,

            latitude,
            longitude,
        });

        // ========================================================
        // TEST MODE
        // Create event but DO NOT send SMS
        // ========================================================

        if (testMode) {
            return res.status(201).json({
                success: true,
                message:
                    "Emergency event created successfully (SMS skipped in test mode)",
                data: event,
            });
        }

        // ========================================================
        // FAST2SMS API KEY
        // ========================================================

        if (!process.env.FAST2SMS_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "FAST2SMS_API_KEY is missing",
            });
        }

        // ========================================================
        // SEND SMS
        // ========================================================

        const response = await fetch(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                method: "POST",

                headers: {
                    Authorization:
                        process.env.FAST2SMS_API_KEY,

                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({
                    route: "q",
                    message,
                    numbers: phone,
                    sms_details: "1",
                }),
            }
        );

        const data = await response.json();

        console.log(
            "Fast2SMS emergency response:",
            data
        );

        // ========================================================
        // SMS FAILED
        // ========================================================

        if (
            !response.ok ||
            data.return === false
        ) {
            event.status = "failed";
            event.smsStatus = "failed";

            await event.save();

            return res.status(
                response.status || 400
            ).json({
                success: false,
                message: "Emergency SMS failed",
                data,
            });
        }

        // ========================================================
        // SMS ACCEPTED
        // ========================================================

        event.status = "alert_sent";

        event.smsStatus = "accepted";

        event.smsRequestId =
            data.request_id || "";

        await event.save();

        // ========================================================
        // SUCCESS
        // ========================================================

        return res.status(201).json({
            success: true,

            message:
                "Emergency event created and SMS accepted",

            data: {
                event,
                sms: data,
            },
        });
    } catch (error) {
        console.error(
            "CREATE EMERGENCY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to process emergency event",
        });
    }
};