import VitalReading from "../models/VitalReading.js";
import Patient from "../models/Patient.js";
import Band from "../models/Band.js";
import MonitoringSession from "../models/MonitoringSession.js";
import Profile from "../models/Profile.js";

// ============================================================
// SAVE SENSOR READING
// ESP32 -> bandId -> active session -> patient
// ============================================================

export const createVitalReading = async (req, res) => {
    try {
        const {
            bandId,
            spo2,
            heartRate,
            hrvSDNN,
            temperature,
            tilt,
            signalQuality,
            accelMagnitude,
            gyroMagnitude,
            accelX,
            accelY,
            accelZ,
            gyroX,
            gyroY,
            gyroZ,
            ir,
            red,
            measurementDuration,
            maxSamples,
            spo2WindowSamples,
            mpuSamples,
            validatedBeats,
            validatedRRIntervals,
            validHRWindows,
            validSpO2Windows,
            wifiConnected,
            mode,
            fallDetected,

            // NEW: live PPG waveform from ESP32
            ppgWaveform,
        } = req.body;

        if (!bandId) {
            return res.status(400).json({
                success: false,
                message: "bandId is required",
            });
        }

        // --------------------------------------------------------
        // Find physical band
        // --------------------------------------------------------

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

        // --------------------------------------------------------
        // Find active monitoring session for this band
        // --------------------------------------------------------

        const session =
            await MonitoringSession.findOne({
                band: band._id,
                status: "active",
            }).populate("patient");

        if (!session || !session.patient) {
            return res.status(409).json({
                success: false,
                message:
                    "No active monitoring session for this band",
            });
        }

        const patient = session.patient;

        // --------------------------------------------------------
        // Save vital
        // --------------------------------------------------------

        const vital = await VitalReading.create({
            patient: patient._id,

            band: band._id,

            session: session._id,

            spo2,
            heartRate,
            hrvSDNN,
            temperature,
            tilt,
            signalQuality,

            accelMagnitude,
            gyroMagnitude,

            accelX,
            accelY,
            accelZ,

            gyroX,
            gyroY,
            gyroZ,

            ir,
            red,

            measurementDuration,
            maxSamples,
            spo2WindowSamples,
            mpuSamples,

            validatedBeats,
            validatedRRIntervals,
            validHRWindows,
            validSpO2Windows,

            wifiConnected,

            mode: mode || session.mode,

            fallDetected: fallDetected === true,

            source: "ESP32",
        });

        // --------------------------------------------------------
        // Send live vital ONLY to this patient's room
        //
        // PPG waveform is forwarded through Socket.IO for the
        // real-time waveform on MyHealthPage.
        //
        // The waveform is NOT required to be stored in the
        // VitalReading database document.
        // --------------------------------------------------------

        const io = req.app.get("io");

        if (io) {
            const liveVital = vital.toObject
                ? vital.toObject()
                : { ...vital };

            // Sanitize and keep only the most recent 48 samples.
            // This keeps the Socket.IO payload small and suitable
            // for a live waveform.
            if (
                Array.isArray(ppgWaveform) &&
                ppgWaveform.length > 1
            ) {
                const sanitizedWaveform = ppgWaveform
                    .map(Number)
                    .filter(Number.isFinite)
                    .slice(-48);

                if (sanitizedWaveform.length > 1) {
                    liveVital.ppgWaveform =
                        sanitizedWaveform;
                }
            }

            io.to(`patient_${patient._id}`).emit(
                "newVital",
                liveVital
            );
        }

        return res.status(201).json({
            success: true,
            message: "Vital reading saved successfully",
            data: vital,
        });
    } catch (error) {
        console.error(
            "CREATE VITAL ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to save vital reading",
        });
    }
};

// ============================================================
// SENSOR STATUS TELEMETRY
// ESP32 -> Backend -> Socket.IO -> MyHealthPage
//
// IMPORTANT:
// The ESP32 sends ONLY the bandId.
// The backend determines the patient from:
//
// BAND -> ACTIVE MONITORING SESSION -> PATIENT
//
// This prevents the ESP32 from assigning a status to an
// arbitrary patient.
// ============================================================

export const updateSensorStatus = async (req, res) => {
    try {
        const {
            bandId,
            status,
            message,
            remainingSeconds,
            mode,
        } = req.body;

        // --------------------------------------------------------
        // Validate bandId
        // --------------------------------------------------------

        if (!bandId) {
            return res.status(400).json({
                success: false,
                message: "bandId is required",
            });
        }

        // --------------------------------------------------------
        // Validate status
        // --------------------------------------------------------

        const allowedStatuses = [
            "STARTING",
            "SENSOR_READY",
            "WAITING_FOR_FINGER",
            "FINGER_DETECTED",
            "STABILIZING",
            "SIGNAL_STABLE",
            "MEASURING",
            "READING_COMPLETE",
            "FINGER_REMOVED",
            "SESSION_COMPLETE",
            "STOPPING",
            "SESSION_STOPPED",
            "SENSOR_ERROR",
            "COMMUNICATION_ERROR",
        ];

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required",
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sensor status",
            });
        }

        // --------------------------------------------------------
        // Find physical band
        // --------------------------------------------------------

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

        // --------------------------------------------------------
        // Find active monitoring session
        //
        // BAND -> SESSION -> PATIENT
        // --------------------------------------------------------

        const session =
            await MonitoringSession.findOne({
                band: band._id,
                status: "active",
            }).populate("patient");

        if (!session || !session.patient) {
            return res.status(409).json({
                success: false,
                message:
                    "No active monitoring session for this band",
            });
        }

        const patient = session.patient;

        // --------------------------------------------------------
        // Normalize remaining seconds
        // --------------------------------------------------------

        let normalizedRemainingSeconds = null;

        if (
            remainingSeconds !== undefined &&
            remainingSeconds !== null &&
            remainingSeconds !== ""
        ) {
            const parsedSeconds =
                Number(remainingSeconds);

            if (
                Number.isFinite(parsedSeconds) &&
                parsedSeconds >= 0
            ) {
                normalizedRemainingSeconds =
                    Math.floor(parsedSeconds);
            }
        }

        // --------------------------------------------------------
        // Build sensor status payload
        // --------------------------------------------------------

        const sensorStatus = {
            bandId: band.bandId,

            patientId: patient._id,

            sessionId: session._id,

            mode: mode || session.mode,

            status,

            message:
                message ||
                "Sensor status updated.",

            remainingSeconds:
                normalizedRemainingSeconds,

            timestamp: new Date().toISOString(),
        };

        // --------------------------------------------------------
        // Send status ONLY to this patient's Socket.IO room
        // --------------------------------------------------------

        const io = req.app.get("io");

        if (io) {
            io.to(
                `patient_${patient._id}`
            ).emit(
                "sensorStatus",
                sensorStatus
            );
        }

        // --------------------------------------------------------
        // Backend response to ESP32
        // --------------------------------------------------------

        return res.status(200).json({
            success: true,
            message: "Sensor status received",
            data: sensorStatus,
        });
    } catch (error) {
        console.error(
            "UPDATE SENSOR STATUS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update sensor status",
        });
    }
};

// ============================================================
// GET LATEST VITAL
// ============================================================

export const getLatestVital = async (req, res) => {
    try {
        const { patientId } = req.params;

        const vital = await VitalReading.findOne({
            patient: patientId,
        }).sort({ createdAt: -1 });

        if (!vital) {
            return res.status(404).json({
                success: false,
                message: "No vital readings found",
            });
        }

        return res.json({
            success: true,
            data: vital,
        });
    } catch (error) {
        console.error(
            "GET LATEST VITAL ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to get vital reading",
        });
    }
};

// ============================================================
// GET VITAL HISTORY
// ============================================================

export const getPatientVitals = async (req, res) => {
    try {
        const { patientId } = req.params;

        const vitals = await VitalReading.find({
            patient: patientId,
        })
            .sort({ createdAt: -1 })
            .limit(50);

        return res.json({
            success: true,
            count: vitals.length,
            data: vitals,
        });
    } catch (error) {
        console.error(
            "GET VITAL HISTORY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to get vital history",
        });
    }
};

// ============================================================
// START MONITORING
// Frontend -> Backend
// ============================================================

export const startMonitoring = async (req, res) => {
    try {
        const { bandId, mode } = req.body;

        if (!bandId) {
            return res.status(400).json({
                success: false,
                message: "bandId is required",
            });
        }

        if (
            !["spot", "continuous"].includes(mode)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Mode must be spot or continuous",
            });
        }

        // --------------------------------------------------------
        // Find band
        // --------------------------------------------------------

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

        // --------------------------------------------------------
        // Prevent same band being used twice
        // --------------------------------------------------------

        const existingSession =
            await MonitoringSession.findOne({
                band: band._id,
                status: "active",
            });

        if (existingSession) {
            return res.status(409).json({
                success: false,
                message:
                    "This band is currently in use",
            });
        }

        // --------------------------------------------------------
        // Get logged-in user's profile
        // --------------------------------------------------------

        const profile =
            await Profile.findById(
                req.user.profileId
            );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found",
            });
        }

        // --------------------------------------------------------
        // Patient must come from profile.patient
        // --------------------------------------------------------

        if (!profile.patient) {
            return res.status(400).json({
                success: false,
                message:
                    "This profile is not linked to a patient",
            });
        }

        const patient =
            await Patient.findOne({
                _id: profile.patient,
                isDeleted: { $ne: true },
            });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }

        // --------------------------------------------------------
        // Create monitoring session
        // --------------------------------------------------------

        const session =
            await MonitoringSession.create({
                band: band._id,
                patient: patient._id,
                mode,
                status: "active",
                startedAt: new Date(),
                createdBy: profile._id,
            });

        // --------------------------------------------------------
        // Mark band in use
        // --------------------------------------------------------

        band.status = "In Use";

        await band.save();

        return res.status(201).json({
            success: true,
            message:
                `${mode} monitoring started`,
            data: {
                sessionId: session._id,
                bandId: band.bandId,
                patientId: patient._id,
                mode: session.mode,
                active: true,
            },
        });
    } catch (error) {
        console.error(
            "START MONITORING ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to start monitoring",
        });
    }
};

// ============================================================
// STOP MONITORING
// Frontend -> Backend
// ============================================================

export const stopMonitoring = async (req, res) => {
    try {
        const { bandId } = req.body;

        if (!bandId) {
            return res.status(400).json({
                success: false,
                message: "bandId is required",
            });
        }

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

        const session =
            await MonitoringSession.findOne({
                band: band._id,
                status: "active",
            });

        if (!session) {
            return res.json({
                success: true,
                message:
                    "No active monitoring session",
            });
        }

        session.status = "stopped";

        session.endedAt = new Date();

        await session.save();

        band.status = "Available";

        await band.save();

        // --------------------------------------------------------
        // Inform the patient's frontend that backend session
        // has stopped.
        // --------------------------------------------------------

        const io = req.app.get("io");

        if (io) {
            io.to(
                `patient_${session.patient}`
            ).emit(
                "monitoringState",
                {
                    bandId: band.bandId,
                    sessionId: session._id,
                    patientId: session.patient,
                    active: false,
                    mode: session.mode,
                    state: "STOPPED",
                    timestamp:
                        new Date().toISOString(),
                }
            );
        }

        return res.json({
            success: true,
            message: "Monitoring stopped",
            data: {
                sessionId: session._id,
                bandId: band.bandId,
                active: false,
            },
        });
    } catch (error) {
        console.error(
            "STOP MONITORING ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to stop monitoring",
        });
    }
};

// ============================================================
// ESP32 CHECKS MONITORING CONTROL
// GET /api/vitals/control/:bandId
// ============================================================

export const getMonitoringControl = async (
    req,
    res
) => {
    try {
        const { bandId } = req.params;

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

        const session =
            await MonitoringSession.findOne({
                band: band._id,
                status: "active",
            });

        if (!session) {
            return res.json({
                success: true,
                active: false,
                mode: null,
                sessionId: null,
            });
        }

        return res.json({
            success: true,
            active: true,
            mode: session.mode,
            sessionId: session._id,
            patientId: session.patient,
        });
    } catch (error) {
        console.error(
            "GET MONITORING CONTROL ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to get monitoring control",
        });
    }
};

// ============================================================
// ESP32 MARKS SPOT MONITORING COMPLETE
// ============================================================

export const completeMonitoring = async (
    req,
    res
) => {
    try {
        const { bandId } = req.params;

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

        const session =
            await MonitoringSession.findOne({
                band: band._id,
                status: "active",
            });

        if (!session) {
            return res.json({
                success: true,
                message:
                    "No active monitoring session",
            });
        }

        session.status = "completed";

        session.endedAt = new Date();

        await session.save();

        band.status = "Available";

        await band.save();

        // --------------------------------------------------------
        // Inform frontend that the backend session is complete.
        // --------------------------------------------------------

        const io = req.app.get("io");

        if (io) {
            io.to(
                `patient_${session.patient}`
            ).emit(
                "monitoringState",
                {
                    bandId: band.bandId,
                    sessionId: session._id,
                    patientId: session.patient,
                    active: false,
                    mode: session.mode,
                    state: "COMPLETED",
                    timestamp:
                        new Date().toISOString(),
                }
            );
        }

        return res.json({
            success: true,
            message:
                "Monitoring completed",
            data: {
                sessionId: session._id,
                bandId: band.bandId,
                active: false,
            },
        });
    } catch (error) {
        console.error(
            "COMPLETE MONITORING ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to complete monitoring",
        });
    }
};