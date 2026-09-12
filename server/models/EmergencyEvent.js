import mongoose from "mongoose";

const emergencyEventSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },

        type: {
            type: String,
            enum: ["fall", "seizure", "critical_vitals", "manual"],
            required: true,
        },

        severity: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH"],
            default: "HIGH",
        },

        status: {
            type: String,
            enum: [
                "detected",
                "alert_sent",
                "acknowledged",
                "resolved",
                "failed",
            ],
            default: "detected",
        },

        message: {
            type: String,
            default: "",
        },

        smsRequestId: {
            type: String,
            default: "",
        },

        smsStatus: {
            type: String,
            enum: ["not_sent", "accepted", "delivered", "failed"],
            default: "not_sent",
        },

        band: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Band",
            default: null,
        },

        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MonitoringSession",
            default: null,
        },

        spo2: Number,
        heartRate: Number,
        temperature: Number,
        accelMagnitude: Number,
        gyroMagnitude: Number,
        tilt: Number,

        latitude: {
            type: Number,
            default: null,
        },

        longitude: {
            type: Number,
            default: null,
        },

        detectedAt: {
            type: Date,
            default: Date.now,
        },

        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("EmergencyEvent", emergencyEventSchema);