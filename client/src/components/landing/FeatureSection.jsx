import {
    Activity,
    HeartPulse,
    ShieldCheck,
    Wifi
} from "lucide-react";

export default function FeatureSection({ darkMode }) {
    return (
        <section
    id="features"
    className="
        relative
        scroll-mt-24
        py-24
        px-6
    "
>
            <div className="max-w-7xl mx-auto">

                {/* Section Header */}

                <div className="max-w-3xl mx-auto text-center">

                    <span
                        className="
                            inline-flex
                            items-center
                            rounded-full
                            bg-green-100
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-[#2D6A4F]
                        "
                    >
                        Why MedJarvis?
                    </span>

                    <h2
                        className={`
                            mt-6
                            text-4xl
                            lg:text-5xl
                            font-bold
                            ${
                                darkMode
                                    ? "text-white"
                                    : "text-[#111827]"
                            }
                        `}
                    >
                        One Intelligent Platform
                        <br />
                        For Modern Healthcare
                    </h2>

                    <p
                        className={`
                            mt-6
                            text-lg
                            leading-8
                            ${
                                darkMode
                                    ? "text-gray-300"
                                    : "text-[#4B5563]"
                            }
                        `}
                    >
                        MedJarvis brings together AI,
                        connected devices,
                        secure digital health records
                        and healthcare professionals
                        into one unified ecosystem that
                        helps people receive better care,
                        faster decisions and a smoother
                        healthcare experience.
                    </p>

                </div>

                {/* Feature Cards */}

                <div
                    className="
                        mt-20
                        grid
                        gap-8
                        md:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                                    {/* Card 1 */}

                    <div
                        className="
                            group
                            rounded-3xl
                            bg-white
                            p-8
                            shadow-lg
                            transition-all
                            duration-300
                            hover:-translate-y-3
                            hover:shadow-2xl
                        "
                    >

                        <div
                            className="
                                h-16
                                w-16
                                rounded-2xl
                                bg-green-100
                                flex
                                items-center
                                justify-center
                                group-hover:scale-110
                                transition
                            "
                        >

                            <HeartPulse
                                className="text-[#2D6A4F]"
                                size={30}
                            />

                        </div>

                        <h3 className="mt-6 text-2xl font-bold text-[#111827]">

                            AI Health Intelligence

                        </h3>

                        <p className="mt-4 leading-7 text-gray-600">

                            AI analyzes health information,
                            supports early detection,
                            and assists healthcare professionals
                            with smarter clinical insights.

                        </p>

                    </div>

                    {/* Card 2 */}

                    <div
                        className="
                            group
                            rounded-3xl
                            bg-white
                            p-8
                            shadow-lg
                            transition-all
                            duration-300
                            hover:-translate-y-3
                            hover:shadow-2xl
                        "
                    >

                        <div
                            className="
                                h-16
                                w-16
                                rounded-2xl
                                bg-blue-100
                                flex
                                items-center
                                justify-center
                                group-hover:scale-110
                                transition
                            "
                        >

                            <Wifi
                                className="text-blue-600"
                                size={30}
                            />

                        </div>

                        <h3 className="mt-6 text-2xl font-bold text-[#111827]">

                            Connected Devices

                        </h3>

                        <p className="mt-4 leading-7 text-gray-600">

                            Secure IoT connectivity allows
                            wearable devices and healthcare systems
                            to share important health information
                            in real time.

                        </p>

                    </div>

                    {/* Card 3 */}

                    <div
                        className="
                            group
                            rounded-3xl
                            bg-white
                            p-8
                            shadow-lg
                            transition-all
                            duration-300
                            hover:-translate-y-3
                            hover:shadow-2xl
                        "
                    >

                        <div
                            className="
                                h-16
                                w-16
                                rounded-2xl
                                bg-orange-100
                                flex
                                items-center
                                justify-center
                                group-hover:scale-110
                                transition
                            "
                        >

                            <ShieldCheck
                                className="text-orange-500"
                                size={30}
                            />

                        </div>

                        <h3 className="mt-6 text-2xl font-bold text-[#111827]">

                            Secure Digital Identity

                        </h3>

                        <p className="mt-4 leading-7 text-gray-600">

                            QR-based digital health identity
                            enables fast access to verified
                            medical information while maintaining
                            privacy and security.

                        </p>

                    </div>

                    {/* Card 4 */}

                    <div
                        className="
                            group
                            rounded-3xl
                            bg-white
                            p-8
                            shadow-lg
                            transition-all
                            duration-300
                            hover:-translate-y-3
                            hover:shadow-2xl
                        "
                    >

                        <div
                            className="
                                h-16
                                w-16
                                rounded-2xl
                                bg-purple-100
                                flex
                                items-center
                                justify-center
                                group-hover:scale-110
                                transition
                            "
                        >

                            <Activity
                                className="text-purple-600"
                                size={30}
                            />

                        </div>

                        <h3 className="mt-6 text-2xl font-bold text-[#111827]">

                            Smart Monitoring

                        </h3>

                        <p className="mt-4 leading-7 text-gray-600">

                            Continuous health monitoring,
                            AI-powered alerts and intelligent
                            insights help healthcare providers
                            make faster decisions.

                        </p>

                    </div>

                </div>

            </div>

        </section>
    );
}