import {
    Clock,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";

export default function RecentActivity({ role }) {

    const activity = {

        "Super Admin": [
            "New Doctor profile created",
            "Hospital updated successfully",
            "System backup completed",
        ],

        Doctor: [
            "Prescription added",
            "Patient consultation completed",
            "AI summary generated",
        ],

        "Health Worker": [
            "New patient registered",
            "Village visit completed",
            "Vitals updated",
        ],

        "Ambulance Staff": [
            "Emergency patient scanned",
            "Patient transported",
            "Hospital notified",
        ],

        "Hospital Manager": [
            "Staff attendance updated",
            "Department report generated",
            "Inventory reviewed",
        ],

        Patient: [
            "Prescription updated",
            "Health Card downloaded",
            "Appointment scheduled",
        ],

    };

    return (

        <div className="bg-white rounded-2xl shadow p-6">

            <div className="flex items-center gap-2 mb-5">

                <Clock className="text-[#2D6A4F]" />

                <h2 className="text-xl font-bold">

                    Recent Activity

                </h2>

            </div>

            <div className="space-y-4">

                {(activity[role] || []).map((item) => (

                    <div
                        key={item}
                        className="flex items-center gap-3 border-b pb-3"
                    >

                        <CheckCircle2
                            size={18}
                            className="text-green-600"
                        />

                        <p>{item}</p>

                    </div>

                ))}

            </div>

        </div>

    );

}