
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateJobDescription = async (workType: string, location: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, inviting, and clear job description (max 30 words) for an agricultural job. 
      Work Type: ${workType}. 
      Location: ${location}. 
      Target audience: Local farm workers.`,
    });
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate description automatically.";
  }
};

export const suggestEquipmentMaintenance = async (equipmentName: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Provide 3 short, bulleted maintenance tips for a farming ${equipmentName}. Keep it under 50 words total.`
        });
        return response.text || "No tips available.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Maintenance tips unavailable.";
    }
};

export const generateEquipmentImage = async (equipmentType: string, name: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A high-quality, realistic, professional product photograph of a ${equipmentType} (farming equipment), specifically a ${name}. The equipment should be centered, clean, and shown in a sunny, outdoors farm setting. No people in the frame. Cinematic lighting, 4k detail.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return 'https://images.unsplash.com/photo-1592601249767-a2f0a82753a6?q=80&w=600&auto=format&fit=crop';
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return 'https://images.unsplash.com/photo-1592601249767-a2f0a82753a6?q=80&w=600&auto=format&fit=crop';
  }
};
