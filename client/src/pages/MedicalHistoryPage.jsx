import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    FileText,
    HeartPulse,
    Loader2,
    Pill,
    Stethoscope,
} from "lucide-react";

import api from "../services/api";


const EVENT_CONFIG = {

    Diagnosis: {
        icon: Stethoscope,
        className:
            "bg-blue-50 text-blue-700 border-blue-200",
    },

    Prescription: {
        icon: Pill,
        className:
            "bg-amber-50 text-amber-700 border-amber-200",
    },

    Emergency: {
        icon: AlertTriangle,
        className:
            "bg-red-50 text-red-700 border-red-200",
    },

    Checkup: {
        icon: HeartPulse,
        className:
            "bg-green-50 text-green-700 border-green-200",
    },

    Admission: {
        icon: ClipboardList,
        className:
            "bg-purple-50 text-purple-700 border-purple-200",
    },

    Discharge: {
        icon: CheckCircle2,
        className:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
    },

    Other: {
        icon: FileText,
        className:
            "bg-[#F2EDE4] text-[#1A1A1A] border-[#E8E0D5]",
    },

};


export default function MedicalHistoryPage() {

    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const profile = JSON.parse(
        localStorage.getItem("profile") || "{}"
    );


    const patientId = useMemo(() => {

        if (
            profile?.patient &&
            typeof profile.patient === "object"
        ) {
            return profile.patient?._id;
        }

        return profile?.patient || null;

    }, [profile]);


    useEffect(() => {

        let mounted = true;

        async function loadTimeline() {

            /*
             * Patient access is intentionally not replaced
             * with fake data. The backend must authorize
             * the patient's own timeline.
             */

            if (!patientId) {

                if (mounted) {

                    setError(
                        "No patient profile is linked to the current account."
                    );

                    setLoading(false);

                }

                return;
            }


            try {

                setLoading(true);
                setError("");

                const response =
                    await api.get(
                        `/timeline/${patientId}`
                    );

                if (!mounted) {
                    return;
                }

                setTimeline(
                    response.data?.data || []
                );

            } catch (err) {

                console.error(
                    "Medical history error:",
                    err
                );

                if (mounted) {

                    setTimeline([]);

                    setError(
                        err.response?.data?.message ||
                        "Unable to load medical history."
                    );

                }

            } finally {

                if (mounted) {
                    setLoading(false);
                }

            }

        }

        loadTimeline();

        return () => {
            mounted = false;
        };

    }, [patientId]);


    function formatDate(value) {

        if (!value) {
            return "Date unavailable";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
        );

    }


    if (loading) {

        return (
            <div
                className="
                    min-h-[55vh]
                    flex
                    items-center
                    justify-center
                "
            >

                <div className="text-center">

                    <Loader2
                        size={44}
                        className="
                            mx-auto
                            animate-spin
                            text-[#2D6A4F]
                        "
                    />

                    <p
                        className="
                            mt-4
                            text-[#1A1A1A]
                            font-bold
                            text-lg
                        "
                    >
                        Loading Medical History...
                    </p>

                </div>

            </div>
        );
    }


    return (

        <div
            className="
                max-w-6xl
                mx-auto
                space-y-7
            "
        >

            {/* =====================================================
                HEADER
            ====================================================== */}

            <div>

                <div
                    className="
                        inline-flex
                        items-center
                        gap-2
                        bg-[#D8F3DC]
                        text-[#1B4332]
                        px-3
                        py-1.5
                        rounded-full
                        text-sm
                        font-bold
                        mb-3
                    "
                >

                    <Activity size={16} />

                    Patient Timeline

                </div>

                <h1
                    className="
                        text-3xl
                        sm:text-4xl
                        font-bold
                        text-[#1B4332]
                    "
                >
                    Medical History
                </h1>

                <p
                    className="
                        mt-2
                        text-[#1A1A1A]
                        font-medium
                        text-base
                        sm:text-lg
                    "
                >
                    A chronological view of important healthcare events.
                </p>

            </div>


            {/* =====================================================
                ERROR
            ====================================================== */}

            {error && (

                <div
                    className="
                        rounded-2xl
                        border
                        border-red-200
                        bg-red-50
                        p-5
                    "
                >

                    <div
                        className="
                            flex
                            gap-3
                            items-start
                            text-red-700
                        "
                    >

                        <AlertTriangle
                            size={23}
                            className="mt-0.5 shrink-0"
                        />

                        <div>

                            <h2
                                className="
                                    font-bold
                                    text-lg
                                "
                            >
                                Medical History Unavailable
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-[#1A1A1A]
                                    font-medium
                                "
                            >
                                {error}
                            </p>

                        </div>

                    </div>

                </div>

            )}


            {/* =====================================================
                EMPTY STATE
            ====================================================== */}

            {!error && timeline.length === 0 && (

                <div
                    className="
                        bg-white
                        border
                        border-[#E8E0D5]
                        rounded-3xl
                        shadow-sm
                        p-10
                        text-center
                    "
                >

                    <div
                        className="
                            w-16
                            h-16
                            mx-auto
                            rounded-2xl
                            bg-[#D8F3DC]
                            flex
                            items-center
                            justify-center
                        "
                    >

                        <ClipboardList
                            size={30}
                            className="text-[#2D6A4F]"
                        />

                    </div>

                    <h2
                        className="
                            mt-5
                            text-2xl
                            font-bold
                            text-[#1A1A1A]
                        "
                    >
                        No Medical Events Yet
                    </h2>

                    <p
                        className="
                            mt-2
                            text-[#4A4A4A]
                            max-w-lg
                            mx-auto
                            leading-6
                        "
                    >
                        Medical diagnoses, prescriptions, checkups,
                        admissions and other recorded events will appear here.
                    </p>

                </div>

            )}


            {/* =====================================================
                TIMELINE
            ====================================================== */}

            {timeline.length > 0 && (

                <div
                    className="
                        bg-white
                        border
                        border-[#E8E0D5]
                        rounded-3xl
                        shadow-sm
                        p-5
                        sm:p-7
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                            mb-7
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

                            <CalendarDays
                                size={23}
                                className="text-[#2D6A4F]"
                            />

                        </div>

                        <div>

                            <h2
                                className="
                                    text-xl
                                    sm:text-2xl
                                    font-bold
                                    text-[#1A1A1A]
                                "
                            >
                                Health Timeline
                            </h2>

                            <p
                                className="
                                    text-[#4A4A4A]
                                    text-sm
                                    font-medium
                                "
                            >
                                {timeline.length} recorded event
                                {timeline.length === 1 ? "" : "s"}
                            </p>

                        </div>

                    </div>


                    <div className="relative">

                        <div
                            className="
                                absolute
                                left-[21px]
                                top-3
                                bottom-3
                                w-px
                                bg-[#D8F3DC]
                            "
                        />


                        <div className="space-y-7">

                            {timeline.map(
                                (event, index) => {

                                    const config =
                                        EVENT_CONFIG[
                                        event.eventType
                                        ] ||
                                        EVENT_CONFIG.Other;

                                    const Icon =
                                        config.icon;

                                    return (

                                        <div
                                            key={
                                                event._id ||
                                                `${event.createdAt}-${index}`
                                            }
                                            className="
                                                relative
                                                pl-14
                                            "
                                        >

                                            {/* Timeline dot */}

                                            <div
                                                className="
                                                    absolute
                                                    left-0
                                                    top-0
                                                    w-11
                                                    h-11
                                                    rounded-xl
                                                    bg-white
                                                    border
                                                    border-[#D8F3DC]
                                                    flex
                                                    items-center
                                                    justify-center
                                                    z-10
                                                    shadow-sm
                                                "
                                            >

                                                <Icon
                                                    size={20}
                                                    className="text-[#2D6A4F]"
                                                />

                                            </div>


                                            {/* Event */}

                                            <div
                                                className="
                                                    bg-[#FAF7F2]
                                                    border
                                                    border-[#E8E0D5]
                                                    rounded-2xl
                                                    p-5
                                                    hover:shadow-md
                                                    hover:-translate-y-0.5
                                                    transition-all
                                                    duration-200
                                                "
                                            >

                                                <div
                                                    className="
                                                        flex
                                                        flex-col
                                                        sm:flex-row
                                                        sm:items-start
                                                        sm:justify-between
                                                        gap-3
                                                    "
                                                >

                                                    <div>

                                                        <h3
                                                            className="
                                                                text-lg
                                                                font-bold
                                                                text-[#1A1A1A]
                                                            "
                                                        >
                                                            {event.title}
                                                        </h3>

                                                        <p
                                                            className="
                                                                mt-1
                                                                text-sm
                                                                text-[#4A4A4A]
                                                                font-medium
                                                            "
                                                        >
                                                            {formatDate(
                                                                event.createdAt
                                                            )}
                                                        </p>

                                                    </div>


                                                    <span
                                                        className={`
                                                            inline-flex
                                                            items-center
                                                            self-start
                                                            px-3
                                                            py-1.5
                                                            rounded-full
                                                            border
                                                            text-xs
                                                            font-bold
                                                            ${config.className}
                                                        `}
                                                    >
                                                        {event.eventType || "Other"}
                                                    </span>

                                                </div>


                                                <p
                                                    className="
                                                        mt-4
                                                        text-[#1A1A1A]
                                                        leading-6
                                                        font-medium
                                                    "
                                                >
                                                    {event.description}
                                                </p>


                                                {event.createdBy && (

                                                    <div
                                                        className="
                                                            mt-4
                                                            pt-3
                                                            border-t
                                                            border-[#E8E0D5]
                                                            text-sm
                                                            text-[#4A4A4A]
                                                            font-medium
                                                        "
                                                    >
                                                        Recorded by{" "}
                                                        <span
                                                            className="
                                                                text-[#1A1A1A]
                                                                font-bold
                                                            "
                                                        >
                                                            {
                                                                event.createdBy
                                                                    ?.displayName ||
                                                                "Healthcare Staff"
                                                            }
                                                        </span>
                                                    </div>

                                                )}

                                            </div>

                                        </div>

                                    );

                                }
                            )}

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}