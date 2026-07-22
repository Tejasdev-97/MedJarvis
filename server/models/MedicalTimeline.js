import mongoose from "mongoose";

const medicalTimelineSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        eventType: {
            type: String,
            enum: [
                "Diagnosis",
                "Prescription",
                "Emergency",
                "Checkup",
                "Admission",
                "Discharge",
                "Other",
            ],
            default: "Other",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("MedicalTimeline", medicalTimelineSchema);