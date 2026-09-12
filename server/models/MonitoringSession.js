import mongoose from "mongoose";

const monitoringSessionSchema = new mongoose.Schema(
    {
        band: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Band",
            required: true,
        },

        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },

        mode: {
            type: String,
            enum: ["spot", "continuous"],
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "completed", "stopped"],
            default: "active",
        },

        startedAt: {
            type: Date,
            default: Date.now,
        },

        endedAt: {
            type: Date,
            default: null,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model(
    "MonitoringSession",
    monitoringSessionSchema
);