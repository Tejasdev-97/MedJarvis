import { useState } from "react";
import api from "../../services/api";

export default function CreatePatientModal({

    open,
    onClose,
    onSuccess,

}) {

    const [form, setForm] = useState({

        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "Male",
        bloodGroup: "B+",
        phone: "",
        emergencyContact: "",
        village: "",
        address: "",
        district: "",
        state: "Karnataka",
        pincode: "",

    });

    const change = (e) => {

        setForm({

            ...form,

            [e.target.name]: e.target.value,

        });

    };

    async function savePatient() {

    try {

        const today = new Date();

        const dob = new Date(form.dateOfBirth);

        let age =
            today.getFullYear() -
            dob.getFullYear();

        const month =
            today.getMonth() -
            dob.getMonth();

        if (
            month < 0 ||
            (month === 0 &&
                today.getDate() < dob.getDate())
        ) {
            age--;
        }

        await api.post("/patients", {
            ...form,
            age,
        });

        alert("Patient Created Successfully");

        onSuccess();

        onClose();

    } catch (err) {

        alert(
            err.response?.data?.message ||
            "Unable to create patient."
        );

    }

}

    if (!open) return null;

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">

                <h2 className="text-2xl font-bold mb-5">

                    Register Patient

                </h2>

                <div className="grid grid-cols-2 gap-4">

                    <input
                        name="firstName"
                        placeholder="First Name"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                    <input
                        name="lastName"
                        placeholder="Last Name"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                    <input
                        name="dateOfBirth"
                        type="date"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                    <select
    name="gender"
    value={form.gender}
    onChange={change}
    className="border rounded-lg p-3"
>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>

                    <select
    name="bloodGroup"
    value={form.bloodGroup}
    onChange={change}
    className="border rounded-lg p-3"
>
    <option value="A+">A+</option>
    <option value="A-">A-</option>
    <option value="B+">B+</option>
    <option value="B-">B-</option>
    <option value="AB+">AB+</option>
    <option value="AB-">AB-</option>
    <option value="O+">O+</option>
    <option value="O-">O-</option>
</select>

                    <input
                        name="phone"
                        placeholder="Phone"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                    <input
                        name="emergencyContact"
                        placeholder="Emergency Contact"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                    <input
                        name="village"
                        placeholder="Village"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                    <input
                        name="district"
                        placeholder="District"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                    <input
                        name="pincode"
                        placeholder="Pincode"
                        onChange={change}
                        className="border rounded-lg p-3"
                    />

                </div>

                <textarea
                    name="address"
                    placeholder="Address"
                    rows="3"
                    onChange={change}
                    className="border rounded-lg p-3 mt-4 w-full"
                />

                <div className="flex justify-end gap-3 mt-6">

                    <button

                        onClick={onClose}

                        className="px-5 py-2 border rounded-lg"

                    >

                        Cancel

                    </button>

                    <button

                        onClick={savePatient}

                        className="px-6 py-2 bg-[#2D6A4F] text-white rounded-lg"

                    >

                        Save Patient

                    </button>

                </div>

            </div>

        </div>

    );

}