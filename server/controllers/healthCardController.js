import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Patient from "../models/Patient.js";
import HealthCard from "../models/HealthCard.js";
import Profile from "../models/Profile.js";

import generateQRCode from "../utils/generateQRCode.js";

const findMedJarvisLogo = () => {
    try {
        const controllerDir = path.dirname(fileURLToPath(import.meta.url));
        const projectRoot = path.resolve(controllerDir, "../..");

        const preferredNames = [
            "medjarvis-logo.png",
            "medjarvis-logo.jpg",
            "medjarvis-logo.jpeg",
            "medjarvis.png",
            "medjarvis.jpg",
            "logo.png",
            "logo.jpg",
            "logo.jpeg",
            "brand-logo.png",
            "brand.png",
        ];

        const roots = [
            path.join(projectRoot, "client", "public"),
            path.join(projectRoot, "client", "src", "assets"),
            path.join(projectRoot, "client", "src"),
        ];

        for (const root of roots) {
            if (!fs.existsSync(root)) continue;

            for (const preferredName of preferredNames) {
                const exact = path.join(root, preferredName);

                if (fs.existsSync(exact)) {
                    return exact;
                }
            }
        }

        const walk = (directory, depth = 0) => {
            if (depth > 3 || !fs.existsSync(directory)) {
                return null;
            }

            let entries;

            try {
                entries = fs.readdirSync(directory, {
                    withFileTypes: true,
                });
            } catch {
                return null;
            }

            for (const entry of entries) {
                if (
                    ["node_modules", "dist", ".git"].includes(
                        entry.name
                    )
                ) {
                    continue;
                }

                const fullPath = path.join(
                    directory,
                    entry.name
                );

                if (entry.isDirectory()) {
                    const result = walk(
                        fullPath,
                        depth + 1
                    );

                    if (result) {
                        return result;
                    }
                }

                if (entry.isFile()) {
                    const lower = entry.name.toLowerCase();

                    if (
                        (lower.includes("medjarvis") ||
                            lower.includes("logo")) &&
                        /\.(png|jpe?g)$/i.test(lower)
                    ) {
                        return fullPath;
                    }
                }
            }

            return null;
        };

        for (const root of roots) {
            const result = walk(root);

            if (result) {
                return result;
            }
        }
    } catch {
        // Branding must never be allowed to break PDF generation.
    }

    return null;
};

const drawMedJarvisLogoFallback = (doc, x, y) => {
    doc.save();

    doc.roundedRect(
        x,
        y,
        30,
        30,
        7
    ).fill("#F3F4E9");

    doc.fillColor("#174D3A");

    doc.ellipse(
        x + 15,
        y + 15,
        6,
        11
    ).fill();

    doc.save();

    doc.rotate(42, {
        origin: [
            x + 15,
            y + 15,
        ],
    });

    doc.ellipse(
        x + 20,
        y + 9,
        4,
        8
    ).fill("#E5A544");

    doc.restore();

    doc.font("Helvetica-Bold")
        .fontSize(15)
        .fillColor("#FFFFFF")
        .text(
            "MEDJARVIS",
            x + 39,
            y + 2,
            {
                width: 160,
            }
        );

    doc.font("Helvetica")
        .fontSize(7.2)
        .fillColor("#D8E9DE")
        .text(
            "Rural Health Intelligence",
            x + 40,
            y + 20,
            {
                width: 160,
            }
        );

    doc.restore();
};

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
            const qrCode = await generateQRCode(
                patient.medJarvisId
            );

            card = await HealthCard.create({
                patient: patient._id,
                medJarvisId: patient.medJarvisId,
                qrCode,
                cardVersion:
                    patient.healthCardVersion,
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
        const patient = await Patient.findById(
            req.params.id
        );

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
                cardVersion:
                    patient.healthCardVersion,
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
        const profile = await Profile.findById(
            req.user.profileId
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile Not Found",
            });
        }

        if (!profile.patient) {
            return res.status(400).json({
                success: false,
                message:
                    "This profile is not linked to a patient.",
            });
        }

        const patient = await Patient.findById(
            profile.patient
        );

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
                cardVersion:
                    patient.healthCardVersion,
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
        const patient = await Patient.findById(
            req.params.id
        );

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
                cardVersion:
                    patient.healthCardVersion,
            });
        }

        const base64 = card.qrCode.replace(
            /^data:image\/png;base64,/,
            ""
        );

        const img = Buffer.from(
            base64,
            "base64"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${patient.medJarvisId}.png`
        );

        res.setHeader(
            "Content-Type",
            "image/png"
        );

        res.send(img);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const downloadHealthCardPDF = async (
    req,
    res
) => {
    try {
        const patient = await Patient.findById(
            req.params.id
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient Not Found",
            });
        }

        /*
         * IMPORTANT:
         * Preserve the existing HealthCard / QR creation
         * mechanism. Only the visual PDF design is changed.
         */
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
                cardVersion:
                    patient.healthCardVersion,
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

        const pageWidth = 595.28;
        const pageHeight = 841.89;

        /*
         * Landscape digital-card proportion.
         *
         * Increased from the previous design so the card
         * makes better use of the A4 preview area.
         */
        const cardWidth = 460;
        const cardHeight = cardWidth / 1.586;

        const startX =
            (pageWidth - cardWidth) / 2;

        const startY =
            (pageHeight - cardHeight) / 2;

        const radius = 20;

        const safeText = (value) => {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return "-";
            }

            return String(value);
        };

        const patientName =
            [
                patient.firstName,
                patient.lastName,
            ]
                .filter(Boolean)
                .join(" ") || "-";

        const formatDate = (value) => {
            if (!value) {
                return "-";
            }

            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return safeText(value);
            }

            return date.toLocaleDateString(
                "en-IN"
            );
        };

        /*
         * ============================================================
         * CARD SHADOW
         * ============================================================
         */

        doc.save();

        doc.roundedRect(
            startX + 6,
            startY + 8,
            cardWidth,
            cardHeight,
            radius
        ).fill("#C6CEC9");

        doc.restore();

        /*
         * ============================================================
         * CARD BASE
         * ============================================================
         */

        doc.roundedRect(
            startX,
            startY,
            cardWidth,
            cardHeight,
            radius
        ).fillAndStroke(
            "#FAF8F2",
            "#B9C8BE"
        );

        /*
         * ============================================================
         * HEADER
         * ============================================================
         */

        const headerHeight = 82;

        doc.save();

        doc.roundedRect(
            startX,
            startY,
            cardWidth,
            headerHeight,
            radius
        ).fill("#064D38");

        /*
         * Fill the lower rounded-header corners so there
         * are no white gaps.
         */
        doc.rect(
            startX,
            startY + headerHeight - radius,
            cardWidth,
            radius
        ).fill("#064D38");

        /*
         * Header decorative organic shape.
         */
        doc.opacity(0.17);

        doc.path(
            `M ${startX + 245} ${startY}
             C ${startX + 325} ${startY + 20},
               ${startX + 370} ${startY + 65},
               ${startX + 440} ${startY + headerHeight}
             L ${startX + cardWidth} ${startY + headerHeight}
             L ${startX + cardWidth} ${startY}
             Z`
        ).fill("#80AE92");

        doc.path(
            `M ${startX + 355} ${startY}
             C ${startX + 410} ${startY + 18},
               ${startX + 455} ${startY + 46},
               ${startX + cardWidth} ${startY + 60}
             L ${startX + cardWidth} ${startY}
             Z`
        ).fill("#2C755D");

        doc.restore();

        /*
         * ============================================================
         * ECG LINE
         * ============================================================
         */

        doc.save();

        doc.opacity(0.32);
        doc.strokeColor("#8DB9A0");
        doc.lineWidth(1.5);

        const ecgX =
            startX + 292;

        const ecgY =
            startY + 44;

        doc.moveTo(ecgX, ecgY)
            .lineTo(ecgX + 20, ecgY)
            .lineTo(ecgX + 30, ecgY - 7)
            .lineTo(ecgX + 40, ecgY + 8)
            .lineTo(ecgX + 52, ecgY - 24)
            .lineTo(ecgX + 64, ecgY + 14)
            .lineTo(ecgX + 77, ecgY)
            .lineTo(ecgX + 104, ecgY)
            .stroke();

        doc.restore();

        /*
         * ============================================================
         * LEAF MOTIF
         * ============================================================
         */

        doc.save();

        doc.opacity(0.52);

        doc.fillColor("#C4D9A3");
        doc.strokeColor("#C4D9A3");
        doc.lineWidth(1);

        const leafX =
            startX + cardWidth - 65;

        const leafY =
            startY + 63;

        doc.moveTo(
            leafX,
            leafY + 12
        )
            .lineTo(
                leafX + 10,
                leafY - 27
            )
            .stroke();

        doc.ellipse(
            leafX + 11,
            leafY - 25,
            8,
            17
        ).fill();

        doc.save();

        doc.rotate(
            -38,
            {
                origin: [
                    leafX + 2,
                    leafY - 4,
                ],
            }
        );

        doc.ellipse(
            leafX - 8,
            leafY - 12,
            7,
            15
        ).fill();

        doc.restore();

        doc.save();

        doc.rotate(
            35,
            {
                origin: [
                    leafX + 8,
                    leafY - 3,
                ],
            }
        );

        doc.ellipse(
            leafX + 8,
            leafY - 9,
            7,
            15
        ).fill();

        doc.restore();

        doc.restore();

        /*
         * ============================================================
         * MEDJARVIS BRANDING
         * ============================================================
         */

        const logoPath =
            findMedJarvisLogo();

        if (logoPath) {
            try {
                doc.image(
                    logoPath,
                    startX + 18,
                    startY + 13,
                    {
                        fit: [225, 56],
                        align: "left",
                        valign: "center",
                    }
                );
            } catch {
                drawMedJarvisLogoFallback(
                    doc,
                    startX + 18,
                    startY + 16
                );
            }
        } else {
            drawMedJarvisLogoFallback(
                doc,
                startX + 18,
                startY + 16
            );
        }

        /*
         * Header right title.
         */

        doc.font("Helvetica-Bold")
            .fontSize(10.5)
            .fillColor("#FFFFFF")
            .text(
                "DIGITAL HEALTH CARD",
                startX + 335,
                startY + 18,
                {
                    width: 110,
                    align: "right",
                }
            );

        doc.font("Helvetica-Bold")
            .fontSize(7.8)
            .fillColor("#DCEBE2")
            .text(
                "Secure patient identity",
                startX + 325,
                startY + 36,
                {
                    width: 120,
                    align: "right",
                }
            );

        /*
         * ============================================================
         * INNER BODY
         * ============================================================
         */

        const bodyX =
            startX + 14;

        const bodyY =
            startY + 67;

        const bodyWidth =
            cardWidth - 28;

        const bodyHeight =
            cardHeight - 78;

        doc.roundedRect(
            bodyX,
            bodyY,
            bodyWidth,
            bodyHeight,
            16
        ).fill("#FCFBF7");

        /*
         * ============================================================
         * RIGHT PHOTO / QR COLUMN
         * ============================================================
         */

        const rightWidth = 120;

        const rightX =
            bodyX +
            bodyWidth -
            rightWidth -
            10;

        const dividerX =
            rightX - 12;

        /*
         * Divider.
         */

        doc.save();

        doc.strokeColor("#9EB3A5");
        doc.lineWidth(1);

        doc.moveTo(
            dividerX,
            bodyY + 10
        )
            .lineTo(
                dividerX,
                bodyY + bodyHeight - 10
            )
            .stroke();

        doc.restore();

        /*
         * ============================================================
         * PHOTO PLACEHOLDER
         * ============================================================
         */

        const avatarSize = 64;

        const avatarX =
            rightX +
            (rightWidth - avatarSize) / 2;

        const avatarY =
            bodyY + 9;

        doc.roundedRect(
            avatarX,
            avatarY,
            avatarSize,
            avatarSize,
            11
        ).fill("#E8ECE2");

        /*
         * Person icon.
         */

        doc.fillColor("#0C4D39");

        doc.circle(
            avatarX + avatarSize / 2,
            avatarY + 21,
            10
        ).fill();

        doc.path(
            `M ${avatarX + 13} ${avatarY + 54}
             C ${avatarX + 16} ${avatarY + 38},
               ${avatarX + 48} ${avatarY + 38},
               ${avatarX + 51} ${avatarY + 54}
             Z`
        ).fill("#0C4D39");

        /*
         * ============================================================
         * QR CODE
         *
         * IMPORTANT:
         * There is now a clearly visible gap between the
         * profile image and QR box.
         * ============================================================
         */

        const qrSize = 74;

        const photoQrGap = 18;

        const qrX =
            rightX +
            (rightWidth - qrSize) / 2;

        const qrY =
            avatarY +
            avatarSize +
            photoQrGap;

        /*
         * QR white box.
         */

        doc.roundedRect(
            qrX - 6,
            qrY - 6,
            qrSize + 12,
            qrSize + 12,
            8
        ).fillAndStroke(
            "#FFFFFF",
            "#15563F"
        );

        const base64 =
            card.qrCode.replace(
                /^data:image\/png;base64,/,
                ""
            );

        const qrBuffer =
            Buffer.from(
                base64,
                "base64"
            );

        doc.image(
            qrBuffer,
            qrX,
            qrY,
            {
                width: qrSize,
                height: qrSize,
            }
        );

        /*
         * QR captions.
         */

        doc.font("Helvetica-Bold")
            .fontSize(8.2)
            .fillColor("#103F30")
            .text(
                "Scan to access",
                rightX,
                qrY + qrSize + 10,
                {
                    width: rightWidth,
                    align: "center",
                }
            );

        doc.font("Helvetica-Bold")
            .fontSize(7.6)
            .fillColor("#103F30")
            .text(
                "MedJarvis",
                rightX,
                qrY + qrSize + 22,
                {
                    width: rightWidth,
                    align: "center",
                }
            );

        /*
         * ============================================================
         * VECTOR FIELD ICONS
         *
         * These are actual PDF vector drawings.
         * They are NOT emoji characters, so they will reliably
         * appear in the generated PDF.
         * ============================================================
         */

        const iconColor =
            "#14583F";

        const drawFieldIcon = (
            type,
            x,
            y
        ) => {
            doc.save();

            doc.strokeColor(
                iconColor
            );

            doc.fillColor(
                iconColor
            );

            doc.lineWidth(1.7);

            /*
             * PERSON
             */

            if (type === "person") {
                doc.circle(
                    x + 7,
                    y + 4.5,
                    3.4
                ).fill();

                doc.path(
                    `M ${x + 1} ${y + 15}
                     C ${x + 1.5} ${y + 9},
                       ${x + 12.5} ${y + 9},
                       ${x + 13} ${y + 15}
                     Z`
                ).fill();
            }

            /*
             * ID CARD
             */

            if (type === "id") {
                doc.roundedRect(
                    x,
                    y + 1,
                    15,
                    11,
                    1.5
                ).stroke();

                doc.circle(
                    x + 4,
                    y + 5.2,
                    1.7
                ).fill();

                doc.moveTo(
                    x + 7,
                    y + 4
                )
                    .lineTo(
                        x + 13,
                        y + 4
                    )
                    .stroke();

                doc.moveTo(
                    x + 7,
                    y + 7
                )
                    .lineTo(
                        x + 13,
                        y + 7
                    )
                    .stroke();
            }

            /*
             * CALENDAR
             */

            if (type === "calendar") {
                doc.roundedRect(
                    x,
                    y + 2,
                    15,
                    12,
                    1.5
                ).stroke();

                doc.moveTo(
                    x + 3,
                    y
                )
                    .lineTo(
                        x + 3,
                        y + 4
                    )
                    .stroke();

                doc.moveTo(
                    x + 12,
                    y
                )
                    .lineTo(
                        x + 12,
                        y + 4
                    )
                    .stroke();

                doc.moveTo(
                    x + 1,
                    y + 6
                )
                    .lineTo(
                        x + 14,
                        y + 6
                    )
                    .stroke();
            }

            /*
             * GENDER
             */

            if (type === "gender") {
                doc.circle(
                    x + 5,
                    y + 10,
                    4
                ).stroke();

                doc.moveTo(
                    x + 8,
                    y + 7
                )
                    .lineTo(
                        x + 13,
                        y + 2
                    )
                    .stroke();

                doc.moveTo(
                    x + 10,
                    y + 2
                )
                    .lineTo(
                        x + 13,
                        y + 2
                    )
                    .lineTo(
                        x + 13,
                        y + 5
                    )
                    .stroke();
            }

            /*
             * BLOOD DROP
             */

            if (type === "blood") {
                doc.path(
                    `M ${x + 7} ${y}
                     C ${x + 3} ${y + 5},
                       ${x + 1} ${y + 8},
                       ${x + 1} ${y + 11}
                     C ${x + 1} ${y + 14},
                       ${x + 3.5} ${y + 16},
                       ${x + 7} ${y + 16}
                     C ${x + 10.5} ${y + 16},
                       ${x + 13} ${y + 14},
                       ${x + 13} ${y + 11}
                     C ${x + 13} ${y + 8},
                       ${x + 11} ${y + 5},
                       ${x + 7} ${y}
                     Z`
                ).fill();
            }

            /*
             * PHONE
             */

            if (type === "phone") {
                doc.moveTo(
                    x + 4,
                    y + 2
                )
                    .lineTo(
                        x + 2,
                        y + 4
                    )
                    .lineTo(
                        x + 4,
                        y + 10
                    )
                    .lineTo(
                        x + 9,
                        y + 14
                    )
                    .lineTo(
                        x + 12,
                        y + 12
                    )
                    .stroke();
            }

            /*
             * EMERGENCY CONTACT
             */

            if (type === "emergency") {
                doc.circle(
                    x + 4.5,
                    y + 4.5,
                    3
                ).fill();

                doc.circle(
                    x + 10.5,
                    y + 5.5,
                    2.4
                ).fill();

                doc.path(
                    `M ${x + 0.5} ${y + 15}
                     C ${x + 1} ${y + 10},
                       ${x + 8} ${y + 9},
                       ${x + 9} ${y + 15}
                     Z`
                ).fill();

                doc.path(
                    `M ${x + 8} ${y + 15}
                     C ${x + 8.5} ${y + 11},
                       ${x + 14} ${y + 11},
                       ${x + 14} ${y + 15}
                     Z`
                ).fill();
            }

            /*
             * LOCATION
             */

            if (type === "location") {
                doc.path(
                    `M ${x + 7} ${y + 16}
                     C ${x + 2} ${y + 10},
                       ${x + 2} ${y + 2},
                       ${x + 7} ${y + 2}
                     C ${x + 12} ${y + 2},
                       ${x + 12} ${y + 10},
                       ${x + 7} ${y + 16}
                     Z`
                ).stroke();

                doc.circle(
                    x + 7,
                    y + 7,
                    1.8
                ).stroke();
            }

            doc.restore();
        };

        /*
         * ============================================================
         * PATIENT INFORMATION
         * ============================================================
         */

        const infoX =
            bodyX + 16;

        const iconX =
            infoX;

        const labelX =
            infoX + 25;

        const colonX =
            infoX + 107;

        const valueX =
            infoX + 120;

        /*
         * More vertical space between rows.
         */

        let y =
            bodyY + 13;

        const fieldGap = 19.5;

        const drawField = (
            icon,
            label,
            value,
            options = {}
        ) => {
            drawFieldIcon(
                icon,
                iconX,
                y - 1
            );

            /*
             * LABEL
             */

            doc.font("Helvetica-Bold")
                .fontSize(
                    options.labelSize || 9.2
                )
                .fillColor("#123F30")
                .text(
                    label,
                    labelX,
                    y,
                    {
                        width: 78,
                    }
                );

            /*
             * COLON
             */

            doc.font("Helvetica-Bold")
                .fontSize(9)
                .fillColor("#123F30")
                .text(
                    ":",
                    colonX,
                    y,
                    {
                        width: 6,
                    }
                );

            /*
             * VALUE
             */

            doc.font(
                options.bold === false
                    ? "Helvetica"
                    : "Helvetica-Bold"
            )
                .fontSize(
                    options.valueSize || 10.3
                )
                .fillColor("#111A16")
                .text(
                    safeText(value),
                    valueX,
                    y - 0.5,
                    {
                        width: 166,
                        ellipsis: true,
                    }
                );

            y += fieldGap;
        };

        /*
         * NAME
         */

        drawField(
            "person",
            "Name",
            patientName,
            {
                valueSize: 12.5,
            }
        );

        /*
         * MEDJARVIS ID
         */

        drawField(
            "id",
            "MedJarvis ID",
            patient.medJarvisId,
            {
                valueSize: 10.3,
            }
        );

        /*
         * DOB
         */

        drawField(
            "calendar",
            "Date of Birth",
            formatDate(
                patient.dateOfBirth
            ),
            {
                valueSize: 10.1,
            }
        );

        /*
         * GENDER
         */

        drawField(
            "gender",
            "Gender",
            patient.gender,
            {
                valueSize: 10.1,
            }
        );

        /*
         * ============================================================
         * BLOOD GROUP
         * ============================================================
         */

        drawFieldIcon(
            "blood",
            iconX,
            y - 1
        );

        doc.font("Helvetica-Bold")
            .fontSize(9.2)
            .fillColor("#123F30")
            .text(
                "Blood Group",
                labelX,
                y,
                {
                    width: 78,
                }
            );

        doc.font("Helvetica-Bold")
            .fontSize(9)
            .fillColor("#123F30")
            .text(
                ":",
                colonX,
                y,
                {
                    width: 6,
                }
            );

        /*
         * Stronger blood group badge.
         */

        doc.roundedRect(
            valueX,
            y - 4,
            46,
            19,
            5
        ).fill("#F0D8D1");

        doc.font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#B23B2B")
            .text(
                safeText(
                    patient.bloodGroup
                ),
                valueX,
                y - 0.5,
                {
                    width: 46,
                    align: "center",
                }
            );

        y += fieldGap;

        /*
         * PHONE
         */

        drawField(
            "phone",
            "Phone",
            patient.phone,
            {
                valueSize: 10.1,
                bold: true,
            }
        );

        /*
         * EMERGENCY
         */

        drawField(
            "emergency",
            "Emergency",
            patient.emergencyContact,
            {
                valueSize: 10.3,
                bold: true,
            }
        );

        /*
         * ADDRESS
         */

        drawField(
            "location",
            "Address",
            patient.address,
            {
                valueSize: 10,
                bold: true,
            }
        );

        /*
         * ============================================================
         * FOOTER
         * ============================================================
         */

        const footerY =
            startY +
            cardHeight -
            27;

        doc.moveTo(
            bodyX + 12,
            footerY
        )
            .lineTo(
                bodyX +
                bodyWidth -
                12,
                footerY
            )
            .strokeColor("#B7C7BD")
            .lineWidth(0.9)
            .stroke();

        /*
         * Left footer.
         */

        doc.fillColor("#123F30")
            .font("Helvetica-Bold")
            .fontSize(8.8)
            .text(
                "MedJarvis Digital Health Card",
                bodyX + 25,
                footerY + 7,
                {
                    width: 220,
                }
            );

        /*
         * Right footer.
         */

        doc.font("Helvetica-Bold")
            .fontSize(8.5)
            .fillColor("#123F30")
            .text(
                "www.medjarvis.in",
                bodyX +
                bodyWidth -
                145,
                footerY + 7,
                {
                    width: 125,
                    align: "right",
                }
            );

        /*
         * Finish PDF.
         */

        doc.end();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*
 * ================================================================
 * SCAN QR AND FETCH PATIENT
 * ================================================================
 */

export const scanHealthCard = async (
    req,
    res
) => {
    try {
        console.log(
            "PARAMS:",
            req.params
        );

        const {
            medJarvisId,
        } = req.params;

        const patient =
            await Patient.findOne({
                medJarvisId:
                    medJarvisId.trim(),
            });

        console.log(
            "FOUND PATIENT:",
            patient
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message:
                    "Patient not found.",
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