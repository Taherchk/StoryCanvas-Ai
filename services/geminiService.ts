
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
export const analyzeStoryToScenes = async (story: string, customStyle: string = ''): Promise<{ text: string; prompt: string; motionPrompt: string; shotType: 'main' | 'b-roll' }[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = `
    You are a Visual Continuity Architect for high-budget cinema. Your goal is to eliminate "AI drift" by creating a rigid physical manifest for characters.

    PHASE 1: CHARACTER GENOME (Internal logic)
    For every character identified, you MUST define:
    - FACIAL GEOMETRY: Specific nose shape (aquiline, button), jawline (rugged, soft), and eye set (hooded, deep-set).
    - HAIR ARCHITECTURE: Not just "hair color", but texture (coarse, wispy), exact length, and specific styling (e.g., "three loose strands falling over the left eyebrow").
    - WARDROBE ANCHORS: Exact garment materials (distressed leather, pleated silk), specific colors (burnt sienna, charcoal grey), and unique identifiers (a specific brass broach, a frayed collar, a distinct scar on the chin).

    PHASE 2: ENVIRONMENTAL ANCHORS
    - Define consistent lighting (e.g., "Golden hour 5600K color temperature") and atmosphere (e.g., "heavy dust motes in the air").

    PHASE 3: PROMPT CONSTRUCTION
    - Every 'main' shot prompt MUST begin with the Character Genome block.
    - Example prompt start: "[Character Name]: [Facial Geometry] + [Hair Architecture] + [Wardrobe Anchors]... [Action]... [Style]".
    - This ensures the diffusion model "sees" the identity before the action.

    STYLE GUIDELINE:
    ${customStyle ? `Adhere strictly to: ${customStyle}.` : 'Ultra-realistic cinematic 8k, shot on Arri Alexa 65, Panavision lenses, deep depth of field, meticulous production design.'}

    OUTPUT: Return a JSON array of scenes. Do not use generic descriptions like "a man" or "the hero". Use the Genome defined in Phase 1.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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
    
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Advanced analysis failed:", error);
    return [];
  }
};

export const generateSceneImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Visual generation failed:", error);
    return null;
  }
};
