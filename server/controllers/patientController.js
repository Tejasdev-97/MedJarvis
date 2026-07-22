import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Patient from "../models/Patient.js";
import generateMedJarvisId from "../utils/generateMedJarvisId.js";

// Create Patient
export const createPatient = async (req, res) => {
    try {
        const {
            phone,
            firstName,
            lastName,
        } = req.body;

        // Prevent duplicate accounts
        const existingUser = await User.findOne({ phone });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Phone Number Already Registered",
            });
        }

        const medJarvisId = await generateMedJarvisId();

        // Create Patient
        const patient = await Patient.create({
            ...req.body,
            medJarvisId,
            createdBy: req.user.profileId,
        });

        // Create User Account
        const hashedPin = await bcrypt.hash("1234", 10);

        const account = await User.create({
            phone,
            pin: hashedPin,
        });

        // Create Patient Profile
        const profile = await Profile.create({
            account: account._id,
            role: "Patient",
            displayName: `${firstName} ${lastName}`,
            patient: patient._id,
            isDefault: true,
        });

        res.status(201).json({
            success: true,
            message:
                "Patient Registered Successfully. Default PIN: 1234",
            data: {
                patient,
                account,
                profile,
            },
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// Get All Patients
export const getPatients = async (req, res) => {
    try {
        const patients = await Patient.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: patients.length,
            data: patients,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get Single Patient
export const getPatient = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient Not Found",
            });
        }

        res.status(200).json({
            success: true,
            data: patient,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update Patient
export const updatePatient = async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
            }
        );

        res.status(200).json({
            success: true,
            message: "Patient Updated",
            data: patient,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete Patient
export const deletePatient = async (req, res) => {
    try {
        await Patient.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Patient Deleted",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const scanPatient = async (req, res) => {
    try {

        const { medJarvisId } = req.params;

        const patient = await Patient.findOne({
            medJarvisId,
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }

        res.json({
            success: true,
            data: patient,
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};