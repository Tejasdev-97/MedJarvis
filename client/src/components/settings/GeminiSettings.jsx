import { useState } from "react";
import api from "../../services/api";

export default function GeminiSettings() {

    const [apiKey, setApiKey] = useState(
        localStorage.getItem("geminiKey") || ""
    );

    const [status, setStatus] = useState("");

    const usingUserKey = apiKey.trim() !== "";

    async function testKey() {

        if (!apiKey.trim()) {

            setStatus("❌ Please enter a Gemini API Key.");

            return;

        }

        setStatus("Testing Gemini connection...");

        try {

            const res = await api.post("/ai/test-key", {
                apiKey,
            });

            if (res.data.success) {

                localStorage.setItem(
                    "geminiKey",
                    apiKey
                );

                setStatus("✅ Gemini connected successfully.");

            }

        } catch (err) {

            setStatus(
                err.response?.data?.message ||
                "❌ Invalid Gemini API Key."
            );

        }

    }

    function removeKey() {

        localStorage.removeItem("geminiKey");

        setApiKey("");

        setStatus("User Gemini API Key removed.");

    }

    return (

        <div className="bg-white rounded-2xl shadow p-6">

            <h2 className="text-2xl font-bold flex items-center gap-2">

                🤖 Gemini AI Configuration

            </h2>

            <p className="mt-3 text-gray-600">

                MedJarvis first checks for a backend Gemini API key.
                If none is available, it automatically uses your
                personal Gemini API key stored in this browser.

            </p>

            <div className="mt-6">

                <label className="font-medium">

                    Gemini API Key

                </label>

                <input

                    type="password"

                    className="border rounded-xl p-4 w-full mt-2"

                    placeholder="Paste your Gemini API Key"

                    value={apiKey}

                    onChange={(e) =>
                        setApiKey(e.target.value)
                    }

                />

            </div>

            <div className="flex gap-4 mt-6">

                <button

                    onClick={testKey}

                    disabled={!apiKey}

                    className={`px-6 py-3 rounded-xl text-white transition ${

                        apiKey

                            ? "bg-[#2D6A4F] hover:bg-[#245740]"

                            : "bg-gray-400 cursor-not-allowed"

                    }`}

                >

                    Test Key

                </button>

                <button

                    onClick={removeKey}

                    className="border px-6 py-3 rounded-xl hover:bg-gray-100"

                >

                    Remove

                </button>

            </div>

            {status && (

                <div

                    className={`mt-6 rounded-xl p-4 font-medium ${

                        status.startsWith("✅")

                            ? "bg-green-100 text-green-700 border border-green-300"

                            : status.startsWith("Testing")

                            ? "bg-blue-100 text-blue-700 border border-blue-300"

                            : "bg-red-100 text-red-700 border border-red-300"

                    }`}

                >

                    {status}

                </div>

            )}

            <div className="mt-6 rounded-xl bg-gray-50 border p-4">

                <h3 className="font-semibold">

                    Current AI Source

                </h3>

                <p className="mt-2 text-gray-600">

                    {usingUserKey
                        ? "✅ Personal Gemini API Key"
                        : "⚙ Backend (.env) Gemini API Key"}

                </p>

            </div>

            <a

                href="https://aistudio.google.com/app/apikey"

                target="_blank"

                rel="noreferrer"

                className="inline-block mt-6 text-blue-600 hover:underline font-medium"

            >

                🔗 Get Free Gemini API Key

            </a>

        </div>

    );

}