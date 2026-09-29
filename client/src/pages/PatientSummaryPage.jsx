import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
    Brain,
    Activity,
    HeartPulse,
    Thermometer,
    Wind,
} from "lucide-react";
import PatientTimeline from "../components/patients/PatientTimeline";
import PrescriptionHistory from "../components/patients/PrescriptionHistory";

import api from "../services/api";

export default function PatientSummaryPage() {
    const { patientId } = useParams();
    const navigate = useNavigate();

    const profile = JSON.parse(
        localStorage.getItem("profile") || "{}"
    );

    const role = profile.role || "Patient";

    const canAddPrescription =
        role === "Doctor";

    const [patient, setPatient] = useState(null);
    const [latestPrescription, setLatestPrescription] = useState(null);
    const [latestVital, setLatestVital] = useState(null);
    const [vitalsLoading, setVitalsLoading] = useState(true);

    const [aiSummary, setAiSummary] = useState("");
    const [loadingAI, setLoadingAI] = useState(false);
    const [generatedAt, setGeneratedAt] = useState("");

    useEffect(() => {
        loadPatient();
        loadLatestVital();
    }, [patientId]);

    async function loadLatestVital() {
        try {
            setVitalsLoading(true);

            const res = await api.get(
                `/vitals/latest/${patientId}`
            );

            setLatestVital(res.data.data);
        } catch (error) {
            setLatestVital(null);
        } finally {
            setVitalsLoading(false);
        }
    }

    async function loadPatient() {
        try {
            // Load patient details
            const patientRes = await api.get(`/patients/${patientId}`);
            setPatient(patientRes.data.data);

            if (patientRes.data.data.aiSummary) {

                setAiSummary(
                    patientRes.data.data.aiSummary
                );

                if (patientRes.data.data.aiSummaryGeneratedAt) {

                    setGeneratedAt(
                        new Date(
                            patientRes.data.data.aiSummaryGeneratedAt
                        ).toLocaleString()
                    );

                }

            }

            // Load latest prescription
            try {
                const prescriptionRes = await api.get(
                    `/prescriptions/latest/${patientId}`
                );

                setLatestPrescription(prescriptionRes.data.data);
            } catch {
                setLatestPrescription(null);
            }
        } catch {
            alert("Unable to load patient");
        }
    }

    async function generateAI(regenerate = false) {

        try {

            setLoadingAI(true);

            const apiKey =
                localStorage.getItem("geminiKey");

            const res = await api.post(
                "/ai/patient-summary",
                {
                    patientId,
                    apiKey,
                    regenerate,
                }
            );

            setAiSummary(res.data.summary);

            if (res.data.generatedAt) {

                setGeneratedAt(
                    new Date(
                        res.data.generatedAt
                    ).toLocaleString()
                );

            }

        }

        catch (err) {

            alert(
                err.response?.data?.message ||
                "Unable to generate AI Summary."
            );

        }

        finally {

            setLoadingAI(false);

        }

    }

    if (!patient) {

        return (

            <div className="flex justify-center items-center h-96">

                <div className="text-center">

                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D6A4F] mx-auto"></div>

                    <p className="mt-5 text-gray-600">

                        Loading Patient...

                    </p>

                </div>

            </div>

        );

    }

    const summary = [];

    summary.push(
        `${patient.firstName} ${patient.lastName} is currently marked as ${patient.status}.`
    );

    summary.push(`Blood Group: ${patient.bloodGroup}.`);

    if (patient.medicalHistory?.length) {
        summary.push(
            `Medical History: ${patient.medicalHistory.join(", ")}.`
        );
    } else {
        summary.push("No previous medical history has been recorded.");
    }

    if (patient.allergies?.length) {
        summary.push(
            `Known Allergies: ${patient.allergies.join(", ")}.`
        );
    } else {
        summary.push("No known allergies recorded.");
    }

    if (patient.medications?.length) {
        summary.push(
            `Current Medications: ${patient.medications.join(", ")}.`
        );
    } else {
        summary.push("No long-term medications have been recorded.");
    }

    if (patient.wearableAssigned) {
        summary.push(
            "Wearable sensor assigned. Future AI summaries will include sensor trends."
        );
    } else {
        summary.push("No wearable device is currently assigned.");
    }

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">
                Patient Summary
            </h1>

            <div className="bg-white rounded-2xl shadow p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold">
                            {patient.firstName} {patient.lastName}
                        </h2>

                        <p className="text-gray-500 mt-1">
                            {patient.medJarvisId}
                        </p>
                    </div>

                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
                        {patient.status}
                    </span>
                </div>

                <div className="grid md:grid-cols-2 gap-5 mt-8">
                    <Info
                        title="Blood Group"
                        value={patient.bloodGroup}
                    />

                    <Info
                        title="Phone"
                        value={patient.phone}
                    />

                    <Info
                        title="Village"
                        value={patient.village}
                    />

                    <Info
                        title="District"
                        value={patient.district}
                    />

                    <Info
                        title="Emergency Contact"
                        value={patient.emergencyContact}
                    />

                    <Info
                        title="Gender"
                        value={patient.gender}
                    />
                </div>

                {/* ============================================================
    LIVE / LATEST SENSOR VITALS
============================================================ */}

                <div className="mt-8">

                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Activity size={25} />
                                Latest Sensor Reading
                            </h2>

                            <p className="text-gray-500 mt-1">
                                Latest 15-second ESP32 measurement
                            </p>
                        </div>

                        {latestVital && (
                            <span className="text-xs text-gray-500">
                                {new Date(latestVital.createdAt).toLocaleString()}
                            </span>
                        )}
                    </div>

                    {vitalsLoading ? (

                        <div className="border rounded-2xl p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D6A4F] mx-auto"></div>

                            <p className="mt-3 text-gray-500">
                                Loading sensor readings...
                            </p>
                        </div>

                    ) : latestVital ? (

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                            {/* SpO2 */}
                            <VitalCard
                                icon={<Wind size={22} />}
                                title="SpO₂"
                                value={
                                    latestVital.spo2 !== null &&
                                        latestVital.spo2 !== undefined
                                        ? `${latestVital.spo2} %`
                                        : "--"
                                }
                            />

                            {/* Heart Rate */}
                            <VitalCard
                                icon={<HeartPulse size={22} />}
                                title="Heart Rate"
                                value={
                                    latestVital.heartRate !== null &&
                                        latestVital.heartRate !== undefined
                                        ? `${latestVital.heartRate} BPM`
                                        : "--"
                                }
                            />

                            {/* Temperature */}
                            <VitalCard
                                icon={<Thermometer size={22} />}
                                title="Temperature"
                                value={
                                    latestVital.temperature !== null &&
                                        latestVital.temperature !== undefined
                                        ? `${latestVital.temperature} °C`
                                        : "--"
                                }
                            />

                            {/* HRV */}
                            <VitalCard
                                icon={<Activity size={22} />}
                                title="HRV (SDNN)"
                                value={
                                    latestVital.hrvSDNN !== null &&
                                        latestVital.hrvSDNN !== undefined
                                        ? `${latestVital.hrvSDNN} ms`
                                        : "--"
                                }
                            />

                            {/* Signal Quality */}
                            <VitalCard
                                title="Signal Quality"
                                value={
                                    latestVital.signalQuality !== null
                                        ? `${latestVital.signalQuality} %`
                                        : "--"
                                }
                            />

                            {/* Tilt */}
                            <VitalCard
                                title="Tilt"
                                value={
                                    latestVital.tilt !== null
                                        ? `${latestVital.tilt}°`
                                        : "--"
                                }
                            />

                            {/* Acceleration */}
                            <VitalCard
                                title="Acceleration"
                                value={
                                    latestVital.accelMagnitude !== null
                                        ? `${latestVital.accelMagnitude} m/s²`
                                        : "--"
                                }
                            />

                            {/* Gyroscope */}
                            <VitalCard
                                title="Gyroscope"
                                value={
                                    latestVital.gyroMagnitude !== null
                                        ? `${latestVital.gyroMagnitude} rad/s`
                                        : "--"
                                }
                            />

                        </div>

                    ) : (

                        <div className="border border-dashed rounded-2xl p-8 text-center text-gray-500">
                            <Activity size={35} className="mx-auto mb-3" />

                            <p className="font-medium">
                                No sensor reading available
                            </p>

                            <p className="text-sm mt-1">
                                Complete a 15-second measurement using the ESP32.
                            </p>
                        </div>

                    )}

                </div>

                {/* AI SUMMARY */}

                {/* AI SUMMARY */}

                <div className="mt-8 rounded-2xl border bg-gradient-to-r from-emerald-50 to-blue-50 p-6">

                    <div className="flex justify-between items-start flex-wrap gap-4">

                        <div>

                            <h2 className="text-2xl font-bold flex items-center gap-2">

                                <Brain size={26} />

                                Gemini AI Summary

                            </h2>

                            <p className="text-gray-500 mt-1">

                                Cached summaries load instantly.
                                Regenerate anytime for a fresh analysis.

                            </p>

                            {generatedAt && (

                                <p className="text-xs text-gray-400 mt-2">

                                    Last Generated :
                                    {" "}
                                    {generatedAt}

                                </p>

                            )}

                        </div>

                        <div className="flex gap-3">

                            <button

                                disabled={loadingAI}

                                onClick={() => generateAI(false)}

                                className={`px-5 py-2 rounded-xl text-white ${loadingAI
                                    ? "bg-gray-400"
                                    : "bg-[#2D6A4F]"
                                    }`}

                            >

                                {loadingAI
                                    ? "⏳ Generating..."
                                    : "Generate"}

                            </button>

                            <button

                                disabled={loadingAI}

                                onClick={() => generateAI(true)}

                                className={`px-5 py-2 rounded-xl text-white ${loadingAI
                                    ? "bg-gray-400"
                                    : "bg-blue-600"
                                    }`}

                            >

                                Regenerate

                            </button>

                        </div>

                    </div>

                    <div className="mt-6">

                        {aiSummary ? (

                            <div className="rounded-xl bg-white p-6 border">

                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => (
                                            <h1 className="text-2xl font-bold mb-4">
                                                {children}
                                            </h1>
                                        ),
                                        h2: ({ children }) => (
                                            <h2 className="text-xl font-bold mt-6 mb-3">
                                                {children}
                                            </h2>
                                        ),
                                        h3: ({ children }) => (
                                            <h3 className="text-lg font-bold mt-5 mb-2">
                                                {children}
                                            </h3>
                                        ),
                                        p: ({ children }) => (
                                            <p className="mb-3 leading-7">
                                                {children}
                                            </p>
                                        ),
                                        li: ({ children }) => (
                                            <li className="ml-6 list-disc mb-2">
                                                {children}
                                            </li>
                                        ),
                                        strong: ({ children }) => (
                                            <strong className="font-bold">
                                                {children}
                                            </strong>
                                        ),
                                    }}
                                >
                                    {aiSummary}
                                </ReactMarkdown>

                            </div>

                        ) : (

                            <div className="rounded-xl border border-dashed bg-white p-8 text-center text-gray-500">

                                No AI Summary generated yet.

                                <br />

                                Click <b>Generate</b> to create one.

                            </div>

                        )}

                    </div>

                </div>

                {/* LATEST PRESCRIPTION */}

                <div className="mt-8 bg-white border rounded-2xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold mb-5">
                        Latest Prescription
                    </h2>

                    {latestPrescription ? (
                        <>
                            <p>
                                <b>Doctor:</b>{" "}
                                {
                                    latestPrescription.doctor
                                        ?.displayName
                                }
                            </p>

                            <p className="mt-3">
                                <b>Diagnosis:</b>{" "}
                                {
                                    latestPrescription.diagnosis
                                }
                            </p>

                            <div className="mt-5">
                                <b>Medicines</b>

                                <ul className="list-disc ml-6 mt-3 space-y-2">
                                    {latestPrescription.medicines.map(
                                        (
                                            medicine,
                                            index
                                        ) => (
                                            <li
                                                key={index}
                                            >
                                                <b>
                                                    {
                                                        medicine.medicineName
                                                    }
                                                </b>

                                                {" — "}

                                                {
                                                    medicine.dosage
                                                }

                                                {" — "}

                                                {
                                                    medicine.frequency
                                                }

                                                {" — "}

                                                {
                                                    medicine.duration
                                                }
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500">
                            No prescriptions available.
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-4 mt-8">
                    <button
                        onClick={() =>
                            navigate(
                                `/health-card/${patient._id}`
                            )
                        }
                        className="bg-[#2D6A4F] text-white px-6 py-3 rounded-xl"
                    >
                        View Health Card
                    </button>

                    {canAddPrescription && (
                        <button
                            onClick={() =>
                                navigate(
                                    `/add-prescription/${patient._id}`
                                )
                            }
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl"
                        >
                            Add Prescription
                        </button>
                    )}

                    <button
                        onClick={() =>
                            navigate("/patients")
                        }
                        className="border px-6 py-3 rounded-xl"
                    >
                        Back
                    </button>
                </div>
            </div>



            <PrescriptionHistory patientId={patient._id} />

            <PatientTimeline patientId={patient._id} />
        </div>
    );
}

function Info({ title, value }) {
    return (
        <div className="border rounded-xl p-4">
            <p className="text-gray-500 text-sm">
                {title}
            </p>

            <p className="font-semibold text-lg">
                {value || "-"}
            </p>
        </div>
    );
}

function VitalCard({ icon, title, value }) {
    return (
        <div className="border rounded-2xl p-5 bg-gray-50">

            <div className="flex items-center gap-2 text-gray-500">
                {icon}
                <span className="text-sm">
                    {title}
                </span>
            </div>

            <p className="text-2xl font-bold mt-3">
                {value}
            </p>

        </div>
    );
}

