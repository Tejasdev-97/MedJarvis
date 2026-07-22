import { GoogleGenAI } from "@google/genai";

export async function generateGeminiResponse({
    prompt,
    apiKey,
}) {

    const finalKey =
        process.env.GEMINI_API_KEY ||
        apiKey;

    if (!finalKey) {

        return {
            success: false,
            message:
                "Gemini API key not configured.",
        };

    }

    try {

        const ai = new GoogleGenAI({
            apiKey: finalKey,
        });

        const response =
            await ai.models.generateContent({

                model:
    "gemini-flash-latest",

                contents: prompt,

            });

        return {

            success: true,

            text: response.text,

        };

    } catch (err) {

    console.error("========== GEMINI ERROR ==========");
    console.error(err);
    console.error("==================================");

    return {

        success: false,

        message:
            err.message ||
            "Gemini request failed.",

    };

}

}