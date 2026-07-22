import MedicalTimeline from "../models/MedicalTimeline.js";

// Add Timeline Event
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

// Get Patient Timeline
export const getPatientTimeline = async (req, res) => {
    try {
        const timeline = await MedicalTimeline.find({
            patient: req.params.patientId,
        })
            .populate("createdBy", "displayName role")
            .sort({ createdAt: -1 });

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