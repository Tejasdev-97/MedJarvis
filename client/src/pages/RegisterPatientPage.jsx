import { useState } from "react";
import api from "../services/api";
import FormInput from "../components/forms/FormInput";

export default function RegisterPatientPage() {

    const [form, setForm] = useState({
        phone: "",
        firstName: "",
        lastName: "",
        age: "",
        gender: "",
        bloodGroup: "",
        village: "",
    });

    async function registerPatient() {

        try {

            const res = await api.post(
                "/patients",
                form
            );

            alert(res.data.message);

            setForm({
                phone: "",
                firstName: "",
                lastName: "",
                age: "",
                gender: "",
                bloodGroup: "",
                village: "",
            });

        } catch (err) {

            alert(
                err.response?.data?.message || "Error"
            );

        }

    }

    return (

        <div className="bg-white rounded-2xl shadow p-8">

            <h1 className="text-3xl font-bold mb-6">

                Register Patient

            </h1>

            <form className="grid md:grid-cols-2 gap-5">

                <FormInput
                    label="First Name"
                    value={form.firstName}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            firstName: e.target.value,
                        })
                    }
                />

                <FormInput
                    label="Last Name"
                    value={form.lastName}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            lastName: e.target.value,
                        })
                    }
                />

                <FormInput
                    label="Phone Number"
                    value={form.phone}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            phone: e.target.value,
                        })
                    }
                />

                <FormInput
                    label="Age"
                    value={form.age}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            age: e.target.value,
                        })
                    }
                />

                <FormInput
                    label="Gender"
                    value={form.gender}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            gender: e.target.value,
                        })
                    }
                />

                <FormInput
                    label="Blood Group"
                    value={form.bloodGroup}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            bloodGroup: e.target.value,
                        })
                    }
                />

                <FormInput
                    label="Village"
                    value={form.village}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            village: e.target.value,
                        })
                    }
                />

            </form>

            <button
                type="button"
                onClick={registerPatient}
                className="mt-8 bg-[#2D6A4F] text-white px-6 py-3 rounded-xl"
            >

                Register Patient

            </button>

        </div>

    );

}