import Profile from "../models/Profile.js";

// Create Profile
export const createProfile = async (req, res) => {
    try {
        const profile = await Profile.create({
            account: req.user.accountId,
            role: req.body.role,
            displayName: req.body.displayName,
            employeeId: req.body.employeeId,
            hospital: req.body.hospital,
            photo: req.body.photo,
            patient: req.body.patient || null,
        });

        res.status(201).json({
            success: true,
            message: "Profile Created Successfully",
            data: profile,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get My Profiles
export const getMyProfiles = async (req, res) => {
    try {
        const profiles = await Profile.find({
            account: req.user.accountId,
        });

        res.status(200).json({
            success: true,
            count: profiles.length,
            data: profiles,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get Single Profile
export const getProfile = async (req, res) => {
    try {
        const profile = await Profile.findById(req.params.id);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile Not Found",
            });
        }

        res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};