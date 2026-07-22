import { useEffect, useState } from "react";
import {
    Pill,
    UserRound,
    CalendarDays,
    ClipboardList,
} from "lucide-react";
import api from "../../services/api";

export default function PrescriptionHistory({ patientId }) {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [patientId]);

    async function loadHistory() {
        try {
            const res = await api.get(
                `/prescriptions/patient/${patientId}`
            );

            setPrescriptions(res.data.data || []);
        } catch {
            setPrescriptions([]);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow p-6 mt-8">
                Loading Prescriptions...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow p-6 mt-8">

            <div className="flex items-center gap-3 mb-6">

                <ClipboardList
                    size={30}
                    className="text-[#2D6A4F]"
                />

                <div>

                    <h2 className="text-2xl font-bold">
                        Prescription History
                    </h2>

                    <p className="text-gray-500">
                        {prescriptions.length} Prescription(s)
                    </p>

                </div>

            </div>

            {prescriptions.length === 0 ? (
                <p className="text-gray-500">
                    No prescriptions found.
                </p>
            ) : (
                <div className="space-y-5">

                    {prescriptions.map((prescription) => (

                        <div
                            key={prescription._id}
                            className="border rounded-2xl p-5"
                        >

                            <div className="flex justify-between">

                                <div>

                                    <h3 className="text-lg font-bold">

                                        {prescription.diagnosis}

                                    </h3>

                                    <div className="flex items-center gap-2 mt-2 text-gray-500">

                                        <UserRound size={15} />

                                        {
                                            prescription.doctor
                                                ?.displayName
                                        }

                                    </div>

                                </div>

                                <div className="flex items-center gap-2 text-gray-400">

                                    <CalendarDays size={15} />

                                    {new Date(
                                        prescription.createdAt
                                    ).toLocaleDateString()}

                                </div>

                            </div>

                            <div className="mt-5">

                                <h4 className="font-semibold flex items-center gap-2">

                                    <Pill size={18} />

                                    Medicines

                                </h4>

                                <div className="mt-3 space-y-3">

                                    {prescription.medicines.map(
                                        (medicine, index) => (

                                            <div
                                                key={index}
                                                className="bg-gray-50 rounded-xl p-3"
                                            >

                                                <p className="font-semibold">

                                                    {
                                                        medicine.medicineName
                                                    }

                                                </p>

                                                <p className="text-gray-600 text-sm mt-1">

                                                    {medicine.dosage}

                                                    {" • "}

                                                    {
                                                        medicine.frequency
                                                    }

                                                    {" • "}

                                                    {
                                                        medicine.duration
                                                    }

                                                </p>

                                            </div>

                                        )
                                    )}

                                </div>

                            </div>

                            {prescription.notes && (
                                <div className="mt-5 bg-yellow-50 rounded-xl p-4">

                                    <span className="font-semibold">

                                        Doctor Notes

                                    </span>

                                    <p className="mt-2 text-gray-700">

                                        {prescription.notes}

                                    </p>

                                </div>
                            )}

                        </div>

                    ))}

                </div>
            )}

        </div>
    );
}