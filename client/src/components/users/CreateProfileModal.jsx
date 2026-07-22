import { useState } from "react";
import api from "../../services/api";

export default function CreateProfileModal({
    open,
    onClose,
    onSuccess,
}) {

    const [form, setForm] = useState({
        phone: "",
        displayName: "",
        role: "",
        employeeId: "",
        hospital: "",
    });

    if (!open) return null;

    async function submit(e) {

        e.preventDefault();

        try {

            await api.post("/auth/create-profile", form);

            alert("Profile created successfully.");

            setForm({
                phone: "",
                displayName: "",
                role: "",
                employeeId: "",
                hospital: "",
            });

            onSuccess();
            onClose();

        } catch (err) {

            alert(err.response?.data?.message || "Error");

        }

    }

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

            <form
                onSubmit={submit}
                className="bg-white rounded-2xl p-6 w-[500px] space-y-4"
            >

                <h2 className="text-2xl font-bold">

                    Create Profile

                </h2>

                <input
                    placeholder="Phone Number"
                    className="border rounded-xl w-full p-3"
                    value={form.phone}
                    onChange={(e)=>
                        setForm({
                            ...form,
                            phone:e.target.value
                        })
                    }
                />

                <input
                    placeholder="Display Name"
                    className="border rounded-xl w-full p-3"
                    value={form.displayName}
                    onChange={(e)=>
                        setForm({
                            ...form,
                            displayName:e.target.value
                        })
                    }
                />

                <select
                    className="border rounded-xl w-full p-3"
                    value={form.role}
                    onChange={(e)=>
                        setForm({
                            ...form,
                            role:e.target.value
                        })
                    }
                >

                    <option value="">Select Role</option>
                    <option>Doctor</option>
                    <option>Health Worker</option>
                    <option>Ambulance Staff</option>
                    <option>Hospital Manager</option>
                    <option>Patient</option>

                </select>

                <input
                    placeholder="Employee ID"
                    className="border rounded-xl w-full p-3"
                    value={form.employeeId}
                    onChange={(e)=>
                        setForm({
                            ...form,
                            employeeId:e.target.value
                        })
                    }
                />

                <input
                    placeholder="Hospital"
                    className="border rounded-xl w-full p-3"
                    value={form.hospital}
                    onChange={(e)=>
                        setForm({
                            ...form,
                            hospital:e.target.value
                        })
                    }
                />

                <div className="flex justify-end gap-3">

                    <button
                        type="button"
                        onClick={onClose}
                        className="border rounded-xl px-5 py-2"
                    >
                        Cancel
                    </button>

                    <button
                        className="bg-[#2D6A4F] text-white rounded-xl px-5 py-2"
                    >
                        Create
                    </button>

                </div>

            </form>

        </div>

    );

}