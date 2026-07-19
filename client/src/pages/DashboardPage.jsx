import {

    HeartPulse,
    Activity,
    CalendarDays,
    ShieldAlert,

} from "lucide-react";

import SectionTitle from "../components/dashboard/SectionTitle";
import StatCard from "../components/dashboard/StatCard";

export default function DashboardPage() {

    const profile = JSON.parse(

        localStorage.getItem("profile") || "{}"

    );

    return (

        <>

            <SectionTitle

                title={`Welcome, ${profile.displayName || "User"}`}

                subtitle="Here's your latest healthcare overview."

            />

            <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">

                <StatCard

                    title="Heart Rate"

                    value="74 BPM"

                    subtitle="Normal"

                    icon={HeartPulse}

                    color="#E63946"

                />

                <StatCard

                    title="Blood Oxygen"

                    value="98%"

                    subtitle="Healthy"

                    icon={Activity}

                    color="#2D6A4F"

                />

                <StatCard

                    title="Appointments"

                    value="2"

                    subtitle="Upcoming"

                    icon={CalendarDays}

                    color="#F4A261"

                />

                <StatCard

                    title="Emergency"

                    value="Safe"

                    subtitle="No active alerts"

                    icon={ShieldAlert}

                    color="#2563EB"

                />

            </div>

        </>

    );

}