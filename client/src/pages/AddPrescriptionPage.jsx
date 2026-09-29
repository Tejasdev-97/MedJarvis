import { useState } from "react";
import {
    Plus,
    Trash2,
    Save,
    Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const emptyMedicine = {
    medicineName: "",
    dosage: "",
    frequency: "",
    duration: "",
};

export default function AddPrescriptionPage() {
    const navigate = useNavigate();
    const { patientId } = useParams();

    const [form, setForm] = useState({
        diagnosis: "",
        notes: "",
        medicines: [{ ...emptyMedicine }],
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function changeMedicine(index, field, value) {
        setForm((previous) => {
            const medicines = [...previous.medicines];

            medicines[index] = {
                ...medicines[index],
                [field]: value,
            };

            return {
                ...previous,
                medicines,
            };
        });
    }

    function addMedicine() {
        setForm((previous) => ({
            ...previous,
            medicines: [
                ...previous.medicines,
                { ...emptyMedicine },
            ],
        }));
    }

    function removeMedicine(index) {
        setForm((previous) => {
            if (previous.medicines.length === 1) {
                return previous;
            }

            return {
                ...previous,
                medicines: previous.medicines.filter(
                    (_, medicineIndex) =>
                        medicineIndex !== index
                ),
            };
        });
    }

    async function savePrescription(e) {
        e.preventDefault();

        setError("");

        if (!patientId) {
            setError("Patient ID is missing.");
            return;
        }

        if (!form.diagnosis.trim()) {
            setError("Please enter the diagnosis.");
            return;
        }

        const validMedicines = form.medicines.filter(
            (medicine) =>
                medicine.medicineName.trim()
        );

        if (validMedicines.length === 0) {
            setError(
                "Please add at least one medicine."
            );
            return;
        }

        try {
            setLoading(true);

            await api.post("/prescriptions", {
                patient: patientId,
                diagnosis: form.diagnosis.trim(),
                medicines: validMedicines,
                notes: form.notes.trim(),
            });

            alert(
                "Prescription Added Successfully"
            );

            navigate(
                `/patient-summary/${patientId}`
            );
        } catch (err) {
            console.error(
                "Save prescription error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to save prescription."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto">

            <div className="mb-6">
                <h1 className="text-3xl font-bold">
                    Add Prescription
                </h1>

                <p className="text-[#4A4A4A] mt-1">
                    Add diagnosis, medicines and doctor notes
                    to the patient's medical record.
                </p>
            </div>

            {error && (
                <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                    {error}
                </div>
            )}

            <form
                onSubmit={savePrescription}
                className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-6 md:p-8"
            >

                {/* DIAGNOSIS */}
                <div>
                    <label className="font-medium">
                        Diagnosis
                    </label>

                    <textarea
                        rows={3}
                        className="border border-[#E8E0D5] rounded-lg p-3 w-full mt-2 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                        value={form.diagnosis}
                        onChange={(e) =>
                            setForm((previous) => ({
                                ...previous,
                                diagnosis:
                                    e.target.value,
                            }))
                        }
                        placeholder="Enter diagnosis..."
                    />
                </div>

                {/* MEDICINES */}
                <div className="mt-7">

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

                        <h2 className="text-xl font-semibold">
                            Medicines
                        </h2>

                        <button
                            type="button"
                            onClick={addMedicine}
                            className="bg-[#D8F3DC] text-[#2D6A4F] px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-[#c5e9cc] transition"
                        >
                            <Plus size={18} />
                            Add Medicine
                        </button>

                    </div>

                    <div className="space-y-4">

                        {form.medicines.map(
                            (medicine, index) => (
                                <div
                                    key={index}
                                    className="border border-[#E8E0D5] rounded-xl p-4"
                                >

                                    <div className="flex justify-between items-center mb-4">

                                        <h3 className="font-semibold">
                                            Medicine{" "}
                                            {index + 1}
                                        </h3>

                                        {form.medicines.length >
                                            1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeMedicine(
                                                            index
                                                        )
                                                    }
                                                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                                                    title="Remove medicine"
                                                >
                                                    <Trash2
                                                        size={18}
                                                    />
                                                </button>
                                            )}

                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">

                                        <input
                                            placeholder="Medicine Name"
                                            className="border border-[#E8E0D5] rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                                            value={
                                                medicine.medicineName
                                            }
                                            onChange={(e) =>
                                                changeMedicine(
                                                    index,
                                                    "medicineName",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            placeholder="Dosage"
                                            className="border border-[#E8E0D5] rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                                            value={
                                                medicine.dosage
                                            }
                                            onChange={(e) =>
                                                changeMedicine(
                                                    index,
                                                    "dosage",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            placeholder="Frequency"
                                            className="border border-[#E8E0D5] rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                                            value={
                                                medicine.frequency
                                            }
                                            onChange={(e) =>
                                                changeMedicine(
                                                    index,
                                                    "frequency",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            placeholder="Duration"
                                            className="border border-[#E8E0D5] rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                                            value={
                                                medicine.duration
                                            }
                                            onChange={(e) =>
                                                changeMedicine(
                                                    index,
                                                    "duration",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>
                            )
                        )}

                    </div>

                </div>

                {/* NOTES */}
                <div className="mt-7">

                    <label className="font-medium">
                        Doctor Notes
                    </label>

                    <textarea
                        rows={4}
                        className="border border-[#E8E0D5] rounded-lg p-3 w-full mt-2 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                        value={form.notes}
                        onChange={(e) =>
                            setForm((previous) => ({
                                ...previous,
                                notes: e.target.value,
                            }))
                        }
                        placeholder="Additional instructions or notes..."
                    />

                </div>

                {/* ACTIONS */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/patient-summary/${patientId}`
                            )
                        }
                        disabled={loading}
                        className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2
                                    size={19}
                                    className="animate-spin"
                                />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={19} />
                                Save Prescription
                            </>
                        )}
                    </button>

                </div>

            </form>

        </div>
    );
}