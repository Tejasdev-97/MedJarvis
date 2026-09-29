import { useEffect, useState } from "react";
import api from "../services/api";

import StatCard from "../components/dashboard/StatCard";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import RoleBadge from "../components/dashboard/RoleBadge";

import { dashboardConfig } from "../data/dashboardConfig";

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const profile = JSON.parse(
        localStorage.getItem("profile") || "{}"
    );

    const role = profile.role || "Patient";

    const config =
        dashboardConfig[role] ||
        dashboardConfig.Patient;

    useEffect(() => {
        let mounted = true;

        async function loadStats() {
            try {
                setLoading(true);
                setError("");

                const res = await api.get(
                    "/dashboard/stats"
                );

                if (mounted) {
                    setStats(
                        res.data?.data || null
                    );
                }
            } catch (err) {
                console.error(
                    "Dashboard stats error:",
                    err
                );

                if (mounted) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load live dashboard statistics."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadStats();

        return () => {
            mounted = false;
        };
    }, []);

    function getStatValue(item) {
        if (loading) {
            return "…";
        }

        if (!stats) {
            return "—";
        }

        switch (item.title) {
            case "Users":
                return stats.totalUsers ?? "—";

            case "Hospitals":
                return stats.totalHospitals ?? "—";

            case "Doctors":
                return stats.totalDoctors ?? "—";

            case "Health Workers":
                return stats.totalHealthWorkers ?? "—";

            case "Ambulance Staff":
                return stats.totalAmbulance ?? "—";

            case "Managers":
                return stats.totalManagers ?? "—";

            case "Patients":
                return stats.totalPatients ?? "—";

            case "Active Patients":
                return stats.activePatients ?? "—";

            case "Healthy":
                return stats.healthy ?? "—";

            case "Observation":
                return stats.observation ?? "—";

            case "Critical":
                return stats.critical ?? "—";

            case "Emergency":
                return stats.critical ?? "—";

            case "Today's Registrations":
                return stats.todayRegistrations ?? "—";

            default:
                // Never invent a live number.
                return "—";
        }
    }

    return (
        <div className="space-y-8">

            {/* =====================================================
                HEADER
            ====================================================== */}

            <div className="flex flex-col gap-4">

                <DashboardHeader
                    title={`Welcome, ${profile.displayName || "User"
                        }`}
                    subtitle={role}
                />

                <div>
                    <RoleBadge role={role} />
                </div>

            </div>


            {/* =====================================================
                ERROR
            ====================================================== */}

            {error && (
                <div
                    className="
                        rounded-2xl
                        border
                        border-[#F4A261]
                        bg-[#FFF8F1]
                        px-5
                        py-4
                        text-[#7C2D12]
                        font-medium
                    "
                >
                    {error}
                </div>
            )}


            {/* =====================================================
                STATISTICS
            ====================================================== */}

            <section>

                <div
                    className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        xl:grid-cols-4
                        gap-5
                    "
                >

                    {config.stats.map((item) => (
                        <StatCard
                            key={item.title}
                            title={item.title}
                            value={getStatValue(item)}
                            subtitle={
                                loading
                                    ? "Loading live data..."
                                    : "Live system data"
                            }
                            icon={item.icon}
                            color={item.color}
                        />
                    ))}

                </div>

            </section>


            {/* =====================================================
                ACTIONS + ACTIVITY
            ====================================================== */}

            <section
                className="
                    grid
                    grid-cols-1
                    xl:grid-cols-2
                    gap-6
                "
            >

                <QuickActions
                    actions={config.actions}
                />

                <RecentActivity
                    role={role}
                />

            </section>


            {/* =====================================================
                ALERTS
            ====================================================== */}

            <section>

                <AlertsPanel
                    role={role}
                />

            </section>

        </div>
    );
}