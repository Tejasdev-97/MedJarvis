import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import MedicalTimeline from "../models/MedicalTimeline.js";

import {
    generateGeminiResponse,
} from "../services/geminiService.js";

export async function testGeminiKey(req, res) {

    const { apiKey } = req.body;

    const result =
        await generateGeminiResponse({

            apiKey,

            prompt:
                "Reply only with: Gemini connection successful.",

        });

    if (!result.success)
        return res.status(400).json(result);

    res.json(result);

}

export async function patientSummary(req, res) {

    try {

        const {

            patientId,

            apiKey,

            regenerate,

        } = req.body;

        const patient =
            await Patient.findById(patientId);

        if (!patient) {

            return res.status(404).json({

                success:false,

                message:"Patient not found",

            });

        }

        if (
            patient.aiSummary &&
            !regenerate
        ) {

            return res.json({

                success:true,

                cached:true,

                summary:patient.aiSummary,

                generatedAt:
                    patient.aiSummaryGeneratedAt,

            });

        }

        const prescriptions =
            await Prescription.find({

                patient:patientId,

            })
            .populate(
                "doctor",
                "displayName"
            );

        const timeline =
            await MedicalTimeline.find({

                patient:patientId,

            });

        const prompt = `

You are MedJarvis AI.

Generate a doctor-friendly summary.

Patient

${patient.firstName}
${patient.lastName}

Age:
${patient.age}

Gender:
${patient.gender}

Blood Group:
${patient.bloodGroup}

Status:
${patient.status}

Medical History

${patient.medicalHistory.join(", ")}

Allergies

${patient.allergies.join(", ")}

Medications

${patient.medications.join(", ")}

Prescriptions

${JSON.stringify(
prescriptions,
null,
2
)}

Timeline

${JSON.stringify(
timeline,
null,
2
)}

Generate

1 Overall Health

2 Risks

3 Current Treatment

4 Recommendations

Maximum 250 words.

`;

        const result =
            await generateGeminiResponse({

                apiKey,

                prompt,

            });

        if (!result.success) {

            return res.status(400).json(result);

        }

        patient.aiSummary =
            result.text;

        patient.aiSummaryGeneratedAt =
            new Date();

        patient.aiSummaryModel =
            process.env.GEMINI_MODEL ||
            "gemini-2.5-flash-lite";

        await patient.save();

        res.json({

            success:true,

            cached:false,

            summary:result.text,

            generatedAt:
                patient.aiSummaryGeneratedAt,

        });

    }

    catch(err){

        res.status(500).json({

            success:false,

            message:err.message,

        });

    }

}