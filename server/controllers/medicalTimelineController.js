import MedicalTimeline from "../models/MedicalTimeline.js";
import Profile from "../models/Profile.js";

// ============================================================
// Resolve the patient that the current user is allowed to view
// ============================================================

async function resolveTimelinePatient(req) {
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

    // Staff roles may request a specific patient.
    return req.params.patientId;
}

// ============================================================
// Add Timeline Event
// ============================================================

export const addTimelineEvent = async (req, res) => {
    try {
        const event = await MedicalTimeline.create({
            ...req.body,
            createdBy: req.user.profileId,
        });

        res.status(201).json({
            success: true,
            message: "Timeline Event Added",
            data: event,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ============================================================
// Get Patient Timeline
// ============================================================

export const getPatientTimeline = async (req, res) => {
    try {
        const patientId =
            await resolveTimelinePatient(req);

        if (!patientId) {
            return res.status(404).json({
                success: false,
                message:
                    "Patient profile is not linked to a patient record.",
            });
        }

        const timeline =
            await MedicalTimeline.find({
                patient: patientId,
            })
                .populate(
                    "createdBy",
                    "displayName role"
                )
                .sort({
                    createdAt: -1,
                });

        res.status(200).json({
            success: true,
            count: timeline.length,
            data: timeline,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};