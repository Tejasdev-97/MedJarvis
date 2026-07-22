import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
    {
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        role: {
            type: String,
            enum: [
                "Super Admin",
                "Hospital Manager",
                "Doctor",
                "Health Worker",
                "Ambulance Staff",
                "Patient",
            ],
            required: true,
        },

        displayName: {
            type: String,
            required: true,
        },

        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            default: null,
        },

        employeeId: {
            type: String,
            default: "",
        },

        hospital: {
            type: String,
            default: "",
        },

        photo: {
            type: String,
            default: "",
        },

        isDefault: {
            type: Boolean,
            default: false,
        },

        profileStatus: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Profile", profileSchema);