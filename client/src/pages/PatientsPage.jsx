import { useEffect, useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import api from "../services/api";
import CreatePatientModal from "../components/patients/CreatePatientModal";

export default function PatientsPage() {

    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchPatients();
    }, []);

    async function fetchPatients() {

        try {

            const res = await api.get("/patients");

            setPatients(res.data.data || []);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    }

    const filteredPatients = useMemo(() => {

        const q = search.toLowerCase();

        return patients.filter((patient) => {

            const fullName =
                `${patient.firstName} ${patient.lastName}`.toLowerCase();

            return (
                fullName.includes(q) ||
                patient.medJarvisId.toLowerCase().includes(q)
            );

        });

    }, [patients, search]);

    if (loading) {

        return (
            <h2 className="text-xl font-semibold">
                Loading Patients...
            </h2>
        );

    }

    return (

        <div>

            <div className="flex justify-between items-center mb-8">

                <div>

                    <h1 className="text-3xl font-bold">
                        Patients
                    </h1>

                    <p className="text-gray-500">
                        Manage registered patients
                    </p>

                </div>

                <button
                    onClick={() => setOpenModal(true)}
                    className="bg-[#2D6A4F] text-white px-5 py-3 rounded-xl flex gap-2 items-center"
                >
                    <Plus size={18} />
                    Add Patient
                </button>

            </div>

            <div className="relative mb-8">

                <Search
                    size={18}
                    className="absolute left-4 top-3.5 text-gray-400"
                />

                <input
                    type="text"
                    placeholder="Search by Name or MedJarvis ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border"
                />

            </div>

            <div className="grid lg:grid-cols-2 gap-5">

                {filteredPatients.map((patient) => (

                    <div
                        key={patient._id}
                        className="bg-white rounded-2xl shadow border p-5"
                    >

                        <div className="flex justify-between">

                            <div>

                                <h2 className="text-xl font-bold">

                                    {patient.firstName} {patient.lastName}

                                </h2>

                                <p className="text-gray-500">

                                    {patient.medJarvisId}

                                </p>

                            </div>

                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full h-fit">

                                {patient.status}

                            </span>

                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-5">

                            <div>

                                <p className="text-gray-500 text-sm">

                                    Blood Group

                                </p>

                                <p className="font-semibold">

                                    {patient.bloodGroup}

                                </p>

                            </div>

                            <div>

                                <p className="text-gray-500 text-sm">

                                    Phone

                                </p>

                                <p className="font-semibold">

                                    {patient.phone}

                                </p>

                            </div>

                            <div>

                                <p className="text-gray-500 text-sm">

                                    Village

                                </p>

                                <p className="font-semibold">

                                    {patient.village}

                                </p>

                            </div>

                            <div>

                                <p className="text-gray-500 text-sm">

                                    Emergency

                                </p>

                                <p className="font-semibold">

                                    {patient.emergencyContact}

                                </p>

                            </div>

                        </div>

                        <div className="flex gap-3 mt-6">

                            <button
                                className="flex-1 bg-[#2D6A4F] text-white rounded-xl py-2"
                            >
                                View
                            </button>

                            <button
                                onClick={() =>
                                    window.location.href =
                                        "/health-card"
                                }
                                className="flex-1 border border-[#2D6A4F] text-[#2D6A4F] rounded-xl py-2"
                            >
                                Health Card
                            </button>

                        </div>

                    </div>

                ))}

                        </div>

            <CreatePatientModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                onSuccess={fetchPatients}
            />

        </div>

    );

}