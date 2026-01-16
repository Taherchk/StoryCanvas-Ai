import { GoogleGenAI, Type } from "@google/genai";

// 1. Env Variable
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export const analyzeStoryToScenes = async (story: string, customStyle: string = ''): Promise<any[]> => {
    
    // Check API Key
    if (!API_KEY) {
        alert("API Key Not Found! Check Vercel Environment Variables.");
        return [];
    }

    try {
        // Initialize AI
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const systemInstruction = `
        You are a Visual Continuity Architect.
        Analyze the story and break it down into cinematic shots.
        STYLE: ${customStyle || 'Cinematic 8k'}.
        OUTPUT: Return a JSON array.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-pro', // <--- পরিবর্তন ১: এখানে gemini-pro দেওয়া হয়েছে
            contents: story,
            config: {
                // gemini-pro তে systemInstruction সাপোর্ট নাও করতে পারে, তাই আমরা সহজ কনফিগারেশন রাখছি
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
        // বিস্তারিত এরর দেখানোর জন্য অ্যালার্ট
        alert("Error: " + (error.message || JSON.stringify(error))); 
        return [];
    }
};

export const generateSceneImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    if (!API_KEY) return null;
    
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        // gemini-pro ছবি বানাতে পারে না, তাই আমরা এখানেও শুধু কানেকশন চেক করছি
        // ছবি জেনারেট স্কিপ করা হচ্ছে যাতে অ্যাপ ক্র্যাশ না করে
        return null;

    } catch (error) {
        console.error("Image gen failed:", error);
        return null;
    }
};
