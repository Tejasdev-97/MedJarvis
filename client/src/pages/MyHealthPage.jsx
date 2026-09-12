import { useEffect, useRef, useState } from "react";
import {
    Activity,
    HeartPulse,
    Thermometer,
    Gauge,
    ArrowLeft,
    Play,
    Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { io } from "socket.io-client";

const BAND_ID = "BAND-MJ-001";

export default function MyHealthPage() {
    const navigate = useNavigate();

    const profile = JSON.parse(
        localStorage.getItem("profile") || "null"
    );

    const patientId =
        typeof profile?.patient === "object"
            ? profile.patient?._id
            : profile?.patient;

    // ============================================================
    // VITAL STATE
    // ============================================================

    const [latestVital, setLatestVital] = useState(null);

    const [displayVital, setDisplayVital] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [isLive, setIsLive] = useState(false);

    const [lastUpdated, setLastUpdated] = useState(null);

    // ============================================================
    // MONITORING STATE
    // ============================================================

    const [selectedMode, setSelectedMode] =
        useState("spot");

    const [monitoringActive, setMonitoringActive] =
        useState(false);

    const [starting, setStarting] =
        useState(false);

    const [stopping, setStopping] =
        useState(false);

    // ============================================================
    // REAL ESP32 SENSOR STATUS
    // ============================================================

    const [sensorStatus, setSensorStatus] =
        useState("IDLE");

    const [sensorMessage, setSensorMessage] =
        useState(
            "Ready to start health monitoring."
        );

    const [remainingSeconds, setRemainingSeconds] =
        useState(null);

    const [sensorMode, setSensorMode] =
        useState(null);

    // The ESP32 sends one MEASURING event per acquisition window.
    // Keep the countdown local so the MAX30102 acquisition loop does
    // not need per-second HTTP requests.
    const countdownEndRef = useRef(null);
    const [countdownSequence, setCountdownSequence] =
        useState(0);

    // ============================================================
    // LIVE PPG WAVEFORM
    // ============================================================

    const [ppgWaveform, setPpgWaveform] = useState([]);
    const [waveformSequence, setWaveformSequence] = useState(0);

    // ============================================================
    // BACKEND SESSION STATE
    // ============================================================

    const [sessionId, setSessionId] =
        useState(null);

    // ============================================================
    // LOAD LATEST VITAL + SOCKET.IO
    // ============================================================

    useEffect(() => {
        if (!patientId) {
            setError(
                "Patient profile is not linked to a patient record."
            );

            setLoading(false);

            return;
        }

        let isMounted = true;

        // ========================================================
        // LOAD LATEST VITAL
        // ========================================================

        const loadInitialVital = async () => {
            try {
                const response =
                    await api.get(
                        `/vitals/latest/${patientId}`
                    );

                if (
                    isMounted &&
                    response.data?.success
                ) {
                    const vital =
                        response.data.data;

                    setLatestVital(vital);

                    setDisplayVital(vital);

                    setError("");
                }
            } catch (err) {
                console.error(
                    "MY HEALTH VITALS ERROR:",
                    err
                );

                if (isMounted) {
                    // 404 simply means there is no previous
                    // sensor reading yet.
                    if (
                        err.response?.status !==
                        404
                    ) {
                        setError(
                            err.response?.data?.message ||
                            "Unable to load your latest health reading."
                        );
                    }
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadInitialVital();

        // ========================================================
        // SOCKET.IO
        // ========================================================

        const socket = io(
            import.meta.env.VITE_API_URL?.replace(
                "/api",
                ""
            ) ||
            "http://localhost:5000"
        );

        // ========================================================
        // SOCKET CONNECT
        // ========================================================

        socket.on("connect", () => {
            console.log(
                "🔌 Connected to MedJarvis live vitals"
            );

            console.log(
                "Socket ID:",
                socket.id
            );

            if (!isMounted) return;

            setIsLive(true);

            socket.emit(
                "joinPatient",
                patientId
            );
        });

        // ========================================================
        // SOCKET DISCONNECT
        // ========================================================

        socket.on("disconnect", () => {
            console.log(
                "🔌 Disconnected from MedJarvis live vitals"
            );

            if (isMounted) {
                setIsLive(false);
            }
        });

        // ========================================================
        // REAL SENSOR STATUS
        //
        // ESP32 -> Backend -> Socket.IO -> HERE
        // ========================================================

        socket.on(
            "sensorStatus",
            (statusData) => {
                console.log(
                    "📡 SENSOR STATUS RECEIVED:",
                    statusData
                );

                if (!isMounted) return;

                // ------------------------------------------------
                // Make sure this status belongs to the currently
                // displayed patient.
                // ------------------------------------------------

                if (
                    statusData?.patientId &&
                    String(
                        statusData.patientId
                    ) !== String(patientId)
                ) {
                    return;
                }

                // ------------------------------------------------
                // Update real sensor state.
                // ------------------------------------------------

                setSensorStatus(
                    statusData?.status ||
                    "UNKNOWN"
                );

                setSensorMessage(
                    statusData?.message ||
                    (statusData?.status === "FINGER_REMOVED"
                        ? "Please place your finger back on the sensor and hold still."
                        : "Sensor status updated.")
                );

                setSensorMode(
                    statusData?.mode ||
                    null
                );

                // Never show the previous session's HR/SpO2 while the
                // optical sensor is still collecting/validating fresh data.
                if (statusData?.status === "STARTING") {
                    setDisplayVital((previous) => ({
                        ...(previous || {}),
                        spo2: null,
                        heartRate: null,
                        hrvSDNN: null,
                    }));
                    setPpgWaveform([]);
                    setWaveformSequence((value) => value + 1);
                }

                if (
                    statusData?.status === "MEASURING" &&
                    statusData?.remainingSeconds !== null &&
                    statusData?.remainingSeconds !== undefined
                ) {
                    const duration = Math.max(
                        0,
                        Number(statusData.remainingSeconds) || 0
                    );

                    countdownEndRef.current =
                        Date.now() + duration * 1000;

                    setRemainingSeconds(duration);
                    setCountdownSequence((value) => value + 1);
                } else {
                    countdownEndRef.current = null;
                    setRemainingSeconds(null);
                }

                // ------------------------------------------------
                // The ESP32 is actually communicating.
                // ------------------------------------------------

                setIsLive(true);

                // ------------------------------------------------
                // Terminal state handling.
                // ------------------------------------------------

                if (
                    statusData?.status ===
                    "SESSION_COMPLETE"
                ) {
                    setMonitoringActive(false);

                    setSessionId(null);

                    setRemainingSeconds(null);
                }

                if (
                    statusData?.status ===
                    "SESSION_STOPPED"
                ) {
                    setMonitoringActive(false);

                    setSessionId(null);

                    setRemainingSeconds(null);
                }

                if (
                    statusData?.status ===
                    "STOPPING"
                ) {
                    // Keep active until backend confirms
                    // the session has actually stopped.
                }

                // ------------------------------------------------
                // Sensor errors do not automatically terminate
                // the backend session.
                //
                // This allows the user to see the actual error
                // and decide what to do.
                // ------------------------------------------------
            }
        );

        // ========================================================
        // NEW VITAL
        // ========================================================

        socket.on(
            "newVital",
            (vital) => {
                console.log(
                    "📡 NEW VITAL RECEIVED:",
                    vital
                );

                if (!isMounted) return;

                // ------------------------------------------------
                // Make sure this vital belongs to this patient.
                // ------------------------------------------------

                if (
                    vital?.patient &&
                    String(
                        typeof vital.patient ===
                            "object"
                            ? vital.patient._id
                            : vital.patient
                    ) !== String(patientId)
                ) {
                    return;
                }

                setLatestVital(vital);

                if (vital?.signalQuality != null) {
                    setSensorMessage(getSignalQualityMessage(vital.signalQuality));
                }

                if (
                    Array.isArray(vital?.ppgWaveform) &&
                    vital.ppgWaveform.length > 1
                ) {
                    setPpgWaveform(vital.ppgWaveform);
                    setWaveformSequence((value) => value + 1);
                }

                // ------------------------------------------------
                // Preserve previous valid values when the ESP32
                // legitimately sends null for a metric.
                // ------------------------------------------------

                setDisplayVital(
                    (previous) => {
                        if (!previous) {
                            return vital;
                        }

                        return {
                            ...previous,

                            ...vital,

                            spo2:
                                vital.spo2 != null
                                    ? vital.spo2
                                    : previous.spo2,

                            heartRate:
                                vital.heartRate !=
                                    null
                                    ? vital.heartRate
                                    : previous.heartRate,

                            hrvSDNN:
                                vital.hrvSDNN !=
                                    null
                                    ? vital.hrvSDNN
                                    : previous.hrvSDNN,

                            temperature:
                                vital.temperature !=
                                    null
                                    ? vital.temperature
                                    : previous.temperature,

                            signalQuality:
                                vital.signalQuality !=
                                    null
                                    ? vital.signalQuality
                                    : previous.signalQuality,

                            tilt:
                                vital.tilt !=
                                    null
                                    ? vital.tilt
                                    : previous.tilt,

                            accelMagnitude:
                                vital.accelMagnitude !=
                                    null
                                    ? vital.accelMagnitude
                                    : previous.accelMagnitude,

                            gyroMagnitude:
                                vital.gyroMagnitude !=
                                    null
                                    ? vital.gyroMagnitude
                                    : previous.gyroMagnitude,
                        };
                    }
                );

                setLastUpdated(
                    new Date()
                );

                setError("");

                setIsLive(true);

                // ------------------------------------------------
                // IMPORTANT:
                //
                // Do NOT set monitoringActive(true) here.
                //
                // The backend monitoring session and actual
                // sensor-status events determine monitoring state.
                // ------------------------------------------------

                // ------------------------------------------------
                // Spot result has arrived.
                //
                // The ESP32 will subsequently send its completion
                // status and call the backend completion endpoint.
                // ------------------------------------------------

                if (
                    vital.mode === "spot"
                ) {
                    setSensorMessage(
                        "Reading received. Finalizing the Spot measurement..."
                    );
                }
            }
        );

        // ========================================================
        // BACKEND MONITORING STATE
        // ========================================================

        socket.on(
            "monitoringState",
            (stateData) => {
                console.log(
                    "📡 MONITORING STATE RECEIVED:",
                    stateData
                );

                if (!isMounted) return;

                if (
                    stateData?.patientId &&
                    String(
                        stateData.patientId
                    ) !== String(patientId)
                ) {
                    return;
                }

                if (
                    stateData?.active === false
                ) {
                    setMonitoringActive(
                        false
                    );

                    setSessionId(null);

                    setRemainingSeconds(
                        null
                    );

                    if (
                        stateData.state ===
                        "COMPLETED"
                    ) {
                        setSensorStatus(
                            "SESSION_COMPLETE"
                        );

                        setSensorMessage(
                            "Spot monitoring completed. You can start a new monitoring session."
                        );
                    }

                    if (
                        stateData.state ===
                        "STOPPED"
                    ) {
                        setSensorStatus(
                            "SESSION_STOPPED"
                        );

                        setSensorMessage(
                            "Monitoring stopped. You can start a new session."
                        );
                    }
                }
            }
        );

        // ========================================================
        // SOCKET ERROR
        // ========================================================

        socket.on(
            "connect_error",
            (err) => {
                console.error(
                    "LIVE VITAL SOCKET ERROR:",
                    err.message
                );

                if (isMounted) {
                    setIsLive(false);
                }
            }
        );

        // ========================================================
        // CLEANUP
        // ========================================================

        return () => {
            isMounted = false;

            socket.off("connect");

            socket.off("disconnect");

            socket.off(
                "sensorStatus"
            );

            socket.off(
                "newVital"
            );

            socket.off(
                "monitoringState"
            );

            socket.off(
                "connect_error"
            );

            socket.disconnect();
        };
    }, [patientId]);

    // ============================================================
    // LOCAL MEASUREMENT COUNTDOWN
    // ============================================================
    // Spot = 15 seconds. Continuous is live and has no countdown.
    // This runs entirely in the browser and does not send requests.
    // ============================================================

    useEffect(() => {
        if (
            sensorStatus !== "MEASURING" ||
            countdownEndRef.current === null
        ) {
            return;
        }

        const updateCountdown = () => {
            const remaining = Math.max(
                0,
                Math.ceil(
                    (countdownEndRef.current - Date.now()) /
                    1000
                )
            );

            setRemainingSeconds(remaining);

            if (remaining <= 0) {
                countdownEndRef.current = null;
            }
        };

        updateCountdown();

        const interval = setInterval(
            updateCountdown,
            100
        );

        return () => {
            clearInterval(interval);
        };
    }, [countdownSequence, sensorStatus]);

    // ============================================================
    // BACKEND SESSION POLLING
    //
    // Backend remains authoritative for whether a monitoring
    // session is active.
    //
    // This is especially important for Spot mode because the
    // ESP32 completes the measurement after 15 seconds.
    // ============================================================

    useEffect(() => {
        if (!patientId) {
            return;
        }

        let isMounted = true;

        const checkMonitoringState =
            async () => {
                try {
                    const response =
                        await api.get(
                            `/vitals/control/${BAND_ID}`
                        );

                    if (
                        !isMounted ||
                        !response.data?.success
                    ) {
                        return;
                    }

                    const active =
                        response.data.active ===
                        true;

                    setMonitoringActive(
                        active
                    );

                    if (active) {
                        setSessionId(
                            response.data
                                .sessionId ||
                            null
                        );

                        if (
                            response.data.mode
                        ) {
                            setSensorMode(
                                response.data.mode
                            );
                        }
                    } else {
                        setSessionId(null);

                        // ------------------------------------------------
                        // Only change to Ready when there is no active
                        // session and there isn't a more useful terminal
                        // sensor message already being displayed.
                        // ------------------------------------------------

                        setRemainingSeconds(
                            null
                        );

                        setSensorStatus(
                            (previous) => {
                                if (
                                    previous ===
                                    "SESSION_COMPLETE" ||
                                    previous ===
                                    "SESSION_STOPPED"
                                ) {
                                    return previous;
                                }

                                return "IDLE";
                            }
                        );

                        setSensorMessage(
                            (previous) => {
                                if (
                                    previous ===
                                    "Spot monitoring completed. You can start a new monitoring session." ||
                                    previous ===
                                    "Monitoring stopped. You can start a new session."
                                ) {
                                    return previous;
                                }

                                return "Ready to start health monitoring.";
                            }
                        );
                    }
                } catch (err) {
                    console.error(
                        "MONITORING STATE CHECK ERROR:",
                        err
                    );
                }
            };

        // Check immediately.
        checkMonitoringState();

        // Continue checking while the page is open.
        const interval =
            setInterval(
                checkMonitoringState,
                1000
            );

        return () => {
            isMounted = false;

            clearInterval(
                interval
            );
        };
    }, [patientId]);

    // ============================================================
    // START MONITORING
    // ============================================================

    const startMonitoring =
        async () => {
            if (
                starting ||
                monitoringActive
            ) {
                return;
            }

            setStarting(true);

            setError("");

            setSensorStatus(
                "STARTING"
            );

            setSensorMessage(
                "Starting monitoring and waiting for the sensor..."
            );

            setRemainingSeconds(
                null
            );

            try {
                const response =
                    await api.post(
                        "/vitals/control/start",
                        {
                            bandId:
                                BAND_ID,

                            mode:
                                selectedMode,
                        }
                    );

                if (
                    response.data?.success
                ) {
                    setMonitoringActive(
                        true
                    );

                    setSessionId(
                        response.data
                            ?.data
                            ?.sessionId ||
                        null
                    );

                    setSensorMode(
                        selectedMode
                    );

                    // ------------------------------------------------
                    // Do NOT claim finger detection or sensor readiness
                    // here.
                    //
                    // The ESP32 will send those actual states.
                    // ------------------------------------------------

                    setSensorStatus(
                        "STARTING"
                    );

                    setSensorMessage(
                        "Monitoring session started. Waiting for the ESP32 sensor..."
                    );
                }
            } catch (err) {
                console.error(
                    "START MONITORING ERROR:",
                    err
                );

                setError(
                    err.response?.data
                        ?.message ||
                    "Unable to start monitoring."
                );

                setMonitoringActive(
                    false
                );

                setSessionId(
                    null
                );

                setSensorStatus(
                    "IDLE"
                );

                setSensorMessage(
                    "Ready to start health monitoring."
                );
            } finally {
                setStarting(
                    false
                );
            }
        };

    // ============================================================
    // STOP MONITORING
    // ============================================================

    const stopMonitoring =
        async () => {
            if (
                stopping
            ) {
                return;
            }

            setStopping(
                true
            );

            setSensorStatus(
                "STOPPING"
            );

            setSensorMessage(
                "Stopping monitoring..."
            );

            try {
                const response =
                    await api.post(
                        "/vitals/control/stop",
                        {
                            bandId:
                                BAND_ID,
                        }
                    );

                if (
                    response.data?.success
                ) {
                    setMonitoringActive(
                        false
                    );

                    setSessionId(
                        null
                    );

                    setRemainingSeconds(
                        null
                    );

                    setSensorStatus(
                        "SESSION_STOPPED"
                    );

                    setSensorMessage(
                        "Monitoring stopped. You can start a new monitoring session."
                    );
                }
            } catch (err) {
                console.error(
                    "STOP MONITORING ERROR:",
                    err
                );

                setError(
                    err.response?.data
                        ?.message ||
                    "Unable to stop monitoring."
                );

                // ------------------------------------------------
                // If backend stop failed, do not falsely show the
                // monitoring session as stopped.
                // ------------------------------------------------
            } finally {
                setStopping(
                    false
                );
            }
        };

    // ============================================================
    // SENSOR STATUS DISPLAY
    // ============================================================

    const getSensorStatusTitle =
        () => {
            switch (
            sensorStatus
            ) {
                case "STARTING":
                    return "Starting";

                case "SENSOR_READY":
                    return "Sensors Ready";

                case "WAITING_FOR_FINGER":
                    return "Waiting for Finger";

                case "FINGER_DETECTED":
                    return "Finger Detected";

                case "STABILIZING":
                    return "Stabilizing";

                case "SIGNAL_STABLE":
                    return "Signal Stable";

                case "MEASURING":
                    return "Reading";

                case "READING_COMPLETE":
                    return "Reading Complete";

                case "FINGER_REMOVED":
                    return "Finger Removed";

                case "SESSION_COMPLETE":
                    return "Monitoring Complete";

                case "STOPPING":
                    return "Stopping";

                case "SESSION_STOPPED":
                    return "Monitoring Stopped";

                case "SENSOR_ERROR":
                    return "Sensor Error";

                case "COMMUNICATION_ERROR":
                    return "Communication Error";

                default:
                    return "Ready";
            }
        };

    // ============================================================
    // SENSOR STATUS STYLE
    // ============================================================

    const getSensorStatusClass =
        () => {
            switch (
            sensorStatus
            ) {
                case "SENSOR_ERROR":
                case "COMMUNICATION_ERROR":
                    return "border-red-200 bg-red-50 text-red-700";

                case "SESSION_COMPLETE":
                case "READING_COMPLETE":
                    return "border-green-200 bg-green-50 text-green-700";

                case "SESSION_STOPPED":
                    return "border-gray-200 bg-gray-50 text-gray-700";

                case "FINGER_REMOVED":
                    return "border-amber-200 bg-amber-50 text-amber-700";

                case "WAITING_FOR_FINGER":
                case "FINGER_DETECTED":
                case "STABILIZING":
                case "SIGNAL_STABLE":
                case "MEASURING":
                    return "border-blue-200 bg-blue-50 text-blue-700";

                default:
                    return "border-gray-200 bg-gray-50 text-gray-700";
            }
        };

    // ============================================================
    // LAST UPDATED
    // ============================================================

    const getLastUpdatedText =
        () => {
            if (!lastUpdated) {
                return "Waiting for sensor data";
            }

            const seconds =
                Math.floor(
                    (Date.now() -
                        lastUpdated.getTime()) /
                    1000
                );

            if (
                seconds < 1
            ) {
                return "Updated just now";
            }

            if (
                seconds === 1
            ) {
                return "Updated 1 sec ago";
            }

            return `Updated ${seconds} sec ago`;
        };

    // ============================================================
    // LIVE SIGNAL / UI HELPERS
    // ============================================================

    const getSignalQualityMessage = (quality) => {
        const value = Number(quality);
        if (!Number.isFinite(value) || value <= 0) return "No finger contact — place your finger fully on the MAX30102 sensor.";
        if (value < 35) return "Weak contact — gently reposition your finger.";
        if (value < 70) return "Finger detected — hold still for a stronger signal.";
        if (value < 90) return "Good signal — keep your finger steady.";
        return "Excellent optical contact — signal is strong and stable.";
    };

    const getSignalQualityWidth = (quality) => {
        const value = Number(quality);
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    };

    const hasValidHR = Number.isFinite(Number(displayVital?.heartRate)) && Number(displayVital?.heartRate) >= 40 && Number(displayVital?.heartRate) <= 180;
    const hasValidSpO2 = Number.isFinite(Number(displayVital?.spo2)) && Number(displayVital?.spo2) >= 70 && Number(displayVital?.spo2) <= 100;

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="space-y-6">

            {/* ====================================================
                HEADER
            ==================================================== */}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        My Health
                    </h1>

                    <p className="text-gray-500 mt-1">
                        Monitor and view your latest health
                        and sensor readings.
                    </p>
                </div>

                <button
                    onClick={() =>
                        navigate(
                            "/dashboard"
                        )
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                >
                    <ArrowLeft
                        size={18}
                    />

                    Back
                </button>
            </div>

            {/* ====================================================
                NO PATIENT
            ==================================================== */}

            {!patientId &&
                !loading && (
                    <div className="bg-white rounded-xl border border-red-200 p-6">
                        <p className="text-red-600 font-medium">
                            {error}
                        </p>
                    </div>
                )}

            {/* ====================================================
                MONITORING CONTROL
            ==================================================== */}

            {patientId &&
                !loading && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">

                        {/* ------------------------------------------------
                            HEADER
                        ------------------------------------------------ */}

                        <div className="flex items-center justify-between mb-5">

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Health Monitoring
                                </h2>

                                <p className="text-sm text-gray-500 mt-1">
                                    Choose a monitoring mode and
                                    start your sensor.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">

                                <span
                                    className={`w-2.5 h-2.5 rounded-full ${monitoringActive
                                        ? "bg-green-500 animate-pulse"
                                        : "bg-gray-400"
                                        }`}
                                />

                                <span className="text-sm font-medium text-gray-600">
                                    {monitoringActive
                                        ? "Monitoring Active"
                                        : "Ready"}
                                </span>

                            </div>
                        </div>

                        {/* =================================================
                            MODE SELECTION
                        ================================================= */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

                            <button
                                disabled={
                                    monitoringActive
                                }
                                onClick={() =>
                                    setSelectedMode(
                                        "spot"
                                    )
                                }
                                className={`text-left rounded-xl border p-4 transition ${selectedMode ===
                                    "spot"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 bg-white"
                                    } ${monitoringActive
                                        ? "opacity-60 cursor-not-allowed"
                                        : "hover:bg-gray-50"
                                    }`}
                            >
                                <div className="font-semibold text-gray-900">
                                    Spot Monitoring
                                </div>

                                <p className="text-sm text-gray-500 mt-1">
                                    One 15-second measurement
                                    with a final result.
                                </p>
                            </button>

                            <button
                                disabled={
                                    monitoringActive
                                }
                                onClick={() =>
                                    setSelectedMode(
                                        "continuous"
                                    )
                                }
                                className={`text-left rounded-xl border p-4 transition ${selectedMode ===
                                    "continuous"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 bg-white"
                                    } ${monitoringActive
                                        ? "opacity-60 cursor-not-allowed"
                                        : "hover:bg-gray-50"
                                    }`}
                            >
                                <div className="font-semibold text-gray-900">
                                    Continuous Monitoring
                                </div>

                                <p className="text-sm text-gray-500 mt-1">
                                    Fresh sensor readings
                                    approximately every 5 seconds.
                                </p>
                            </button>

                        </div>

                        {/* =================================================
                            ACTION
                        ================================================= */}

                        {!monitoringActive ? (
                            <button
                                onClick={
                                    startMonitoring
                                }
                                disabled={
                                    starting
                                }
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <Play
                                    size={18}
                                />

                                {starting
                                    ? "Starting..."
                                    : "Start Monitoring"}
                            </button>
                        ) : (
                            <button
                                onClick={
                                    stopMonitoring
                                }
                                disabled={
                                    stopping
                                }
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <Square
                                    size={17}
                                />

                                {stopping
                                    ? "Stopping..."
                                    : "Stop Monitoring"}
                            </button>
                        )}

                        {/* =================================================
                            REAL SENSOR STATUS
                        ================================================= */}

                        <div
                            className={`mt-4 rounded-lg border p-4 ${getSensorStatusClass()}`}
                        >
                            <div className="flex items-start justify-between gap-4">

                                <div className="flex-1">

                                    <div className="flex items-center gap-2">

                                        {monitoringActive && (
                                            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                        )}

                                        <p className="font-semibold">
                                            {
                                                getSensorStatusTitle()
                                            }
                                        </p>

                                    </div>

                                    <p className="text-sm mt-1">
                                        {
                                            sensorMessage
                                        }
                                    </p>

                                    {sensorMode && (
                                        <p className="text-xs mt-2 opacity-70">
                                            Mode:{" "}
                                            {sensorMode ===
                                                "spot"
                                                ? "Spot"
                                                : "Continuous"}
                                        </p>
                                    )}

                                </div>

                                {remainingSeconds !==
                                    null &&
                                    sensorStatus ===
                                    "MEASURING" && (
                                        <div className="text-right">

                                            <p className="text-xs opacity-70">
                                                Remaining
                                            </p>

                                            <p className="text-xl font-bold">
                                                {
                                                    remainingSeconds
                                                }
                                                s
                                            </p>

                                        </div>
                                    )}

                            </div>
                        </div>

                    </div>
                )}

            {/* ====================================================
                LOADING
            ==================================================== */}

            {loading && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">
                        Loading your latest health
                        reading...
                    </p>
                </div>
            )}

            {/* ====================================================
                ERROR
            ==================================================== */}

            {!loading &&
                patientId &&
                error && (
                    <div className="bg-white rounded-xl border border-red-200 p-6">
                        <p className="text-red-600">
                            {error}
                        </p>
                    </div>
                )}

            {/* ====================================================
                LATEST READING
            ==================================================== */}

            {!loading &&
                displayVital && (
                    <>
                        <div className="bg-white rounded-xl border border-gray-200 p-6">

                            <div className="flex items-center justify-between mb-6">

                                <div className="flex items-center gap-3">

                                    <div className="p-3 rounded-lg bg-blue-50">
                                        <Activity
                                            size={24}
                                            className="text-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            Latest Sensor Reading
                                        </h2>

                                        <p className="text-sm text-gray-500">
                                            {monitoringActive
                                                ? "Live sensor readings"
                                                : "Last recorded sensor reading"}
                                        </p>
                                    </div>

                                </div>

                                {/* LIVE STATUS */}

                                <div className="flex flex-col items-end">

                                    <div className="flex items-center gap-2">

                                        <span
                                            className={`w-2.5 h-2.5 rounded-full ${monitoringActive &&
                                                isLive
                                                ? "bg-green-500 animate-pulse"
                                                : "bg-gray-400"
                                                }`}
                                        />

                                        <span
                                            className={`text-sm font-medium ${monitoringActive &&
                                                isLive
                                                ? "text-green-600"
                                                : "text-gray-500"
                                                }`}
                                        >
                                            {monitoringActive &&
                                                isLive
                                                ? "Live"
                                                : "Last reading"}
                                        </span>

                                    </div>

                                    <span className="text-xs text-gray-400 mt-1">
                                        {
                                            getLastUpdatedText()
                                        }
                                    </span>

                                </div>
                            </div>

                            {/* =================================================
                                LIVE MONITORING LAYOUT
                                30% metrics | 70% hospital-style PPG
                            ================================================= */}

                            <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-stretch">
                                <div className="lg:col-span-3 space-y-3">
                                    <LiveVitalCard icon={<HeartPulse size={21} />} label="SpO₂" value={hasValidSpO2 ? `${displayVital.spo2}%` : "—"} unit={hasValidSpO2 ? "oxygen saturation" : "Waiting for validated signal"} active={monitoringActive} accent="blue" />
                                    <LiveVitalCard icon={<HeartPulse size={21} />} label="Heart Rate" value={hasValidHR ? `${displayVital.heartRate}` : "—"} unit={hasValidHR ? "BPM" : "Waiting for validated beats"} active={monitoringActive} pulse={monitoringActive && hasValidHR} accent="red" />
                                    <LiveVitalCard icon={<Thermometer size={21} />} label="Temperature" value={displayVital.temperature != null ? `${displayVital.temperature}` : "—"} unit={displayVital.temperature != null ? "°C" : "Waiting for sensor"} active={monitoringActive} accent="amber" />

                                    <div className={`rounded-xl border p-4 transition ${monitoringActive ? "border-blue-300 shadow-sm bg-white" : "border-gray-200 bg-white"}`}>
                                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                                            <Gauge size={21} />
                                            <span className="text-sm font-medium text-gray-700">Signal Quality</span>
                                            {monitoringActive && <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Live</span>}
                                        </div>
                                        <div className="flex items-end justify-between gap-3">
                                            <p className="text-2xl font-bold text-gray-900">{displayVital.signalQuality != null ? `${displayVital.signalQuality}%` : "0%"}</p>
                                            <span className="text-xs text-gray-500 pb-1">Optical contact</span>
                                        </div>
                                        <div className="mt-3 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                            <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${getSignalQualityWidth(displayVital.signalQuality)}%` }} />
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-gray-500">{getSignalQualityMessage(displayVital.signalQuality)}</p>
                                    </div>
                                </div>

                                <div className="lg:col-span-7 rounded-xl border border-gray-200 bg-gray-950 p-4 min-h-[360px] flex flex-col">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${monitoringActive ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
                                            <div><p className="text-sm font-semibold text-white">Live PPG Waveform</p><p className="text-xs text-gray-400">MAX30102 optical pulse signal</p></div>
                                        </div>
                                        <div className="text-right text-xs text-gray-400"><p>{ppgWaveform.length} samples</p><p>100 Hz acquisition</p></div>
                                    </div>
                                    {ppgWaveform.length > 1 ? (
                                        <div className="flex-1 min-h-[285px]"><PPGWaveform samples={ppgWaveform} sequence={waveformSequence} /></div>
                                    ) : (
                                        <div className="flex-1 min-h-[285px] flex flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-900 text-center px-6">
                                            <Activity size={34} className="text-gray-500 mb-3" />
                                            <p className="text-sm font-medium text-gray-300">{monitoringActive ? "Waiting for optical waveform samples..." : "PPG waveform will appear when sensor data is available."}</p>
                                            <p className="text-xs text-gray-500 mt-1">Keep your finger steady on the MAX30102 sensor.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`mt-4 rounded-lg border px-4 py-3 ${Number(displayVital.signalQuality) > 0 ? "border-blue-100 bg-blue-50" : "border-amber-100 bg-amber-50"}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${Number(displayVital.signalQuality) > 0 ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`} />
                                    <p className={`text-sm font-medium ${Number(displayVital.signalQuality) > 0 ? "text-blue-800" : "text-amber-800"}`}>{getSignalQualityMessage(displayVital.signalQuality)}</p>
                                </div>
                            </div>
                        </div>

                        {/* =================================================
                            ADDITIONAL READINGS
                        ================================================= */}

                        <div className="bg-white rounded-xl border border-gray-200 p-6">

                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Additional Readings
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                <InfoItem
                                    label="HRV (SDNN)"
                                    value={
                                        displayVital.hrvSDNN !=
                                            null
                                            ? `${displayVital.hrvSDNN} ms`
                                            : "—"
                                    }
                                />

                                <InfoItem
                                    label="Tilt"
                                    value={
                                        displayVital.tilt !=
                                            null
                                            ? `${displayVital.tilt}°`
                                            : "—"
                                    }
                                />

                                <InfoItem
                                    label="Acceleration"
                                    value={
                                        displayVital.accelMagnitude !=
                                            null
                                            ? `${displayVital.accelMagnitude} m/s²`
                                            : "—"
                                    }
                                />

                                <InfoItem
                                    label="Gyroscope"
                                    value={
                                        displayVital.gyroMagnitude !=
                                            null
                                            ? `${displayVital.gyroMagnitude}`
                                            : "—"
                                    }
                                />

                            </div>
                        </div>

                        <p className="text-xs text-gray-500">
                            Readings shown here are sensor
                            measurements and are not, by themselves,
                            a medical diagnosis.
                        </p>
                    </>
                )}

            {/* ====================================================
                NO READING
            ==================================================== */}

            {!loading &&
                patientId &&
                !displayVital &&
                !error && (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">

                        <Activity
                            size={40}
                            className="mx-auto text-gray-400 mb-3"
                        />

                        <h2 className="font-semibold text-gray-800">
                            No health reading available
                        </h2>

                        <p className="text-gray-500 mt-1">
                            Start a health monitoring session
                            to collect your first reading.
                        </p>

                    </div>
                )}

        </div>
    );
}

// ============================================================
// VITAL CARD
// ============================================================

function VitalCard({
    icon,
    label,
    value,
    active,
}) {
    return (
        <div
            className={`rounded-xl border p-4 transition ${active
                ? "border-blue-300 shadow-sm"
                : "border-gray-200"
                }`}
        >
            <div
                className={`flex items-center gap-2 mb-2 ${active
                    ? "text-blue-600"
                    : "text-gray-500"
                    }`}
            >
                {icon}

                <span className="text-sm">
                    {label}
                </span>

                {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-auto" />
                )}
            </div>

            <p className="text-xl font-bold text-gray-900">
                {value}
            </p>
        </div>
    );
}

// ============================================================
// LIVE VITAL CARD
// ============================================================

function LiveVitalCard({ icon, label, value, unit, active, pulse = false, accent = "blue" }) {
    const accentClasses = {
        blue: "text-blue-600 bg-blue-50 border-blue-200",
        red: "text-red-600 bg-red-50 border-red-200",
        amber: "text-amber-600 bg-amber-50 border-amber-200",
    };
    const iconClass = accentClasses[accent] || accentClasses.blue;

    return (
        <div className={`rounded-xl border p-4 bg-white transition-all duration-300 ${active ? "shadow-sm" : "border-gray-200"}`}>
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${iconClass}`}>
                    {pulse ? <span className="inline-flex animate-pulse">{icon}</span> : icon}
                </div>
                <span className="text-sm font-medium text-gray-600">{label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <span className="text-xs text-gray-500">{unit}</span>
            </div>
        </div>
    );
}

// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
    label,
    value,
}) {
    return (
        <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-1">
                {label}
            </p>

            <p className="font-semibold text-gray-900">
                {value}
            </p>
        </div>
    );
}

function PPGWaveform({ samples, sequence }) {
    const width = 900;
    const height = 330;
    const left = 58;
    const right = 18;
    const top = 18;
    const bottom = 42;

    const numericSamples = Array.isArray(samples) ? samples.map(Number).filter(Number.isFinite) : [];
    if (numericSamples.length < 2) return null;

    const minimum = Math.min(...numericSamples);
    const maximum = Math.max(...numericSamples);
    const range = Math.max(maximum - minimum, 1);
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const points = numericSamples.map((sample, index) => {
        const x = left + (index / Math.max(numericSamples.length - 1, 1)) * plotWidth;
        const y = top + (1 - (sample - minimum) / range) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    const sampleDuration = numericSamples.length / 100;
    const xTicks = 5;
    const yTicks = 4;

    return (
        <div className="h-full min-h-[285px] rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
            <svg key={sequence} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full" role="img" aria-label="Live MAX30102 PPG waveform with time and amplitude axes">
                {Array.from({ length: xTicks + 1 }).map((_, index) => { const x = left + (index / xTicks) * plotWidth; return <line key={`vx-${index}`} x1={x} y1={top} x2={x} y2={top + plotHeight} stroke="currentColor" strokeWidth="1" opacity="0.10" />; })}
                {Array.from({ length: yTicks + 1 }).map((_, index) => { const y = top + (index / yTicks) * plotHeight; return <line key={`hy-${index}`} x1={left} y1={y} x2={left + plotWidth} y2={y} stroke="currentColor" strokeWidth="1" opacity="0.10" />; })}
                <line x1={left} y1={top + plotHeight} x2={left + plotWidth} y2={top + plotHeight} stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
                <line x1={left} y1={top} x2={left} y2={top + plotHeight} stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
                <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="text-emerald-400" />
                {Array.from({ length: xTicks + 1 }).map((_, index) => {
                    const x = left + (index / xTicks) * plotWidth;
                    const seconds = (sampleDuration * index) / xTicks;
                    return <text key={`xt-${index}`} x={x} y={height - 20} textAnchor="middle" className="fill-gray-500 text-[11px]">{seconds.toFixed(2)}s</text>;
                })}
                {Array.from({ length: yTicks + 1 }).map((_, index) => {
                    const y = top + (index / yTicks) * plotHeight;
                    const value = maximum - (index / yTicks) * range;
                    return <text key={`yt-${index}`} x={left - 8} y={y + 4} textAnchor="end" className="fill-gray-500 text-[10px]">{Math.round(value).toLocaleString()}</text>;
                })}
                <text x={left + plotWidth / 2} y={height - 4} textAnchor="middle" className="fill-gray-400 text-[11px]">Time (seconds)</text>
                <text x="14" y={top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 14 ${top + plotHeight / 2})`} className="fill-gray-400 text-[11px]">PPG / IR amplitude</text>
            </svg>
        </div>
    );
}
