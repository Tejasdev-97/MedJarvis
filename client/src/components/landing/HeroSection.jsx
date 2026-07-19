import {
    Activity,
    Bot,
    Globe,
    HeartPulse,
    ShieldCheck,
    Wifi,
    Zap
} from "lucide-react";

import Button from "../common/Button";

export default function HeroSection({ darkMode, navigate }) {
    return (
        <section
    id="home"
    className="
        relative
        scroll-mt-24
        pt-36
        pb-24
        px-6
    "
>
            <div className="max-w-7xl mx-auto">

                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* ================= LEFT ================= */}

                    <div>

                        {/* Badge */}

                        <div
                            className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-full
                                border
                                border-green-200
                                bg-green-50
                                px-4
                                py-2
                                text-sm
                                font-semibold
                                text-[#2D6A4F]
                                shadow-sm
                            "
                        >
                            <ShieldCheck size={18} />

                            Trusted AI Healthcare Platform

                        </div>

                        {/* Heading */}

                        <h1
                            className={`
                                mt-8
                                text-5xl
                                lg:text-7xl
                                font-extrabold
                                leading-tight
                                ${
                                    darkMode
                                        ? "text-white"
                                        : "text-[#111827]"
                                }
                            `}
                        >

                            Smarter Healthcare.

                            <br />

                            <span className="text-[#2D6A4F]">

                                Powered by AI.

                            </span>

                            <br />

                            Designed for Everyone.

                        </h1>

                        {/* Description */}

                        <p
                            className={`
                                mt-8
                                max-w-xl
                                text-lg
                                leading-8
                                ${
                                    darkMode
                                        ? "text-gray-300"
                                        : "text-[#4B5563]"
                                }
                            `}
                        >

                            MedJarvis connects patients,
                            doctors,
                            hospitals,
                            ambulances,
                            and healthcare professionals
                            through one intelligent platform
                            powered by AI,
                            IoT,
                            and secure digital health
                            services.

                        </p>

                        {/* Buttons */}

                        <div className="mt-10 flex flex-wrap gap-4">

                            <Button
                                onClick={() => navigate("/login")}
                            >
                                Get Started
                            </Button>

                            <button
                                className="
                                    rounded-xl
                                    border
                                    border-[#2D6A4F]
                                    px-7
                                    py-3
                                    font-semibold
                                    text-[#2D6A4F]
                                    transition
                                    hover:bg-[#2D6A4F]
                                    hover:text-white
                                "
                            >

                                Explore Features

                            </button>

                        </div>

                        {/* Badges */}

<div className="mt-10 flex flex-wrap gap-4">

    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">

        <ShieldCheck
            size={18}
            className="text-[#2D6A4F]"
        />

        <span>Secure QR Identity</span>

    </div>

    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">

        <Bot
            size={18}
            className="text-[#2D6A4F]"
        />

        <span>AI Powered</span>

    </div>

    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">

        <Wifi
            size={18}
            className="text-[#2D6A4F]"
        />

        <span>IoT Connected</span>

    </div>

    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">

        <Globe
            size={18}
            className="text-[#2D6A4F]"
        />

        <span>Multilingual</span>

    </div>

</div>

                        {/* Status */}

                        <div className="mt-12 flex flex-wrap items-center gap-8">

                            <div className="flex items-center gap-3">

                                <span
                                    className="
                                        h-3
                                        w-3
                                        rounded-full
                                        bg-green-500
                                        animate-pulse
                                    "
                                />

                                <div>

                                    <p className="font-semibold text-[#111827]">

                                        System Online

                                    </p>

                                    <p className="text-sm text-gray-500">

                                        All healthcare services operational

                                    </p>

                                </div>

                            </div>

                            <div className="flex items-center gap-3">

                                <Zap
    size={22}
    className="text-[#2D6A4F]"
/>

                                <div>

                                    <p className="font-semibold text-[#111827]">

                                        Emergency Ready

                                    </p>

                                    <p className="text-sm text-gray-500">

                                        24×7 AI Monitoring

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* ================= RIGHT ================= */}

                    <div className="relative flex justify-center">
                                                {/* Floating Badge */}

                        <div
                            className="
                                absolute
                                -top-6
                                right-10
                                z-20
                                rounded-full
                                bg-green-500
                                px-4
                                py-2
                                text-sm
                                font-semibold
                                text-white
                                shadow-xl
                                animate-pulse
                            "
                        >
                            ● Live Monitoring
                        </div>

                        {/* Dashboard */}

                        <div
                            className="
                                w-full
                                max-w-md
                                rounded-3xl
                                bg-white
                                p-6
                                shadow-2xl
                                border
                                border-gray-100
                            "
                        >

                            {/* Header */}

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-gray-500">

                                        Health Dashboard

                                    </p>

                                    <h3 className="text-2xl font-bold text-[#111827]">

                                        Patient Status

                                    </h3>

                                </div>

                                <div className="rounded-xl bg-green-100 p-3">

                                    <HeartPulse
                                        size={28}
                                        className="text-[#2D6A4F]"
                                    />

                                </div>

                            </div>

                            {/* Vitals */}

                            <div className="mt-8 grid grid-cols-2 gap-4">

                                <div className="rounded-2xl bg-red-50 p-5">

                                    <p className="text-sm text-gray-500">

                                        Heart Rate

                                    </p>

                                    <h2 className="mt-2 text-3xl font-bold text-red-600">

                                        72

                                    </h2>

                                    <p className="text-sm text-gray-500">

                                        BPM

                                    </p>

                                </div>

                                <div className="rounded-2xl bg-blue-50 p-5">

                                    <p className="text-sm text-gray-500">

                                        SpO₂

                                    </p>

                                    <h2 className="mt-2 text-3xl font-bold text-blue-600">

                                        98%

                                    </h2>

                                    <p className="text-sm text-gray-500">

                                        Oxygen

                                    </p>

                                </div>

                                <div className="rounded-2xl bg-orange-50 p-5">

                                    <p className="text-sm text-gray-500">

                                        Temperature

                                    </p>

                                    <h2 className="mt-2 text-3xl font-bold text-orange-500">

                                        36.8°

                                    </h2>

                                    <p className="text-sm text-gray-500">

                                        Celsius

                                    </p>

                                </div>

                                <div className="rounded-2xl bg-green-50 p-5">

                                    <p className="text-sm text-gray-500">

                                        Blood Pressure

                                    </p>

                                    <h2 className="mt-2 text-3xl font-bold text-green-600">

                                        120/80

                                    </h2>

                                    <p className="text-sm text-gray-500">

                                        Normal

                                    </p>

                                </div>

                            </div>

                            {/* AI Status */}

                            <div
                                className="
                                    mt-6
                                    rounded-2xl
                                    border
                                    border-green-100
                                    bg-green-50
                                    p-5
                                "
                            >

                                <div className="flex items-center justify-between">

                                    <div>

                                        <p className="text-sm text-gray-500">

                                            AI Health Analysis

                                        </p>

                                        <h4 className="mt-1 text-lg font-bold text-[#111827]">

                                            Stable Condition

                                        </h4>

                                    </div>

                                    <Activity
                                        size={30}
                                        className="text-[#2D6A4F]"
                                    />

                                </div>

                                <div className="mt-4 h-2 rounded-full bg-green-100">

                                    <div
                                        className="
                                            h-2
                                            w-[92%]
                                            rounded-full
                                            bg-green-500
                                        "
                                    />

                                </div>

                                <p className="mt-2 text-sm text-gray-500">

                                    AI Confidence • 92%

                                </p>

                            </div>

                            {/* QR Card */}

                            <div
                                className="
                                    mt-6
                                    rounded-2xl
                                    bg-gradient-to-r
                                    from-[#2D6A4F]
                                    to-[#3A7D61]
                                    p-5
                                    text-white
                                "
                            >

                                <div className="flex items-center justify-between">

                                    <div>

                                        <p className="text-sm opacity-90">

                                            Digital Health Identity

                                        </p>

                                        <h4 className="mt-1 text-xl font-bold">

                                            QR Health Card

                                        </h4>

                                    </div>

                                    <ShieldCheck size={34} />

                                </div>

                                <div className="mt-6 flex items-center justify-between">

                                    <div>

                                        <p className="text-xs opacity-80">

                                            Secure • Encrypted

                                        </p>

                                        <p className="font-semibold">

                                            MJ-2026-45891

                                        </p>

                                    </div>

                                    <div
                                        className="
                                            h-16
                                            w-16
                                            rounded-lg
                                            bg-white
                                            flex
                                            items-center
                                            justify-center
                                            text-black
                                            font-bold
                                        "
                                    >

                                        QR

                                    </div>

                                </div>

                            </div>

                        </div>

                        {/* Floating IoT Card */}

                        <div
                            className="
                                absolute
                                -left-10
                                top-24
                                hidden
                                lg:block
                                rounded-2xl
                                bg-white
                                p-4
                                shadow-xl
                            "
                        >

                            <div className="flex items-center gap-3">

                                <div className="rounded-full bg-green-100 p-3">

                                    <Wifi
                                        className="text-[#2D6A4F]"
                                        size={20}
                                    />

                                </div>

                                <div>

                                    <p className="font-semibold text-[#111827]">

                                        Wearable Connected

                                    </p>

                                    <p className="text-sm text-gray-500">

                                        Real-time Sync

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}