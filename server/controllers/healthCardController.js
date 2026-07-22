import PDFDocument from "pdfkit";

import Patient from "../models/Patient.js";
import HealthCard from "../models/HealthCard.js";
import Profile from "../models/Profile.js";

import generateQRCode from "../utils/generateQRCode.js";

export const generateHealthCard = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient Not Found",
            });
        }

        let card = await HealthCard.findOne({
            patient: patient._id,
        });

        if (!card) {
            const qrCode = await generateQRCode(patient.medJarvisId);

            card = await HealthCard.create({
                patient: patient._id,
                medJarvisId: patient.medJarvisId,
                qrCode,
                cardVersion: patient.healthCardVersion,
            });
        }

        res.status(201).json({
            success: true,
            data: card,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getHealthCard = async (req, res) => {
    try {

        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient Not Found",
            });
        }

        let card = await HealthCard.findOne({
    patient: patient._id,
});

if (!card) {

    const qrCode = await generateQRCode(patient.medJarvisId);

    card = await HealthCard.create({
        patient: patient._id,
        medJarvisId: patient.medJarvisId,
        qrCode,
        cardVersion: patient.healthCardVersion,
    });

}

        res.status(200).json({
            success: true,
            patient,
            card,
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

export const getMyHealthCard = async (req, res) => {

    try {

        const profile = await Profile.findById(req.user.profileId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile Not Found",
            });
        }

        if (!profile.patient) {
            return res.status(400).json({
                success: false,
                message: "This profile is not linked to a patient.",
            });
        }

        const patient = await Patient.findById(profile.patient);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient Not Found",
            });
        }

        let card = await HealthCard.findOne({
            patient: patient._id,
        });

        if (!card) {

            const qrCode = await generateQRCode(
                patient.medJarvisId
            );

            card = await HealthCard.create({
                patient: patient._id,
                medJarvisId: patient.medJarvisId,
                qrCode,
                cardVersion: patient.healthCardVersion,
            });

        }

        res.status(200).json({
            success: true,
            patient,
            card,
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};

export const downloadQRCodePNG = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient Not Found",
            });
        }

        let card = await HealthCard.findOne({
    patient: patient._id,
});

if (!card) {

    const qrCode = await generateQRCode(patient.medJarvisId);

    card = await HealthCard.create({
        patient: patient._id,
        medJarvisId: patient.medJarvisId,
        qrCode,
        cardVersion: patient.healthCardVersion,
    });

}

        const base64 = card.qrCode.replace(
            /^data:image\/png;base64,/,
            ""
        );

        const img = Buffer.from(base64, "base64");

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${patient.medJarvisId}.png`
        );

        res.setHeader("Content-Type", "image/png");

        res.send(img);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const downloadHealthCardPDF = async (req, res) => {

    try {

        const patient = await Patient.findById(req.params.id);

        if (!patient) {

            return res.status(404).json({
                success: false,
                message: "Patient Not Found",
            });

        }

       let card = await HealthCard.findOne({
    patient: patient._id,
});

if (!card) {

    const qrCode = await generateQRCode(patient.medJarvisId);

    card = await HealthCard.create({
        patient: patient._id,
        medJarvisId: patient.medJarvisId,
        qrCode,
        cardVersion: patient.healthCardVersion,
    });

}

        const doc = new PDFDocument({
            size: "A4",
            margin: 0,
        });

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${patient.medJarvisId}.pdf`
        );

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        doc.pipe(res);

        // ==========================
        // A4 PAGE
        // ==========================

        const pageWidth = 595;
        const pageHeight = 842;

        // ATM CARD SIZE

        const cardWidth = 460;
        const cardHeight = 320;

        const startX = (pageWidth - cardWidth) / 2;
        const startY = 180;

        // CARD SHADOW

        doc.roundedRect(
            startX + 5,
            startY + 5,
            cardWidth,
            cardHeight,
            18
        )
        .fill("#E8E8E8");

        // MAIN CARD

        doc.roundedRect(
            startX,
            startY,
            cardWidth,
            cardHeight,
            18
        )
        .fillAndStroke(
            "#FFFFFF",
            "#2D6A4F"
        );

        // HEADER

        doc.rect(
            startX,
            startY,
            cardWidth,
            55
        )
        .fill("#2D6A4F");

        doc
            .fillColor("white")
            .fontSize(22)
            .text(
                "MEDJARVIS",
                startX,
                startY + 10,
                {
                    width: cardWidth,
                    align: "center",
                }
            );

        doc
            .fontSize(10)
            .text(
                "Rural Health Intelligence",
                startX,
                startY + 35,
                {
                    width: cardWidth,
                    align: "center",
                }
            );

        // QR

        const base64 = card.qrCode.replace(
            /^data:image\/png;base64,/,
            ""
        );

        const qrBuffer = Buffer.from(
            base64,
            "base64"
        );

        doc.image(qrBuffer, startX + 330, startY + 72, {
    width: 110,
});
                // LEFT SECTION

        let y = startY + 82;

        doc.fillColor("#2D6A4F")
            .fontSize(10);

        function drawField(label, value) {

            doc.font("Helvetica-Bold")
                .text(label, startX + 20, y);

            doc.font("Helvetica")
                .fillColor("black")
                .text(
                    value || "-",
                    startX + 120,
                    y,
                    {
                        width: 190,
                    }
                );

            doc.fillColor("#2D6A4F");

            y += 22;
        }

        drawField(
            "Name",
            `${patient.firstName} ${patient.lastName}`
        );

        drawField(
            "MedJarvis ID",
            patient.medJarvisId
        );

        drawField(
            "DOB",
            patient.dateOfBirth
                ? new Date(patient.dateOfBirth)
                    .toLocaleDateString("en-IN")
                : "-"
        );

        drawField(
            "Gender",
            patient.gender
        );

        drawField(
            "Blood Group",
            patient.bloodGroup
        );

        drawField(
            "Phone",
            patient.phone
        );

        drawField(
            "Emergency Contact",
            patient.emergencyContact
        );

        drawField(
    "Address",
    patient.address
);

        // QR Caption

        doc.fontSize(8)
            .fillColor("gray")
            .text(
                "Scan using\nMedJarvis",
                startX + 333,
                startY + 186,
                {
                    width: 90,
                    align: "center",
                }
            );

        // Footer Line

        doc.moveTo(
            startX + 15,
            startY + cardHeight - 28
        )
        .lineTo(
            startX + cardWidth - 15,
            startY + cardHeight - 28
        )
        .strokeColor("#D8D8D8")
        .stroke();

        // Footer

        doc.fillColor("#666666")
            .fontSize(8)
            .text(
                "MedJarvis Digital Health Card - www.medjarvis.in",
                startX,
                startY + cardHeight - 20,
                {
                    width: cardWidth,
                    align: "center",
                }
            );

        doc.end();

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};

// Scan QR and Fetch Patient
export const scanHealthCard = async (req, res) => {

    try {

        console.log("PARAMS:", req.params);

        const { medJarvisId } = req.params;

        const patient = await Patient.findOne({
            medJarvisId: medJarvisId.trim(),
        });

        console.log("FOUND PATIENT:", patient);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found.",
            });
        }

        return res.json({
            success: true,
            patient,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};