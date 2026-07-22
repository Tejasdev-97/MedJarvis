import { useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Upload, Loader2, CheckCircle } from "lucide-react";

export default function ImageScanner({ onDetected }) {

    const reader = useRef(new BrowserMultiFormatReader());

    const [loading, setLoading] = useState(false);

    const [success, setSuccess] = useState(false);

    const [error, setError] = useState("");

    async function handleImage(event) {

        const file = event.target.files[0];

        if (!file) return;

        setLoading(true);

        setSuccess(false);

        setError("");

        try {

            const image = document.createElement("img");

            image.src = URL.createObjectURL(file);

            image.onload = async () => {

                try {

                    const result =
                        await reader.current.decodeFromImageElement(image);

                    const medJarvisId =
                        result.getText().trim();

                    setSuccess(true);

                    onDetected(medJarvisId);

                }

                catch (err) {

                    console.error(err);

                    setError("Unable to detect a QR Code.");

                }

                finally {

                    setLoading(false);

                }

            };

        }

        catch (err) {

            console.error(err);

            setError("Failed to read image.");

            setLoading(false);

        }

    }

        return (

        <div className="space-y-4">

            <label className="block">

                <input

                    type="file"

                    accept="image/png,image/jpeg,image/jpg"

                    onChange={handleImage}

                    className="hidden"

                />

                <div className="cursor-pointer border-2 border-dashed border-[#2D6A4F] rounded-2xl p-10 text-center hover:bg-[#F7FAF8] transition">

                    <Upload

                        className="mx-auto text-[#2D6A4F]"

                        size={48}

                    />

                    <h3 className="mt-4 text-lg font-semibold">

                        Choose QR Image

                    </h3>

                    <p className="mt-2 text-sm text-gray-500">

                        Supported formats: PNG, JPG, JPEG

                    </p>

                </div>

            </label>

            {loading && (

                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">

                    <Loader2

                        className="animate-spin text-blue-600"

                        size={22}

                    />

                    <span className="text-blue-700">

                        Decoding QR Code...

                    </span>

                </div>

            )}

            {success && (

                <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">

                    <CheckCircle

                        className="text-green-600"

                        size={22}

                    />

                    <span className="text-green-700">

                        QR Code detected successfully.

                    </span>

                </div>

            )}

            {error && (

                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">

                    {error}

                </div>

            )}

        </div>

    );

}