import {
    TriangleAlert,
} from "lucide-react";

export default function AlertsPanel({ role }) {

    const alerts = {

        "Super Admin": [
            "System healthy",
            "No security alerts",
        ],

        Doctor: [
            "2 Critical Patients",
            "Drug interaction reminder",
        ],

        "Health Worker": [
            "1 High Risk Pregnancy",
            "2 Home Visits Pending",
        ],

        "Ambulance Staff": [
            "Nearest PHC 4 km",
            "Emergency Alert Active",
        ],

        "Hospital Manager": [
            "Bed Occupancy 72%",
            "Inventory Low",
        ],

        Patient: [
            "Medicine Due Today",
            "Next Appointment Tomorrow",
        ],

    };

    return (

        <div className="bg-white rounded-2xl shadow p-6">

            <div className="flex gap-2 items-center mb-5">

                <TriangleAlert className="text-red-500" />

                <h2 className="text-xl font-bold">

                    Alerts

                </h2>

            </div>

            <div className="space-y-3">

                {(alerts[role] || []).map((item) => (

                    <div
                        key={item}
                        className="bg-[#FAF7F2] rounded-xl p-4"
                    >

                        {item}

                    </div>

                ))}

            </div>

        </div>

    );

}