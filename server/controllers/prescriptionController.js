import Prescription from "../models/Prescription.js";
import MedicalTimeline from "../models/MedicalTimeline.js";

// Add Prescription
export const addPrescription = async (req, res) => {
    try {

        const prescription = await Prescription.create({
            ...req.body,
            doctor: req.user.profileId,
        });

        await MedicalTimeline.create({
            patient: req.body.patient,
            title: "Prescription Added",
            description: `Diagnosis: ${req.body.diagnosis}`,
            eventType: "Prescription",
            createdBy: req.user.profileId,
        });

        res.status(201).json({
            success: true,
            message: "Prescription Added Successfully",
            data: prescription,
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// Get All Prescriptions of a Patient
export const getPatientPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.find({
            patient: req.params.patientId,
        })
            .populate("doctor", "displayName role")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: prescriptions.length,
            data: prescriptions,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get Single Prescription
export const getPrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
            .populate("doctor", "displayName role")
            .populate("patient");

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: "Prescription Not Found",
            });
        }

        res.status(200).json({
            success: true,
            data: prescription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get Latest Prescription of Patient
export const getLatestPrescription = async (req, res) => {

    try {

        const prescription = await Prescription.findOne({
            patient: req.params.patientId,
        })
        .populate("doctor", "displayName role")
        .sort({ createdAt: -1 });

        res.status(200).json({

            success:true,
            data:prescription,

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message,

        });

    }

};