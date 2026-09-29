import { useEffect, useMemo, useState } from "react";
import { Search, Plus, RefreshCw, Eye, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import CreatePatientModal from "../components/patients/CreatePatientModal";

export default function PatientsPage() {
    const navigate = useNavigate();

    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        fetchPatients();
    }, []);

    async function fetchPatients(showRefresh = false) {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const res = await api.get("/patients");

            setPatients(
                Array.isArray(res.data?.data)
                    ? res.data.data
                    : []
            );
        } catch (err) {
            console.error("Fetch patients error:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load patients."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const filteredPatients = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) {
            return patients;
        }

        return patients.filter((patient) => {
            const fullName = `${patient?.firstName || ""} ${patient?.lastName || ""
                }`.toLowerCase();

            const medJarvisId = (
                patient?.medJarvisId || ""
            ).toLowerCase();

            return (
                fullName.includes(q) ||
                medJarvisId.includes(q)
            );
        });
    }, [patients, search]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="flex items-center gap-3 text-[#2D6A4F]">
                    <RefreshCw
                        size={22}
                        className="animate-spin"
                    />
                    <span className="text-lg font-semibold">
                        Loading Patients...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

                <div>
                    <h1 className="text-3xl font-bold text-[#1A1A1A]">
                        Patients
                    </h1>

                    <p className="text-[#4A4A4A] mt-1">
                        Manage registered patients and their medical records.
                    </p>
                </div>

                <div className="flex gap-3">

                    <button
                        type="button"
                        onClick={() => fetchPatients(true)}
                        disabled={refreshing}
                        className="border border-[#2D6A4F] text-[#2D6A4F] px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#D8F3DC] transition disabled:opacity-60"
                    >
                        <RefreshCw
                            size={18}
                            className={
                                refreshing
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={() => setOpenModal(true)}
                        className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-5 py-3 rounded-xl flex gap-2 items-center justify-center transition"
                    >
                        <Plus size={18} />
                        Add Patient
                    </button>

                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                    {error}
                </div>
            )}

            {/* SEARCH */}
            <div className="relative">

                <Search
                    size={18}
                    className="absolute left-4 top-3.5 text-gray-400"
                />

                <input
                    type="text"
                    placeholder="Search by Name or MedJarvis ID..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E8E0D5] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                />

            </div>

            {/* RESULT COUNT */}
            <div className="flex justify-between items-center">
                <p className="text-sm text-[#4A4A4A]">
                    Showing{" "}
                    <span className="font-semibold">
                        {filteredPatients.length}
                    </span>{" "}
                    patient
                    {filteredPatients.length !== 1
                        ? "s"
                        : ""}
                </p>
            </div>

            {/* PATIENT LIST */}
            {filteredPatients.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8E0D5] p-10 text-center">

                    <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#D8F3DC] flex items-center justify-center">
                        <Search
                            size={25}
                            className="text-[#2D6A4F]"
                        />
                    </div>

                    <h2 className="text-xl font-semibold">
                        No patients found
                    </h2>

                    <p className="text-[#4A4A4A] mt-2">
                        {search
                            ? "Try a different name or MedJarvis ID."
                            : "No patients have been registered yet."}
                    </p>

                    {!search && (
                        <button
                            type="button"
                            onClick={() =>
                                setOpenModal(true)
                            }
                            className="mt-5 bg-[#2D6A4F] text-white px-5 py-3 rounded-xl"
                        >
                            <span className="flex items-center gap-2">
                                <Plus size={18} />
                                Register First Patient
                            </span>
                        </button>
                    )}

                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-5">

                    {filteredPatients.map((patient) => (

                        <div
                            key={patient?._id}
                            className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-5 hover:shadow-md transition"
                        >

                            {/* NAME + STATUS */}
                            <div className="flex justify-between gap-4">

                                <div className="min-w-0">

                                    <h2 className="text-xl font-bold truncate">
                                        {patient?.firstName || "Unknown"}{" "}
                                        {patient?.lastName || ""}
                                    </h2>

                                    <p className="text-gray-500 text-sm mt-1 break-all">
                                        {patient?.medJarvisId ||
                                            "No MedJarvis ID"}
                                    </p>

                                </div>

                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full h-fit text-sm whitespace-nowrap">
                                    {patient?.status ||
                                        "Active"}
                                </span>

                            </div>

                            {/* PATIENT INFORMATION */}
                            <div className="grid grid-cols-2 gap-4 mt-5">

                                <div>
                                    <p className="text-gray-500 text-sm">
                                        Blood Group
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {patient?.bloodGroup ||
                                            "—"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-500 text-sm">
                                        Phone
                                    </p>

                                    <p className="font-semibold mt-1 break-all">
                                        {patient?.phone ||
                                            "—"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-500 text-sm">
                                        Village
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {patient?.village ||
                                            "—"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-500 text-sm">
                                        Emergency
                                    </p>

                                    <p className="font-semibold mt-1 break-all">
                                        {patient?.emergencyContact ||
                                            "—"}
                                    </p>
                                </div>

                            </div>

                            {/* ACTIONS */}
                            <div className="flex flex-col sm:flex-row gap-3 mt-6">

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/patient-summary/${patient._id}`
                                        )
                                    }
                                    className="flex-1 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl py-2.5 flex items-center justify-center gap-2 transition"
                                >
                                    <Eye size={17} />
                                    View Patient
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/health-card/${patient._id}`
                                        )
                                    }
                                    className="flex-1 border border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#D8F3DC] rounded-xl py-2.5 flex items-center justify-center gap-2 transition"
                                >
                                    <CreditCard size={17} />
                                    Health Card
                                </button>

                            </div>

                        </div>

                    ))}

                </div>
            )}

            {/* CREATE PATIENT MODAL */}
            <CreatePatientModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                onSuccess={() => {
                    setOpenModal(false);
                    fetchPatients();
                }}
            />

        </div>
    );
}