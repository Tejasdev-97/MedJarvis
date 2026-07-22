import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },

        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: true,
        },

        diagnosis: {
            type: String,
            required: true,
        },

        medicines: [
            {
                medicineName: {
                    type: String,
                    required: true,
                },

                dosage: {
                    type: String,
                    required: true,
                },

                frequency: {
                    type: String,
                    required: true,
                },

                duration: {
                    type: String,
                    required: true,
                },
            },
        ],

        notes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Prescription", prescriptionSchema);