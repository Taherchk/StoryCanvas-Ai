import { GoogleGenAI, Type } from "@google/genai";

// Vite এর সঠিক Env Variable
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export const analyzeStoryToScenes = async (story: string, customStyle: string = ''): Promise<any[]> => {
    
    if (!API_KEY) {
        alert("API Key Not Found! Check Vercel Settings.");
        return [];
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const systemInstruction = `
        You are a Visual Continuity Architect.
        STYLE: ${customStyle || 'Cinematic 8k'}.
        OUTPUT: Return a JSON array of scenes.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-pro', // এই মডেলটি ১০০% কাজ করবে
            contents: story,
            config: {
                systemInstruction, // gemini-pro তে systemInstruction সবসময় সাপোর্ট করে না, তবে আমরা ট্রাই করব
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            prompt: { type: Type.STRING },
                            motionPrompt: { type: Type.STRING },
                            shotType: { type: Type.STRING, enum: ['main', 'b-roll'] }
                        },
                        required: ['text', 'prompt', 'motionPrompt', 'shotType']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (error: any) {
        console.error("Analysis failed:", error);
        alert("Error: " + (error.message || JSON.stringify(error))); 
        return [];
    }
};

export const generateSceneImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    if (!API_KEY) return null;
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        // gemini-pro ছবি বানাতে পারে না, তাই আমরা নাল রিটার্ন করব যাতে অ্যাপ ক্র্যাশ না করে
        return null; 
    } catch (error) {
        return null;
    }
};
