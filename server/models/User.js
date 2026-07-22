import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        pin: {
            type: String,
            required: true,
        },

        accountStatus: {
            type: String,
            enum: ["Active", "Inactive", "Blocked"],
            default: "Active",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("User", userSchema);