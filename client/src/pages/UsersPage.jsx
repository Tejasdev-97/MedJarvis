import { useEffect, useState } from "react";
import {
    Plus,
    RefreshCw,
    Users,
    UserRound,
} from "lucide-react";

import api from "../services/api";
import CreateProfileModal from "../components/users/CreateProfileModal";
import CreateAccountModal from "../components/users/CreateAccountModal";

export default function UsersPage() {
    const [profile, setProfile] = useState({});

    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [open, setOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    useEffect(() => {
        try {
            const stored = JSON.parse(
                localStorage.getItem("profile") || "{}"
            );

            setProfile(stored);
        } catch {
            setProfile({});
        }
    }, []);

    useEffect(() => {
        if (profile.account) {
            loadProfiles();
        }
    }, [profile.account]);

    async function loadProfiles(showRefresh = false) {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const res = await api.get(
                `/auth/profiles/${profile.account}`
            );

            setProfiles(
                Array.isArray(res.data?.data)
                    ? res.data.data
                    : []
            );
        } catch (err) {
            console.error(
                "Load profiles error:",
                err
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const role = profile.role || "Patient";

    const canManageUsers =
        role === "Super Admin" ||
        role === "Hospital Manager";

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">

                <div className="flex items-center gap-3 text-[#2D6A4F]">

                    <RefreshCw
                        size={22}
                        className="animate-spin"
                    />

                    <span className="font-semibold">
                        Loading profiles...
                    </span>

                </div>

            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

                <div className="flex items-center gap-3">

                    <div className="w-12 h-12 rounded-xl bg-[#D8F3DC] flex items-center justify-center">
                        <Users
                            size={24}
                            className="text-[#2D6A4F]"
                        />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold">
                            Manage Profiles
                        </h1>

                        <p className="text-gray-500 mt-1">
                            Profiles linked to this account.
                        </p>
                    </div>

                </div>

                <div className="flex flex-wrap gap-3">

                    <button
                        type="button"
                        onClick={() =>
                            loadProfiles(true)
                        }
                        disabled={refreshing}
                        className="border border-[#2D6A4F] text-[#2D6A4F] px-4 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60"
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

                    {canManageUsers && (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    setAccountOpen(true)
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                            >
                                New Account
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setOpen(true)
                                }
                                className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-5 py-3 rounded-xl flex gap-2 items-center"
                            >
                                <Plus size={18} />
                                Create Profile
                            </button>
                        </>
                    )}

                </div>

            </div>

            {/* ROLE INFO */}
            <div className="bg-[#F7FAF8] border rounded-xl p-4">

                <p className="text-sm text-gray-600">
                    Signed in as{" "}
                    <span className="font-semibold text-[#2D6A4F]">
                        {role}
                    </span>
                </p>

            </div>

            {/* PROFILE CARDS */}
            {profiles.length === 0 ? (
                <div className="bg-white rounded-2xl border p-10 text-center">

                    <UserRound
                        size={42}
                        className="mx-auto text-gray-400"
                    />

                    <h2 className="text-xl font-semibold mt-4">
                        No profiles found
                    </h2>

                    <p className="text-gray-500 mt-2">
                        No linked profiles are currently available.
                    </p>

                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

                    {profiles.map((item) => (

                        <div
                            key={item._id}
                            className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] p-5"
                        >

                            <div className="flex items-start justify-between gap-3">

                                <div>
                                    <h2 className="text-xl font-bold">
                                        {item.displayName ||
                                            "Unnamed Profile"}
                                    </h2>

                                    <p className="text-[#2D6A4F] font-medium mt-1">
                                        {item.role ||
                                            "Unknown Role"}
                                    </p>
                                </div>

                                <UserRound
                                    size={22}
                                    className="text-gray-400"
                                />

                            </div>

                            <div className="mt-5 space-y-2 text-sm">

                                <p>
                                    <span className="text-gray-500">
                                        Employee ID:
                                    </span>{" "}
                                    <span className="font-medium">
                                        {item.employeeId ||
                                            "—"}
                                    </span>
                                </p>

                                <p>
                                    <span className="text-gray-500">
                                        Hospital:
                                    </span>{" "}
                                    <span className="font-medium">
                                        {item.hospital ||
                                            "—"}
                                    </span>
                                </p>

                            </div>

                        </div>

                    ))}

                </div>
            )}

            {/* MODALS */}
            {canManageUsers && (
                <>
                    <CreateAccountModal
                        open={accountOpen}
                        onClose={() =>
                            setAccountOpen(false)
                        }
                    />

                    <CreateProfileModal
                        open={open}
                        onClose={() =>
                            setOpen(false)
                        }
                        accountId={profile.account}
                        onSuccess={() => {
                            setOpen(false);
                            loadProfiles();
                        }}
                    />
                </>
            )}

        </div>
    );
}