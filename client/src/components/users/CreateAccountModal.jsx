import { useState } from "react";
import api from "../../services/api";

export default function CreateAccountModal({
    open,
    onClose,
}) {

    const [form, setForm] = useState({
        phone: "",
        pin: "",
    });

    if (!open) return null;

    async function submit(e) {

        e.preventDefault();

        try {

            await api.post("/auth/register", form);

            alert(
    `Account Created\n\nPhone : ${form.phone}`
);

            setForm({
                phone: "",
                pin: "",
            });

            onClose();

        } catch (err) {

            alert(err.response?.data?.message || "Error");

        }

    }

    return (

        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">

            <form
                onSubmit={submit}
                className="bg-white rounded-2xl w-[450px] p-6 space-y-4"
            >

                <h2 className="text-2xl font-bold">

                    Create New Account

                </h2>

                <input
                    className="border rounded-xl p-3 w-full"
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={(e)=>
                        setForm({
                            ...form,
                            phone:e.target.value
                        })
                    }
                />

                <input
                    type="password"
                    className="border rounded-xl p-3 w-full"
                    placeholder="PIN"
                    value={form.pin}
                    onChange={(e)=>
                        setForm({
                            ...form,
                            pin:e.target.value
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