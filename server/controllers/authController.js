import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Profile from "../models/Profile.js";

// Register Account
export const registerUser = async (req, res) => {
    try {
        const { phone, pin } = req.body;
        if (!/^[0-9]{10}$/.test(phone)) {

    return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
    });

}

        const existingUser = await User.findOne({ phone });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Phone Number Already Registered",
            });
        }

        if (pin.length !== 4) {

    return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits.",
    });

}

        const hashedPin = await bcrypt.hash(pin, 10);

        const account = await User.create({
            phone,
            pin: hashedPin,
        });

        res.status(201).json({
            success: true,
            message: "Account Created Successfully",
            data: account,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const createFirstProfile = async (req, res) => {
    try {
        const { phone, pin, role, displayName } = req.body;

        const account = await User.findOne({ phone });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account Not Found",
            });
        }

        const isMatch = await bcrypt.compare(pin, account.pin);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid PIN",
            });
        }

        const existingProfiles = await Profile.countDocuments({
            account: account._id,
        });

        if (existingProfiles > 0) {
            return res.status(400).json({
                success: false,
                message: "First profile already exists",
            });
        }

        const profile = await Profile.create({
            account: account._id,
            role,
            displayName,
            isDefault: true,
        });

        res.status(201).json({
            success: true,
            message: "First Profile Created Successfully",
            data: profile,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Login Step 1
export const loginUser = async (req, res) => {
    try {
        const { phone, pin } = req.body;

        const account = await User.findOne({ phone });

        if (!account) {
            return res.status(401).json({
                success: false,
                message: "Invalid Phone Number",
            });
        }

        const isMatch = await bcrypt.compare(pin, account.pin);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid PIN",
            });
        }

        const profiles = await Profile.find({
    account: account._id,
    profileStatus: "Active",
}).populate("patient");

        if (profiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Profiles Found",
            });
        }

        if (profiles.length === 1) {
            const token = jwt.sign(
                {
                    accountId: account._id,
                    profileId: profiles[0]._id,
                    role: profiles[0].role,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d",
                }
            );

            return res.status(200).json({
                success: true,
                multipleProfiles: false,
                token,
                profile: {
    ...profiles[0].toObject(),
    account: account._id,
},
            });
        }

        res.status(200).json({
            success: true,
            multipleProfiles: true,
            profiles,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const selectProfile = async (req, res) => {
    try {
        const { profileId } = req.body;

        const profile = await Profile.findById(profileId).populate("patient");

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile Not Found",
            });
        }

        const token = jwt.sign(
            {
                accountId: profile.account,
                profileId: profile._id,
                role: profile.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        res.status(200).json({
            success: true,
            token,
            profile: {
    ...profile.toObject(),
    account: profile.account,
},
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =============================
// Create Additional Profile
// =============================
export const createProfile = async (req, res) => {

    try {

        const {
            phone,
            role,
            displayName,
            employeeId,
            hospital,
        } = req.body;

        const account = await User.findOne({
            phone,
        });

        if (!account) {

            return res.status(404).json({
                success:false,
                message:"Account not found. Please create an account first.",
            });

        }

        const existing = await Profile.findOne({
            account:account._id,
            role,
        });

        if(existing){

            return res.status(400).json({
                success:false,
                message:`${role} profile already exists.`,
            });

        }

        const profile = await Profile.create({

            account:account._id,
            role,
            displayName,
            employeeId,
            hospital,

        });

        res.status(201).json({

            success:true,
            message:"Profile created successfully.",
            data:profile,

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message,

        });

    }

};

// =============================
// Get Profiles of One Account
// =============================
export const getProfiles = async (req, res) => {

    try {

        const { accountId } = req.params;

        const profiles = await Profile.find({
            account: accountId,
        });

        res.json({
            success: true,
            data: profiles,
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};