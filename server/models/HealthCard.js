import mongoose from "mongoose";

const healthCardSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },

        medJarvisId: {
            type: String,
            required: true,
        },

        qrCode: {
            type: String,
            default: "",
        },

        cardVersion: {
            type: Number,
            default: 1,
        },

        issueDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("HealthCard", healthCardSchema);