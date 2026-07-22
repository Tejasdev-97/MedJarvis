import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, CheckCircle, AlertCircle } from "lucide-react";

export default function CameraScanner({
    onDetected,
    onClose,
}) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const readerRef = useRef(null);

    const scannedRef = useRef(false);

    const [status, setStatus] = useState("Starting camera...");
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function startCamera() {
            try {
                const isMobile =
                    /Android|iPhone|iPad|iPod/i.test(
                        navigator.userAgent
                    );

                const constraints = isMobile
                    ? {
                          video: {
                              facingMode: {
                                  ideal: "environment",
                              },
                          },
                          audio: false,
                      }
                    : {
                          video: true,
                          audio: false,
                      };

                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        constraints
                    );

                if (!mounted) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                streamRef.current = stream;

                const video = videoRef.current;

                video.srcObject = stream;

                await video.play();

                readerRef.current =
                    new BrowserQRCodeReader();

                setStatus(
                    "Point your camera at a QR code."
                );

                readerRef.current.decodeFromVideoElement(
                    video,
                    (result) => {
                        if (
                            result &&
                            !scannedRef.current
                        ) {
                            scannedRef.current = true;

                            setScanned(true);

                            setStatus(
                                "QR Code detected!"
                            );

                            const value =
                                result.getText().trim();

                            stopCamera();

                            if (onClose) {
                                onClose();
                            }

                            setTimeout(() => {
                                onDetected?.(value);
                            }, 250);
                        }
                    }
                );
            } catch (err) {
    console.error(err);

    if (err.name === "NotAllowedError") {
        setStatus("Camera permission denied.");
    } else if (err.name === "NotFoundError") {
        setStatus("No camera found.");
    } else if (err.name === "NotReadableError") {
        setStatus("Camera is already in use.");
    } else {
        setStatus("Unable to access camera.");
    }
}
        }

        startCamera();

        return () => {
            mounted = false;
            stopCamera();
        };
    }, []);

    function stopCamera() {
        try {
            readerRef.current?.reset();
        } catch {}

        try {
            if (streamRef.current) {
                streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
            }
        } catch {}

        try {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }
        } catch {}
    }

    return (
        <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-gray-300 bg-black">
                <video
                    ref={videoRef}
                    className="h-80 w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-56 rounded-xl border-4 border-green-500"></div>
                </div>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                    {scanned ? (
                        <CheckCircle
                            className="text-green-600"
                            size={20}
                        />
                    ) : status.includes("Unable") ||
                      status.includes("permission") ||
                      status.includes("No camera") ? (
                        <AlertCircle
                            className="text-red-600"
                            size={20}
                        />
                    ) : (
                        <Camera
                            className="text-blue-600"
                            size={20}
                        />
                    )}

                    <span className="font-medium">
                        {status}
                    </span>
                </div>

                {!scanned && (
                    <p className="mt-2 text-sm text-gray-500">
                        Keep the QR code inside the green
                        box until it is detected
                        automatically.
                    </p>
                )}

                {scanned && (
                    <p className="mt-2 text-sm text-green-600">
                        Scan completed successfully.
                    </p>
                )}
            </div>
        </div>
    );
}