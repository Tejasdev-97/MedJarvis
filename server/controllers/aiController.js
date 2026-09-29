import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import MedicalTimeline from "../models/MedicalTimeline.js";
import Profile from "../models/Profile.js";

import {
    generateGeminiResponse,
} from "../services/geminiService.js";

// ============================================================
// Resolve patient access
// ============================================================

async function resolvePatientAccess(req, patientId) {
    // Patient can access ONLY their linked patient record.
    if (req.user?.role === "Patient") {
        const profile = await Profile.findById(
            req.user.profileId
        ).select("patient role");

        if (!profile?.patient) {
            return null;
        }

        if (
            patientId &&
            String(profile.patient) !== String(patientId)
        ) {
            return null;
        }

        return profile.patient;
    }

    // Healthcare/admin roles may request a patient explicitly.
    return patientId;
}

// ============================================================
// Test Gemini connection
// ============================================================

export async function testGeminiKey(req, res) {
    try {
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: "Gemini API key is required.",
            });
        }

        const result = await generateGeminiResponse({
            apiKey,
            prompt:
                "Reply only with: Gemini connection successful.",
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

// ============================================================
// AI Patient Health Summary
// ============================================================

export async function patientSummary(req, res) {
    try {
        const {
            patientId,
            apiKey,
            regenerate,
        } = req.body;

        // --------------------------------------------------------
        // Resolve and validate patient access
        // --------------------------------------------------------

        const resolvedPatientId =
            await resolvePatientAccess(
                req,
                patientId
            );

        if (!resolvedPatientId) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to access this patient's AI summary.",
            });
        }

        // --------------------------------------------------------
        // Find patient
        // --------------------------------------------------------

        const patient =
            await Patient.findById(
                resolvedPatientId
            );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found.",
            });
        }

        // --------------------------------------------------------
        // Return cached summary when regeneration is not requested
        // --------------------------------------------------------

        if (
            patient.aiSummary &&
            !regenerate
        ) {
            return res.json({
                success: true,
                cached: true,
                summary: patient.aiSummary,
                generatedAt:
                    patient.aiSummaryGeneratedAt,
            });
        }

        // --------------------------------------------------------
        // API key required only when generating
        // --------------------------------------------------------

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message:
                    "Gemini API key is required to generate the AI summary.",
            });
        }

        // --------------------------------------------------------
        // Prescriptions
        // --------------------------------------------------------

        const prescriptions =
            await Prescription.find({
                patient: resolvedPatientId,
            })
                .populate(
                    "doctor",
                    "displayName"
                )
                .sort({
                    createdAt: -1,
                });

        // --------------------------------------------------------
        // Medical timeline
        // --------------------------------------------------------

        const timeline =
            await MedicalTimeline.find({
                patient: resolvedPatientId,
            })
                .sort({
                    createdAt: -1,
                });

        // --------------------------------------------------------
        // AI prompt
        // --------------------------------------------------------

        const prompt = `
You are MedJarvis AI.

Generate a concise, doctor-friendly patient health summary.

PATIENT

Name:
${patient.firstName || ""} ${patient.lastName || ""}

Age:
${patient.age ?? "Not available"}

Gender:
${patient.gender || "Not available"}

Blood Group:
${patient.bloodGroup || "Not available"}

Status:
${patient.status || "Not available"}

MEDICAL HISTORY

${Array.isArray(patient.medicalHistory)
                ? patient.medicalHistory.join(", ")
                : "No medical history recorded"
            }

ALLERGIES

${Array.isArray(patient.allergies)
                ? patient.allergies.join(", ")
                : "No allergies recorded"
            }

CURRENT MEDICATIONS

${Array.isArray(patient.medications)
                ? patient.medications.join(", ")
                : "No medications recorded"
            }

PRESCRIPTIONS

${JSON.stringify(
                prescriptions,
                null,
                2
            )}

MEDICAL TIMELINE

${JSON.stringify(
                timeline,
                null,
                2
            )}

Generate the following sections:

1. Overall Health
2. Risks
3. Current Treatment
4. Recommendations

Do not invent information.
Clearly indicate when information is unavailable.

Maximum 250 words.
`;

        // --------------------------------------------------------
        // Gemini
        // --------------------------------------------------------

        const result =
            await generateGeminiResponse({
                apiKey,
                prompt,
            });

        if (!result.success) {
            return res.status(400).json(result);
        }

        // --------------------------------------------------------
        // Save generated summary
        // --------------------------------------------------------

        patient.aiSummary =
            result.text;

        patient.aiSummaryGeneratedAt =
            new Date();

        patient.aiSummaryModel =
            process.env.GEMINI_MODEL ||
            "gemini-2.5-flash-lite";

        await patient.save();

        return res.json({
            success: true,
            cached: false,
            summary: result.text,
            generatedAt:
                patient.aiSummaryGeneratedAt,
        });
    } catch (err) {
        console.error(
            "AI PATIENT SUMMARY ERROR:",
            err
        );

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}