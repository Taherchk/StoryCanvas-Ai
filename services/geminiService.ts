import { GoogleGenAI, Type } from "@google/genai";

// 1. Vite এর জন্য সঠিক Env Variable
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export const analyzeStoryToScenes = async (story: string, customStyle: string = ''): Promise<any[]> => {
    
    // 2. চাবি আছে কিনা চেক করা (শুরুতেই)
    if (!API_KEY) {
        alert("API Key Not Found! Please check Vercel Environment Variables.");
        return [];
    }

    try {
        // 3. AI কে ফাংশনের ভেতরে কল করা (যাতে ক্র্যাশ না করে)
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const systemInstruction = `
        You are a Visual Continuity Architect for high-budget cinema. Your goal is to eliminate "AI drift" by creating a rigid visual framework.
        
        PHASE 1: CHARACTER GENOME (Internal logic)
        For every character identified, you MUST define:
        - FACIAL GEOMETRY: Specific nose shape (aquiline, button), jawline (rugged, soft), and eye set (hooded, deep-set).
        - HAIR ARCHITECTURE: Not just "hair color", but texture (coarse, wispy), exact length, and specific styling (e.g., "wind-swept pompadour").
        - WARDROBE ANCHORS: Exact garment materials (distressed leather, pleated silk), specific colors (burnt sienna, charcoal gray).

        PHASE 2: ENVIRONMENTAL ANCHORS
        - Define consistent lighting (e.g., "Golden hour 5600K color temperature") and atmosphere (e.g., "heavy dust motes", "volumetric fog").

        PHASE 3: PROMPT CONSTRUCTION
        - Every 'main' shot prompt MUST begin with the Character Genome block.
        - Example prompt start: "[Character Name]: [Facial Geometry] + [Hair Architecture] + [Wardrobe Anchors]... [Action]..."
        - This ensures the diffusion model "sees" the identity before the action.

        STYLE GUIDELINE:
        ${customStyle ? `Adhere strictly to: ${customStyle}.` : 'Ultra-realistic cinematic 8k, shot on Arri Alexa 65, Panavision lenses.'}

        OUTPUT: Return a JSON array of scenes. Do not use generic descriptions like "a man" or "the hero". Use the Genome details.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // 4. সঠিক ফ্রি মডেল
            contents: story,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: {
                                type: Type.STRING,
                                description: "The specific snippet from the original story."
                            },
                            prompt: {
                                type: Type.STRING,
                                description: "The hyper-consistent image prompt starting with the character genome and wardrobe anchors."
                            },
                            motionPrompt: {
                                type: Type.STRING,
                                description: "Camera movement instructions (e.g., 'Slow orbital pan', 'Rack focus')."
                            },
                            shotType: {
                                type: Type.STRING,
                                enum: ['main', 'b-roll']
                            }
                        },
                        required: ['text', 'prompt', 'motionPrompt', 'shotType']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];

        // JSON ক্লিন করা (যদি প্রয়োজন হয়)
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (error: any) {
        console.error("Advanced analysis failed:", error);
        
        // 5. এরর অ্যালার্ট (যাতে আপনি স্ক্রিনে দেখতে পান)
        alert("Analysis Error: " + (error.message || JSON.stringify(error)));
        
        return [];
    }
};

export const generateSceneImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    
    if (!API_KEY) return null;

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // ছবির জন্যও এই মডেল রাখা হলো যাতে ক্র্যাশ না করে
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                // Flash মডেল ছবি জেনারেট করতে পারে না, তাই আপাতত টেক্সট কনফিগারেশন রাখা হলো
                // ফিউচারে ইমেজ মডেল পেলে এখানে বসাতে হবে
            }
        });

        // যেহেতু এটি টেক্সট মডেল, তাই এটি ইমেজ ডেটা রিটার্ন করবে না।
        // এরর এড়াতে আমরা নাল রিটার্ন করছি, যাতে অ্যাপ বন্ধ না হয়।
        console.warn("Image generation skipped: gemini-1.5-flash is text-only.");
        return null;

    } catch (error: any) {
        console.error("Visual generation failed:", error);
        // ছবির এরর অ্যালার্ট করার দরকার নেই, এটা ব্যাকগ্রাউন্ডে থাক
        return null;
    }
};
