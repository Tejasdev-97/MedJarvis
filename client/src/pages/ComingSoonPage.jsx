import { useLocation } from "react-router-dom";
import {
    Construction,
    CheckCircle2,
    Clock3,
    Sparkles,
} from "lucide-react";

const moduleInfo = {

    hospitals: {
        title: "Hospital Management",
        description:
            "Manage hospitals, onboard new healthcare organizations, assign Hospital Managers, monitor hospital activity and support cross-hospital patient records.",
    },

    reports: {
        title: "Reports & Analytics",
        description:
            "Generate healthcare reports, patient statistics, disease trends, medicine usage reports and hospital performance analytics.",
    },

    audit: {
        title: "Audit Logs",
        description:
            "Track every important activity including logins, QR scans, patient updates, prescription creation and profile changes for complete accountability.",
    },

    settings: {
        title: "System Settings",
        description:
            "Configure MedJarvis, security policies, notification preferences, hospital settings and future AI integrations.",
    },

    ai: {
        title: "AI Health Summary",
        description:
            "Generate an evolving AI-powered patient health summary using diagnoses, prescriptions, vitals, medical history and future wearable sensor data.",
    },

    emergency: {
        title: "Emergency Module",
        description:
            "Support ambulance staff with emergency QR access, critical medical information, live emergency workflow and hospital coordination.",
    },

    consultations: {
        title: "Consultations",
        description:
            "View doctor consultations, diagnosis history and complete treatment records for each patient.",
    },

    appointments: {
        title: "Appointments",
        description:
            "Schedule, manage and monitor patient appointments and follow-up visits.",
    },

    villages: {
        title: "Village Visits",
        description:
            "Manage field visits, outreach activities and community health programs performed by Health Workers.",
    },

    vitals: {
        title: "Vitals & Sensor Monitoring",
        description:
            "Track patient vitals including heart rate, SpO₂, temperature and future wearable sensor readings with trend analysis.",
    },

};

export default function ComingSoonPage() {

    const location = useLocation();

    const key = location.pathname.replace("/", "");

    const module = moduleInfo[key] || {
        title: "Module",
        description:
            "This module is planned as part of the MedJarvis platform and will be available in an upcoming development phase.",
    };

    return (

        <div className="bg-white rounded-2xl shadow-lg p-10">

            <div className="flex items-center gap-4 mb-8">

                <Construction
                    size={55}
                    className="text-[#2D6A4F]"
                />

                <div>

                    <h1 className="text-3xl font-bold">

                        {module.title}

                    </h1>

                    <p className="text-gray-500 mt-1">

                        Planned MedJarvis Module

                    </p>

                </div>

            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 border">

                <h2 className="font-semibold text-lg mb-3">

                    Overview

                </h2>

                <p className="text-gray-600 leading-7">

                    {module.description}

                </p>

            </div>

            <div className="grid md:grid-cols-3 gap-5 mt-8">

                <div className="border rounded-xl p-5">

                    <Sparkles
                        className="text-[#2D6A4F] mb-3"
                    />

                    <h3 className="font-semibold">

                        Future Features

                    </h3>

                    <p className="text-sm text-gray-500 mt-2">

                        Advanced AI, analytics, automation and intelligent workflows will be integrated.

                    </p>

                </div>

                <div className="border rounded-xl p-5">

                    <Clock3
                        className="text-[#2D6A4F] mb-3"
                    />

                    <h3 className="font-semibold">

                        Development Status

                    </h3>

                    <p className="text-sm text-gray-500 mt-2">

                        UI planning completed. Module reserved for the next implementation phase.

                    </p>

                </div>

                <div className="border rounded-xl p-5">

                    <CheckCircle2
                        className="text-[#2D6A4F] mb-3"
                    />

                    <h3 className="font-semibold">

                        Project Vision

                    </h3>

                    <p className="text-sm text-gray-500 mt-2">

                        Designed to integrate seamlessly with the complete MedJarvis ecosystem.

                    </p>

                </div>

            </div>

        </div>

    );

}