import { useEffect, useState } from "react";
import {
    Activity,
    Pill,
    AlertTriangle,
    Stethoscope,
    Hospital,
    CalendarDays,
} from "lucide-react";
import api from "../../services/api";

export default function PatientTimeline({ patientId }) {

    const [timeline, setTimeline] = useState([]);

    useEffect(() => {

        loadTimeline();

    }, [patientId]);

    async function loadTimeline() {

        try {

            const res = await api.get(`/timeline/${patientId}`);

            setTimeline(res.data.data);

        } catch {

            setTimeline([]);

        }

    }

    function getEvent(eventType) {

        switch (eventType) {

            case "Prescription":

                return {
                    icon: Pill,
                    color: "bg-blue-100 text-blue-700",
                };

            case "Diagnosis":

                return {
                    icon: Stethoscope,
                    color: "bg-green-100 text-green-700",
                };

            case "Emergency":

                return {
                    icon: AlertTriangle,
                    color: "bg-red-100 text-red-700",
                };

            case "Admission":

                return {
                    icon: Hospital,
                    color: "bg-purple-100 text-purple-700",
                };

            default:

                return {
                    icon: Activity,
                    color: "bg-gray-100 text-gray-700",
                };

        }

    }

    return (

        <div className="bg-white rounded-2xl shadow p-6 mt-8">

            <div className="flex justify-between items-center mb-6">

                <h2 className="text-2xl font-bold">

                    Medical Timeline

                </h2>

                <span className="text-sm text-gray-500">

                    {timeline.length} Events

                </span>

            </div>

            {

                timeline.length === 0 ?

                (

                    <div className="text-center py-10">

                        <Activity
                            size={45}
                            className="mx-auto text-gray-400"
                        />

                        <p className="mt-4 text-gray-500">

                            No medical events recorded yet.

                        </p>

                    </div>

                )

                :

                (

                    <div className="space-y-6">

                        {

                            timeline.map((item) => {

                                const event = getEvent(item.eventType);

                                const Icon = event.icon;

                                return (

                                    <div
                                        key={item._id}
                                        className="relative border-l-4 border-[#2D6A4F] pl-6"
                                    >

                                        <div
                                            className={`absolute -left-5 top-0 rounded-full p-2 ${event.color}`}
                                        >

                                            <Icon size={18} />

                                        </div>

                                        <div className="flex justify-between items-start">

                                            <div>

                                                <h3 className="font-bold text-lg">

                                                    {item.title}

                                                </h3>

                                                <p className="text-gray-600 mt-2">

                                                    {item.description}

                                                </p>

                                            </div>

                                            <span
                                                className={`text-xs px-3 py-1 rounded-full ${event.color}`}
                                            >

                                                {item.eventType}

                                            </span>

                                        </div>

                                        <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">

                                            <CalendarDays size={15} />

                                            {new Date(
                                                item.createdAt
                                            ).toLocaleString()}

                                        </div>

                                    </div>

                                );

                            })

                        }

                    </div>

                )

            }

        </div>

    );

}