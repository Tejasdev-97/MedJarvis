import { useEffect, useState } from "react";
import api from "../services/api";
import SectionTitle from "../components/dashboard/SectionTitle";
import StatCard from "../components/dashboard/StatCard";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import RoleBadge from "../components/dashboard/RoleBadge";

import { dashboardConfig } from "../data/dashboardConfig";

export default function DashboardPage() {

    const profile = JSON.parse(
        localStorage.getItem("profile") || "{}"
    );

    const config =
        dashboardConfig[profile.role] ||
        dashboardConfig.Patient;

    const [stats, setStats] = useState(null);

useEffect(() => {
    loadStats();
}, []);

async function loadStats() {
    try {
        const res = await api.get("/dashboard/stats");
        setStats(res.data.data);
    } catch (err) {
        console.log(err);
    }
}

    return (

    <>

        <DashboardHeader
            title={`Welcome, ${profile.displayName}`}
            subtitle={profile.role}
        />

        <RoleBadge role={profile.role}/>

        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">

            {config.stats.map((item) => {

    let value = item.value;

    if (stats) {

        switch (item.title) {

            case "Users":
                value = stats.totalUsers;
                break;

            case "Hospitals":
                value = stats.totalHospitals;
                break;

            case "Doctors":
                value = stats.totalDoctors;
                break;

            case "Health Workers":
                value = stats.totalHealthWorkers;
                break;

            case "Patients":
                value = stats.totalPatients;
                break;

            case "Critical":
                value = stats.critical;
                break;

            case "Emergency":
                value = stats.critical;
                break;

            default:
                value = item.value;

        }

    }

    return (

        <StatCard
            key={item.title}
            title={item.title}
            value={value}
            subtitle=""
            icon={item.icon}
            color={item.color}
        />

    );

})}

        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">

            <QuickActions actions={config.actions} />

            <RecentActivity role={profile.role} />

        </div>

        <div className="mt-6">

            <AlertsPanel role={profile.role} />

        </div>

    </>

);

}