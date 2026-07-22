import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

export default function AddPrescriptionPage() {
    const navigate = useNavigate();
    const { patientId } = useParams();

    const [form, setForm] = useState({
        diagnosis: "",
        notes: "",
        medicines: [
            {
                medicineName: "",
                dosage: "",
                frequency: "",
                duration: "",
            },
        ],
    });

    function changeMedicine(index, field, value) {
        const updated = [...form.medicines];
        updated[index][field] = value;

        setForm({
            ...form,
            medicines: updated,
        });
    }

    function addMedicine() {
        setForm({
            ...form,
            medicines: [
                ...form.medicines,
                {
                    medicineName: "",
                    dosage: "",
                    frequency: "",
                    duration: "",
                },
            ],
        });
    }

    async function savePrescription() {
        try {
            await api.post("/prescriptions", {
                patient: patientId,
                diagnosis: form.diagnosis,
                medicines: form.medicines,
                notes: form.notes,
            });

            alert("Prescription Added Successfully");

            navigate(`/patient-summary/${patientId}`);
        } catch (err) {
            alert(
                err.response?.data?.message ||
                    "Unable to save prescription."
            );
        }
    }

    return (
        <div className="max-w-5xl mx-auto">

            <h1 className="text-3xl font-bold mb-6">
                Add Prescription
            </h1>

            <div className="bg-white rounded-2xl shadow p-6">

                <label className="font-medium">
                    Diagnosis
                </label>

                <textarea
                    rows={3}
                    className="border rounded-lg p-3 w-full mt-2 mb-6"
                    value={form.diagnosis}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            diagnosis: e.target.value,
                        })
                    }
                />

                <h2 className="text-xl font-semibold mb-4">
                    Medicines
                </h2>

                {form.medicines.map((medicine, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-2 gap-4 mb-5 border rounded-xl p-4"
                    >
                        <input
                            placeholder="Medicine Name"
                            className="border rounded-lg p-3"
                            value={medicine.medicineName}
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
                            className="border rounded-lg p-3"
                            value={medicine.dosage}
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
                            className="border rounded-lg p-3"
                            value={medicine.frequency}
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
                            className="border rounded-lg p-3"
                            value={medicine.duration}
                            onChange={(e) =>
                                changeMedicine(
                                    index,
                                    "duration",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                ))}

                <button
                    onClick={addMedicine}
                    className="mb-6 bg-gray-200 px-5 py-2 rounded-lg"
                >
                    + Add Medicine
                </button>

                <label className="font-medium">
                    Doctor Notes
                </label>

                <textarea
                    rows={4}
                    className="border rounded-lg p-3 w-full mt-2"
                    value={form.notes}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            notes: e.target.value,
                        })
                    }
                />

                <div className="flex justify-end gap-4 mt-8">

                    <button
                        onClick={() =>
                            navigate(`/patient-summary/${patientId}`)
                        }
                        className="border px-6 py-3 rounded-lg"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={savePrescription}
                        className="bg-[#2D6A4F] text-white px-6 py-3 rounded-lg"
                    >
                        Save Prescription
                    </button>

                </div>

            </div>

        </div>
    );
}