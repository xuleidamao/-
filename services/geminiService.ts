
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
// Note: In a real app, ensure API_KEY is handled securely or proxied. 
// For this frontend demo, we assume it's injected via build process or environment.

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateProductDescription = async (productName: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing.");
    return "新鲜上市，品质保证！(AI Key missing)";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, appetizing, and catchy description (in Chinese) for a vegetable market product named "${productName}". Keep it under 30 words. Focus on freshness and health.`,
    });
    
    return response.text?.trim() || "每日新鲜直供，欢迎品尝！";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "每日新鲜直供，欢迎品尝！";
  }
};

export interface AIProductResult {
  name: string;
  description: string;
  price: number;
  category: string;
  yesterdayPrice: number;
}

export const identifyProductFromImage = async (base64Image: string): Promise<AIProductResult | null> => {
  if (!ai) {
    console.warn("Gemini API Key missing.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Identify this vegetable or fruit product. Return a JSON object with the following fields: 'name' (Chinese name), 'description' (short marketing copy in Chinese), 'price' (estimated price in CNY per unit), 'category' (e.g. 蔬菜, 水果, 肉蛋), and 'yesterdayPrice' (a simulated price from yesterday, usually slightly different). Return only valid JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            price: { type: Type.NUMBER },
            category: { type: Type.STRING },
            yesterdayPrice: { type: Type.NUMBER }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIProductResult;
    }
    return null;
  } catch (error) {
    console.error("Gemini vision error:", error);
    return null;
  }
};

export interface AIRecipeResult {
  name: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
}

export const generateRecipe = async (query: string): Promise<AIRecipeResult[] | null> => {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Suggest 3 Chinese home-style recipes based on the keyword or ingredients: "${query}". 
      Return a JSON array where each object has:
      'name' (recipe name),
      'description' (very short appetizing summary),
      'ingredients' (array of objects with 'name' and 'amount'),
      'steps' (array of strings).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.STRING }
                  }
                }
              },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIRecipeResult[];
    }
    return null;

  } catch (error) {
    console.error("Gemini recipe error:", error);
    return null;
  }
};
