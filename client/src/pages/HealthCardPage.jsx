import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    Download,
    HeartPulse,
    Phone,
    Droplets,
    TriangleAlert,
    MapPin,
    User,
    Loader2,
    ShieldCheck,
} from "lucide-react";

import api from "../services/api";

export default function HealthCardPage() {
    const { patientId } = useParams();

    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState(null);
    const [card, setCard] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        loadCard();
    }, []);

    async function loadCard() {

    try {

        const url = patientId
    ? `/health-card/${patientId}`
    : "/health-card/me";

const res = await api.get(url);

        setPatient(res.data.patient);
        setCard(res.data.card);

    } catch (err) {

        console.error(err);

        setError(
            err.response?.data?.message ||
            "Unable to load Health Card."
        );

    } finally {

        setLoading(false);

    }

}

    async function downloadPDF() {

    try {

        const response = await api.get(

            `/health-card/pdf/${patient._id}`,

            {

                responseType: "blob",

            }

        );

        const url = window.URL.createObjectURL(response.data);

        const link = document.createElement("a");

        link.href = url;

        link.download = "MedJarvis-HealthCard.pdf";

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(url);

    } catch (err) {

        console.error(err);

        alert("Unable to download Health Card PDF.");

    }

}

    async function downloadQR() {

    try {

        const response = await api.get(

            `/health-card/qr/${patient._id}`,

            {

                responseType: "blob",

            }

        );

        const url = window.URL.createObjectURL(response.data);

        const link = document.createElement("a");

        link.href = url;

        link.download = "MedJarvis-QR.png";

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(url);

    } catch (err) {

        console.error(err);

        alert("Unable to download QR Code.");

    }

}

    if (loading) {

        return (

            <div className="flex items-center justify-center h-[70vh]">

                <div className="text-center">

                    <Loader2
                        size={48}
                        className="animate-spin mx-auto text-[#2D6A4F]"
                    />

                    <p className="mt-4 text-gray-600">

                        Loading Health Card...

                    </p>

                </div>

            </div>

        );

    }

    if (error) {

        return (

            <div className="max-w-2xl mx-auto">

                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">

                    <h2 className="font-bold text-red-700 text-xl">

                        {error}

                    </h2>

                </div>

            </div>

        );

    }

    return (

        <div className="max-w-6xl mx-auto">

            <div className="flex justify-between items-center mb-8">

                <div>

                    <h1 className="text-4xl font-bold text-[#2D6A4F]">

                        My Health Card

                    </h1>

                    <p className="text-gray-500 mt-1">

                        Digital Healthcare Identity

                    </p>

                </div>

                <ShieldCheck
                    size={50}
                    className="text-[#2D6A4F]"
                />

            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">

                <div className="bg-[#2D6A4F] text-white p-6">

                    <h2 className="text-2xl font-bold">

                        MedJarvis Health Card

                    </h2>

                    <p className="opacity-80">

                        Secure Digital Patient Identity

                    </p>

                </div>

                <div className="p-8 grid lg:grid-cols-3 gap-10">

                    <div className="flex flex-col items-center">

                        <img
                            src={card.qrCode}
                            alt="QR Code"
                            className="w-56 h-56 border rounded-2xl shadow"
                        />

                        <button
                            onClick={downloadQR}
                            className="mt-6 bg-[#2D6A4F] hover:bg-[#245540] text-white px-6 py-3 rounded-xl flex items-center gap-2"
                        >
                            <Download size={18} />
                            Download QR
                        </button>

                    </div>

                    <div className="lg:col-span-2">

                        <div className="grid md:grid-cols-2 gap-5">

                            <Card
                                icon={<User />}
                                title="Patient"
                                value={`${patient.firstName} ${patient.lastName}`}
                            />

                            <Card
                                icon={<HeartPulse />}
                                title="MedJarvis ID"
                                value={patient.medJarvisId}
                            />

                            <Card
                                icon={<Droplets />}
                                title="Blood Group"
                                value={patient.bloodGroup}
                            />

                            <Card
                                icon={<Phone />}
                                title="Emergency Contact"
                                value={patient.emergencyContact}
                            />

                            <Card
                                icon={<TriangleAlert />}
                                title="Allergies"
                                value={
                                    patient.allergies.length
                                        ? patient.allergies.join(", ")
                                        : "None"
                                }
                            />

                            <Card
                                icon={<MapPin />}
                                title="Location"
                                value={`${patient.village}, ${patient.district}`}
                            />

                        </div>

                        <div className="mt-8">

                            <button
                                onClick={downloadPDF}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl flex items-center gap-2"
                            >
                                <Download size={20} />
                                Download Health Card PDF
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}

function Card({ icon, title, value }) {

    return (

        <div className="bg-[#FAFAFA] rounded-2xl p-5 border">

            <div className="flex items-center gap-2 text-[#2D6A4F] font-semibold">

                {icon}

                {title}

            </div>

            <div className="mt-3 text-lg font-medium break-words">

                {value}

            </div>

        </div>

    );

}