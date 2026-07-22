import AuditLog from "../models/AuditLog.js";

const createAuditLog = async ({
    user,
    patient = null,
    action,
    details = "",
    ipAddress = "",
}) => {
    try {
        await AuditLog.create({
            user,
            patient,
            action,
            details,
            ipAddress,
        });
    } catch (error) {
        console.error("Audit Log Error:", error.message);
    }
};

export default createAuditLog;