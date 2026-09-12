import mongoose from "mongoose";

const bandSchema = new mongoose.Schema(
    {
        bandId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        name: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            enum: ["Available", "In Use", "Offline"],
            default: "Available",
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Band", bandSchema);