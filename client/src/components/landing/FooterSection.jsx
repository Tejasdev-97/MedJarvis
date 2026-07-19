import Logo from "../common/Logo";

export default function FooterSection({ darkMode }) {
    const quickLinks = [
        { label: "Home", href: "#home" },
        { label: "Features", href: "#features" },
        { label: "Workflow", href: "#workflow" },
        { label: "Roles", href: "#roles" }
    ];

    const services = [
        "AI Health Assistant",
        "QR Health Identity",
        "IoT Monitoring",
        "Emergency Support"
    ];

    const support = [
        "Help Center",
        "Privacy Policy",
        "Terms of Service",
        "Contact"
    ];

    return (
        <footer
            className={`
                pt-20
                pb-10
                px-6
                border-t
                ${
                    darkMode
                        ? "bg-[#0F172A] border-gray-800"
                        : "bg-gray-50 border-gray-200"
                }
            `}
        >
            <div className="max-w-7xl mx-auto">

                <div className="grid gap-12 lg:grid-cols-4">

                    {/* Brand */}

                    <div>

                        <Logo />

                        <p
                            className={`
                                mt-6
                                leading-7
                                ${
                                    darkMode
                                        ? "text-gray-400"
                                        : "text-gray-600"
                                }
                            `}
                        >
                            MedJarvis is an AI-powered healthcare platform
                            connecting patients, doctors, hospitals,
                            health workers and emergency services through
                            one secure digital ecosystem.
                        </p>

                    </div>

                    {/* Quick Links */}

                    <div>

                        <h3
                            className={`
                                text-xl
                                font-bold
                                ${
                                    darkMode
                                        ? "text-white"
                                        : "text-[#111827]"
                                }
                            `}
                        >
                            Quick Links
                        </h3>

                        <ul className="mt-6 space-y-4">

                            {quickLinks.map((link) => (

                                <li key={link.label}>

                                    <a
                                        href={link.href}
                                        className="
                                            text-gray-500
                                            transition
                                            hover:text-[#2D6A4F]
                                        "
                                    >
                                        {link.label}
                                    </a>

                                </li>

                            ))}

                        </ul>

                    </div>

                    {/* Services */}

                    <div>

                        <h3
                            className={`
                                text-xl
                                font-bold
                                ${
                                    darkMode
                                        ? "text-white"
                                        : "text-[#111827]"
                                }
                            `}
                        >
                            Services
                        </h3>

                        <ul className="mt-6 space-y-4">

                            {services.map((item) => (

                                <li
                                    key={item}
                                    className="text-gray-500"
                                >
                                    {item}
                                </li>

                            ))}

                        </ul>

                    </div>

                    {/* Support */}

                    <div>

                        <h3
                            className={`
                                text-xl
                                font-bold
                                ${
                                    darkMode
                                        ? "text-white"
                                        : "text-[#111827]"
                                }
                            `}
                        >
                            Support
                        </h3>

                        <ul className="mt-6 space-y-4">

                            {support.map((item) => (

                                <li
                                    key={item}
                                    className="text-gray-500"
                                >
                                    {item}
                                </li>

                            ))}

                        </ul>

                    </div>

                </div>

                {/* Bottom Bar */}

                <div
                    className={`
                        mt-16
                        pt-8
                        border-t
                        flex
                        flex-col
                        md:flex-row
                        justify-between
                        items-center
                        gap-4
                        ${
                            darkMode
                                ? "border-gray-800"
                                : "border-gray-200"
                        }
                    `}
                >

                    <p
                        className={`
                            text-sm
                            ${
                                darkMode
                                    ? "text-gray-400"
                                    : "text-gray-600"
                            }
                        `}
                    >
                        © {new Date().getFullYear()} MedJarvis. All rights reserved.
                    </p>

                    <p
                        className={`
                            text-sm
                            ${
                                darkMode
                                    ? "text-gray-400"
                                    : "text-gray-600"
                            }
                        `}
                    >
                        Built with ❤️ for accessible and intelligent healthcare.
                    </p>

                </div>

            </div>

        </footer>
    );
}