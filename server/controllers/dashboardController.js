import Patient from "../models/Patient.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();

        const totalPatients = await Patient.countDocuments();

        const totalDoctors = await Profile.countDocuments({
            role: "Doctor",
        });

        const totalHealthWorkers = await Profile.countDocuments({
            role: "Health Worker",
        });

        const totalAmbulance = await Profile.countDocuments({
            role: "Ambulance Staff",
        });

        const totalManagers = await Profile.countDocuments({
            role: "Hospital Manager",
        });

        const totalHospitals = await Profile.countDocuments({
            role: "Hospital",
        });

        const healthy = await Patient.countDocuments({
            status: "Healthy",
        });

        const observation = await Patient.countDocuments({
            status: "Observation",
        });

        const critical = await Patient.countDocuments({
            status: "Critical",
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayRegistrations =
            await Patient.countDocuments({
                createdAt: {
                    $gte: today,
                },
            });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalPatients,
                totalDoctors,
                totalHealthWorkers,
                totalAmbulance,
                totalManagers,
                totalHospitals,
                healthy,
                observation,
                critical,
                todayRegistrations,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};