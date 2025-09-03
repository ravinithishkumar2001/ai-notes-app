import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function summarizeText(text) {
  try {
   
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `Summarize this note in 2-3 sentences: ${text}`
    );

    const response = await result.response;
    const summary = response.text();

    console.log("Gemini summary:", summary);
    return summary;
  } catch (err) {
    console.error("Gemini API error:", err);
    return "⚠️ Failed to summarize";
  }
}
