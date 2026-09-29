import { useState } from "react";
import {
    NavLink,
    Outlet,
    useNavigate,
} from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    HeartPulse,
    LogOut,
    Menu,
    UserCircle,
    X,
} from "lucide-react";

import { logout } from "../services/authService";
import { dashboardMenus } from "../data/dashboardMenu";

export default function DashboardLayout() {
    const navigate = useNavigate();

    const [collapsed, setCollapsed] =
        useState(false);

    const [mobileOpen, setMobileOpen] =
        useState(false);

    const profile = JSON.parse(
        localStorage.getItem("profile") || "{}"
    );

    const role =
        profile.role ||
        "Patient";

    const menu =
        dashboardMenus[role] ||
        dashboardMenus.Patient;

    const logoutUser = () => {
        logout();

        localStorage.removeItem(
            "profile"
        );

        localStorage.removeItem(
            "profiles"
        );

        navigate("/login");
    };

    const closeMobileMenu = () => {
        setMobileOpen(false);
    };

    return (
        <div className="min-h-dvh bg-[#FAF7F2] text-gray-900">

            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={
                        closeMobileMenu
                    }
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] md:hidden"
                />
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 flex h-dvh flex-col
                    border-r border-[#E8E0D5] bg-white shadow-sm
                    transition-all duration-300 ease-in-out
                    md:translate-x-0
                    ${collapsed
                        ? "md:w-[76px]"
                        : "md:w-[272px]"
                    }
                    w-[272px]
                    ${mobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                    }
                `}
            >

                <div
                    className={`
                        flex h-[72px] shrink-0 items-center border-b border-[#E3E7E4]
                        ${collapsed
                            ? "justify-center px-2"
                            : "justify-between px-4"
                        }
                    `}
                >
                    {collapsed ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E5F6EA] text-[#164B45]">
                            <HeartPulse size={22} strokeWidth={2.2} />
                        </div>
                    ) : (
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E5F6EA] text-[#164B45]">
                                <HeartPulse size={23} strokeWidth={2.2} />
                            </div>

                            <div className="min-w-0 leading-none">
                                <p className="truncate text-[21px] font-bold tracking-tight text-[#164B45]">
                                    MedJarvis
                                </p>

                                <p className="mt-1 truncate text-[11px] font-medium tracking-wide text-[#52645E]">
                                    Health Intelligence
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            setCollapsed(
                                (value) =>
                                    !value
                            )
                        }
                        aria-label={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        title={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        className={`
                            hidden h-8 w-8 shrink-0 items-center justify-center
                            rounded-lg bg-[#164B45] text-white
                            transition hover:bg-[#1B4332] md:flex
                            ${collapsed
                                ? ""
                                : "ml-2"
                            }
                        `}
                    >
                        {collapsed ? (
                            <ChevronRight
                                size={16}
                            />
                        ) : (
                            <ChevronLeft
                                size={16}
                            />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={
                            closeMobileMenu
                        }
                        aria-label="Close sidebar"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div
                    className={`
                        shrink-0 border-b border-[#E8E0D5]
                        ${collapsed
                            ? "px-2 py-4"
                            : "px-4 py-3"
                        }
                    `}
                >
                    {collapsed ? (
                        <div className="flex justify-center">
                            <div
                                title={`${profile.displayName || "User"} • ${role}`}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF3EF] text-[#2D6A4F]"
                            >
                                <UserCircle
                                    size={23}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF3EF] text-[#2D6A4F]">
                                <UserCircle
                                    size={24}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="text-[10px] font-medium text-gray-600">
                                    Logged in as
                                </p>

                                <h3 className="truncate text-sm font-semibold text-gray-900">
                                    {profile.displayName ||
                                        "User"}
                                </h3>

                                <span className="text-[11px] font-semibold text-[#2D6A4F]">
                                    {role}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <nav
                    className={`
                        min-h-0 flex-1 overflow-hidden
                        ${collapsed
                            ? "px-2 py-4"
                            : "px-4 py-4"
                        }
                    `}
                >
                    <div className="space-y-1">
                        {menu.map(
                            (item) => {
                                const Icon =
                                    item.icon;

                                return (
                                    <NavLink
                                        key={
                                            item.path
                                        }
                                        to={
                                            item.path
                                        }
                                        onClick={
                                            closeMobileMenu
                                        }
                                        title={
                                            collapsed
                                                ? item.label
                                                : undefined
                                        }
                                        className={({
                                            isActive,
                                        }) =>
                                            `
                                            group flex items-center rounded-xl
                                            transition-all duration-200
                                            ${collapsed
                                                ? "h-11 justify-center px-2"
                                                : "min-h-11 gap-3 px-3"
                                            }
                                            ${isActive
                                                ? "bg-[#2D6A4F] text-white shadow-sm"
                                                : "text-gray-700 hover:bg-[#F2F7F4] hover:text-[#1B4332]"
                                            }
                                            `
                                        }
                                    >
                                        <Icon
                                            size={19}
                                            strokeWidth={
                                                2
                                            }
                                            className="shrink-0"
                                        />

                                        {!collapsed && (
                                            <span className="truncate text-sm font-medium">
                                                {
                                                    item.label
                                                }
                                            </span>
                                        )}
                                    </NavLink>
                                );
                            }
                        )}
                    </div>
                </nav>

                <div
                    className={`
                        mt-auto shrink-0 border-t border-[#E8E0D5]
                        ${collapsed
                            ? "p-3"
                            : "p-4"
                        }
                    `}
                >
                    <button
                        type="button"
                        onClick={
                            logoutUser
                        }
                        title={
                            collapsed
                                ? "Logout"
                                : undefined
                        }
                        className={`
                            flex w-full items-center rounded-xl
                            bg-red-600 py-3 text-sm font-medium text-white
                            transition hover:bg-red-700
                            ${collapsed
                                ? "justify-center px-2"
                                : "justify-center gap-2 px-4"
                            }
                        `}
                    >
                        <LogOut
                            size={18}
                        />

                        {!collapsed && (
                            <span>
                                Logout
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            <main
                className={`
                    min-h-dvh
                    transition-[margin-left] duration-300 ease-in-out
                    ${collapsed
                        ? "md:ml-[76px]"
                        : "md:ml-[272px]"
                    }
                `}
            >
                <div className="sticky top-0 z-30 flex h-14 items-center border-b border-[#E8E0D5] bg-[#FAF7F2]/95 px-4 backdrop-blur md:hidden">
                    <button
                        type="button"
                        onClick={() =>
                            setMobileOpen(
                                true
                            )
                        }
                        aria-label="Open navigation"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2D6A4F] shadow-sm ring-1 ring-[#E8E0D5]"
                    >
                        <Menu size={21} />
                    </button>

                    <div className="ml-3 flex items-center gap-2">
                        <HeartPulse
                            size={18}
                            className="text-[#2D6A4F]"
                        />

                        <span className="text-sm font-semibold text-gray-900">
                            MedJarvis
                        </span>
                    </div>
                </div>

                <div className="h-[calc(100dvh-56px)] overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 md:h-dvh lg:h-dvh lg:px-8 lg:py-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}