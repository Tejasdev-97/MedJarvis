import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import api from "../services/api";
import CreateProfileModal from "../components/users/CreateProfileModal";
import CreateAccountModal from "../components/users/CreateAccountModal";

export default function UsersPage() {

    const profile = JSON.parse(
        localStorage.getItem("profile") || "{}"
    );

    const [profiles, setProfiles] = useState([]);
    const [open, setOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    useEffect(() => {
        loadProfiles();
    }, []);

    async function loadProfiles() {

        try {

            const res = await api.get(
                `/auth/profiles/${profile.account}`
            );

            setProfiles(res.data.data);

        } catch (err) {

            console.log(err);

        }

    }

    return (

        <div>

            <div className="flex justify-between items-center mb-8">

                <div>

                    <h1 className="text-3xl font-bold">

                        Manage Profiles

                    </h1>

                    <p className="text-gray-500">

                        Profiles linked to this account

                    </p>

                </div>

                <div className="flex gap-3">

    <button
        onClick={() => setAccountOpen(true)}
        className="bg-blue-600 text-white px-5 py-3 rounded-xl"
    >
        New Account
    </button>

    <button
        onClick={() => setOpen(true)}
        className="bg-[#2D6A4F] text-white px-5 py-3 rounded-xl flex gap-2 items-center"
    >

        <Plus size={18} />

        Create Profile

    </button>

</div>

            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

                {profiles.map((item) => (

                    <div
                        key={item._id}
                        className="bg-white rounded-2xl shadow p-5"
                    >

                        <h2 className="text-xl font-bold">

                            {item.displayName}

                        </h2>

                        <p className="text-gray-500 mt-2">

                            {item.role}

                        </p>

                        <p className="mt-3">

                            Employee ID : {item.employeeId || "-"}

                        </p>

                        <p>

                            Hospital : {item.hospital || "-"}

                        </p>

                    </div>

                ))}

            </div>

            <CreateAccountModal
    open={accountOpen}
    onClose={() => setAccountOpen(false)}
/>

            <CreateProfileModal
                open={open}
                onClose={() => setOpen(false)}
                accountId={profile.account}
                onSuccess={loadProfiles}
            />

        </div>

    );

}