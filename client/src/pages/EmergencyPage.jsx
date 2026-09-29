import {
    AlertTriangle,
    Ambulance,
    HeartPulse,
    Phone,
    ShieldAlert,
} from "lucide-react";


export default function EmergencyPage() {

    const profile = JSON.parse(
        localStorage.getItem("profile") || "{}"
    );


    const patient =
        profile?.patient &&
            typeof profile.patient === "object"
            ? profile.patient
            : profile;


    const emergencyContact =
        patient?.emergencyContact ||
        patient?.emergencyContactNumber ||
        patient?.emergencyPhone ||
        "";


    function callEmergencyContact() {

        if (!emergencyContact) {
            return;
        }

        window.location.href =
            `tel:${emergencyContact}`;

    }


    return (
        <div
            className="
                max-w-5xl
                mx-auto
                space-y-7
            "
        >

            {/* HEADER */}

            <div>

                <div
                    className="
                        inline-flex
                        items-center
                        gap-2
                        px-3
                        py-1.5
                        rounded-full
                        bg-red-100
                        text-red-700
                        text-sm
                        font-bold
                        mb-3
                    "
                >

                    <ShieldAlert size={16} />

                    Emergency Support

                </div>


                <h1
                    className="
                        text-3xl
                        sm:text-4xl
                        font-bold
                        text-[#1A1A1A]
                    "
                >
                    Emergency
                </h1>


                <p
                    className="
                        mt-2
                        text-[#4A4A4A]
                        font-medium
                    "
                >
                    Access emergency contact information and
                    emergency support options.
                </p>

            </div>


            {/* ALERT */}

            <div
                className="
                    rounded-3xl
                    border
                    border-red-200
                    bg-red-50
                    p-6
                    sm:p-8
                "
            >

                <div
                    className="
                        flex
                        items-start
                        gap-4
                    "
                >

                    <div
                        className="
                            w-14
                            h-14
                            rounded-2xl
                            bg-red-100
                            flex
                            items-center
                            justify-center
                            shrink-0
                        "
                    >

                        <AlertTriangle
                            size={30}
                            className="text-red-600"
                        />

                    </div>


                    <div>

                        <h2
                            className="
                                text-xl
                                sm:text-2xl
                                font-bold
                                text-red-800
                            "
                        >
                            Emergency assistance
                        </h2>

                        <p
                            className="
                                mt-2
                                text-[#1A1A1A]
                                font-medium
                                leading-6
                            "
                        >
                            If an immediate medical emergency is
                            occurring, contact local emergency
                            services or a healthcare professional.
                        </p>

                    </div>

                </div>

            </div>


            {/* EMERGENCY CONTACT */}

            <div
                className="
                    bg-white
                    border
                    border-[#E8E0D5]
                    rounded-3xl
                    shadow-sm
                    p-6
                    sm:p-8
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <div
                        className="
                            w-11
                            h-11
                            rounded-xl
                            bg-[#D8F3DC]
                            flex
                            items-center
                            justify-center
                        "
                    >

                        <Phone
                            size={22}
                            className="text-[#2D6A4F]"
                        />

                    </div>

                    <div>

                        <h2
                            className="
                                text-xl
                                font-bold
                                text-[#1A1A1A]
                            "
                        >
                            Registered Emergency Contact
                        </h2>

                        <p
                            className="
                                text-sm
                                text-[#4A4A4A]
                                font-medium
                            "
                        >
                            Contact stored in the patient profile.
                        </p>

                    </div>

                </div>


                <div
                    className="
                        mt-6
                        rounded-2xl
                        bg-[#FAF7F2]
                        border
                        border-[#E8E0D5]
                        p-5
                    "
                >

                    {emergencyContact ? (

                        <div
                            className="
                                flex
                                flex-col
                                sm:flex-row
                                sm:items-center
                                sm:justify-between
                                gap-4
                            "
                        >

                            <div>

                                <p
                                    className="
                                        text-sm
                                        text-[#4A4A4A]
                                        font-bold
                                    "
                                >
                                    Emergency Contact Number
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-2xl
                                        font-bold
                                        text-[#1A1A1A]
                                    "
                                >
                                    {emergencyContact}
                                </p>

                            </div>


                            <button
                                onClick={
                                    callEmergencyContact
                                }
                                className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    px-6
                                    py-3
                                    rounded-xl
                                    bg-[#2D6A4F]
                                    hover:bg-[#1B4332]
                                    text-white
                                    font-bold
                                    transition
                                "
                            >

                                <Phone size={19} />

                                Call Contact

                            </button>

                        </div>

                    ) : (

                        <div
                            className="
                                text-center
                                py-5
                            "
                        >

                            <Phone
                                size={35}
                                className="
                                    mx-auto
                                    text-[#4A4A4A]
                                "
                            />

                            <p
                                className="
                                    mt-3
                                    text-[#1A1A1A]
                                    font-bold
                                "
                            >
                                No emergency contact is available.
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-[#4A4A4A]
                                "
                            >
                                Please ask an authorized healthcare
                                worker to update the patient profile.
                            </p>

                        </div>

                    )}

                </div>

            </div>


            {/* MEDJARVIS EMERGENCY PIPELINE */}

            <div
                className="
                    bg-white
                    border
                    border-[#E8E0D5]
                    rounded-3xl
                    shadow-sm
                    p-6
                    sm:p-8
                "
            >

                <h2
                    className="
                        text-xl
                        sm:text-2xl
                        font-bold
                        text-[#1A1A1A]
                    "
                >
                    MedJarvis Emergency Monitoring
                </h2>

                <p
                    className="
                        mt-2
                        text-[#4A4A4A]
                        font-medium
                    "
                >
                    During an active monitoring session, validated
                    sensor events can be processed by the MedJarvis
                    emergency pipeline.
                </p>


                <div
                    className="
                        mt-6
                        grid
                        grid-cols-1
                        sm:grid-cols-3
                        gap-4
                    "
                >

                    <Step
                        icon={<HeartPulse size={22} />}
                        title="Sensor Data"
                        text="ESP32 collects and validates sensor readings."
                    />

                    <Step
                        icon={<ShieldAlert size={22} />}
                        title="Validation"
                        text="Validated events are processed before action."
                    />

                    <Step
                        icon={<Ambulance size={22} />}
                        title="Emergency Response"
                        text="Emergency handling can use registered patient information."
                    />

                </div>

            </div>


            {/* SAFETY */}

            <div
                className="
                    rounded-2xl
                    border
                    border-[#E8E0D5]
                    bg-[#FFF8F1]
                    p-5
                    text-sm
                    text-[#4A4A4A]
                    font-medium
                    leading-6
                "
            >
                MedJarvis is an academic healthcare prototype.
                A sensor event must be validated before it is treated
                as an emergency. The system should not be considered
                a substitute for professional emergency services.
            </div>

        </div>
    );
}


function Step({
    icon,
    title,
    text,
}) {

    return (
        <div
            className="
                rounded-2xl
                border
                border-[#E8E0D5]
                bg-[#FAF7F2]
                p-5
            "
        >

            <div
                className="
                    w-10
                    h-10
                    rounded-xl
                    bg-[#D8F3DC]
                    text-[#2D6A4F]
                    flex
                    items-center
                    justify-center
                "
            >
                {icon}
            </div>

            <h3
                className="
                    mt-4
                    font-bold
                    text-[#1A1A1A]
                "
            >
                {title}
            </h3>

            <p
                className="
                    mt-2
                    text-sm
                    text-[#4A4A4A]
                    leading-5
                "
            >
                {text}
            </p>

        </div>
    );
}