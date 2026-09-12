import mongoose from "mongoose";

const vitalReadingSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
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

        spo2: {
            type: Number,
            default: null,
        },

        heartRate: {
            type: Number,
            default: null,
        },

        hrvSDNN: {
            type: Number,
            default: null,
        },

        temperature: {
            type: Number,
            default: null,
        },

        tilt: {
            type: Number,
            default: null,
        },

        signalQuality: {
            type: Number,
            default: null,
        },

        accelMagnitude: {
            type: Number,
            default: null,
        },

        gyroMagnitude: {
            type: Number,
            default: null,
        },

        accelX: Number,
        accelY: Number,
        accelZ: Number,

        gyroX: Number,
        gyroY: Number,
        gyroZ: Number,

        measurementDuration: {
            type: Number,
            default: 15,
        },

        maxSamples: Number,
        spo2WindowSamples: Number,
        mpuSamples: Number,

        validatedBeats: Number,
        validatedRRIntervals: Number,
        validHRWindows: Number,
        validSpO2Windows: Number,

        ir: Number,
        red: Number,

        wifiConnected: {
            type: Boolean,
            default: false,
        },

        mode: {
            type: String,
            enum: ["spot", "continuous"],
            default: "spot",
        },

        fallDetected: {
            type: Boolean,
            default: false,
        },

        source: {
            type: String,
            default: "ESP32",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("VitalReading", vitalReadingSchema);