import {

    Outlet,
    NavLink,
    useNavigate,

} from "react-router-dom";

import { LogOut } from "lucide-react";

import Logo from "../components/common/Logo";

import { logout } from "../services/authService";
import { dashboardMenus } from "../data/dashboardMenu";

export default function DashboardLayout() {

    const navigate = useNavigate();

    const profile = JSON.parse(

        localStorage.getItem("profile") || "{}"

    );

    const role = profile.role || "Patient";

    const logoutUser = () => {

        logout();

        localStorage.removeItem("profile");

        localStorage.removeItem("profiles");

        navigate("/login");

    };

    const menu = dashboardMenus[role] || dashboardMenus.Patient;

    return (

        <div className="min-h-screen flex bg-[#FAF7F2]">

            <aside className="w-72 bg-white border-r border-[#E8E0D5] flex flex-col">

                <div className="p-6 border-b border-[#E8E0D5]">

                    <Logo />

                </div>

                <div className="px-6 py-4">

                    <p className="text-sm text-gray-500">

                        Logged in as

                    </p>

                    <h3 className="font-semibold">

                        {profile.displayName || "User"}

                    </h3>

                    <span className="text-sm text-[#2D6A4F]">

                        {role}

                    </span>

                </div>

                <nav className="flex-1 px-4">

                    {

                        menu.map((item) => {

                            const Icon = item.icon;

                            return (

                                <NavLink

                                    key={item.path}

                                    to={item.path}

                                    className={({ isActive }) =>

                                        `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition

                                        ${

                                            isActive

                                            ?

                                            "bg-[#2D6A4F] text-white"

                                            :

                                            "hover:bg-[#F3F3F3]"

                                        }`

                                    }

                                >

                                    <Icon size={20} />

                                    {item.label}

                                </NavLink>

                            );

                        })

                    }

                </nav>

                <div className="p-4 border-t border-[#E8E0D5]">

                    <button

                        onClick={logoutUser}

                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white py-3"

                    >

                        <LogOut size={18} />

                        Logout

                    </button>

                </div>

            </aside>

            <main className="flex-1 p-8 overflow-auto">

                <Outlet />

            </main>

        </div>

    );

}