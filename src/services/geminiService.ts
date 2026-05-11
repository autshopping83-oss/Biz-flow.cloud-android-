
import { GoogleGenAI, Type } from "@google/genai";

// Initialize client safely
let aiClient: GoogleGenAI | null = null;

try {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (geminiApiKey) {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  }
} catch (error) {
  console.warn("Gemini Client Initialization failed:", error);
}

export const improveDescription = async (text: string): Promise<string> => {
  if (!aiClient || !text.trim()) return text;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional accountant assistant. Rewrite the following receipt item description to be more professional, concise, and formal (in Portuguese). Return ONLY the rewritten text without quotes or explanations. Input: "${text}"`,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini enhancement failed:", error);
    return text;
  }
};

export const analyzeReceiptImage = async (base64Image: string): Promise<any> => {
  if (!aiClient) return null;

  try {
    // We want a JSON response to populate the form
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash-image', // Native support for images
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] // Remove prefix if present
          }
        },
        {
          text: "Analyze this receipt or invoice image. Extract the following information: Total Amount (as a number), Date (as YYYY-MM-DD), Description (what was bought), and Category (one of: Food, Transport, Rent, Software, Supplies, Services, Other). Return ONLY a JSON object."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["amount", "date", "description", "category"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Gemini Vision failed:", error);
    return null;
  }
};
