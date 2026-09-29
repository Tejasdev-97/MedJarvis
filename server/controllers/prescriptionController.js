import Prescription from "../models/Prescription.js";
import MedicalTimeline from "../models/MedicalTimeline.js";
import Profile from "../models/Profile.js";

// ============================================================
// Resolve the patient the current user is allowed to access
// ============================================================

async function resolvePrescriptionPatient(req) {
    // Patient users can ONLY access their own linked patient.
    if (req.user?.role === "Patient") {
        const profile = await Profile.findById(
            req.user.profileId
        ).select("patient role");

        if (!profile || !profile.patient) {
            return null;
        }

        return profile.patient;
    }

    return req.params.patientId;
}

// ============================================================
// Verify whether a prescription belongs to the logged-in patient
// ============================================================

async function patientOwnsPrescription(
    prescription,
    req
) {
    if (req.user?.role !== "Patient") {
        return true;
    }

    const profile = await Profile.findById(
        req.user.profileId
    ).select("patient");

    if (!profile?.patient) {
        return false;
    }

    return (
        String(prescription.patient) ===
        String(profile.patient)
    );
}

// ============================================================
// Add Prescription
// ============================================================

export const addPrescription = async (req, res) => {
    try {
        const prescription =
            await Prescription.create({
                ...req.body,
                doctor: req.user.profileId,
            });

        await MedicalTimeline.create({
            patient: req.body.patient,
            title: "Prescription Added",
            description:
                `Diagnosis: ${req.body.diagnosis}`,
            eventType: "Prescription",
            createdBy: req.user.profileId,
        });

        res.status(201).json({
            success: true,
            message:
                "Prescription Added Successfully",
            data: prescription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ============================================================
// Get All Prescriptions of a Patient
// ============================================================

export const getPatientPrescriptions = async (
    req,
    res
) => {
    try {
        const patientId =
            await resolvePrescriptionPatient(req);

        if (!patientId) {
            return res.status(404).json({
                success: false,
                message:
                    "Patient profile is not linked to a patient record.",
            });
        }

        const prescriptions =
            await Prescription.find({
                patient: patientId,
            })
                .populate(
                    "doctor",
                    "displayName role"
                )
                .sort({
                    createdAt: -1,
                });

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

// ============================================================
// Get Single Prescription
// ============================================================

export const getPrescription = async (
    req,
    res
) => {
    try {
        const prescription =
            await Prescription.findById(
                req.params.id
            )
                .populate(
                    "doctor",
                    "displayName role"
                )
                .populate("patient");

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message:
                    "Prescription Not Found",
            });
        }

        const allowed =
            await patientOwnsPrescription(
                prescription,
                req
            );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message:
                    "Access denied for this prescription.",
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

// ============================================================
// Get Latest Prescription of Patient
// ============================================================

export const getLatestPrescription = async (
    req,
    res
) => {
    try {
        const patientId =
            await resolvePrescriptionPatient(req);

        if (!patientId) {
            return res.status(404).json({
                success: false,
                message:
                    "Patient profile is not linked to a patient record.",
            });
        }

        const prescription =
            await Prescription.findOne({
                patient: patientId,
            })
                .populate(
                    "doctor",
                    "displayName role"
                )
                .sort({
                    createdAt: -1,
                });

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