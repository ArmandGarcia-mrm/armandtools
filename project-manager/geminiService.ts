
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Priority } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const parseTicketsFromText = async (rawText: string): Promise<Partial<Ticket>[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following text which contains one or more Jira ticket entries. 
    Extract the key information for each ticket.
    
    Text:
    ${rawText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            key: { type: Type.STRING, description: "The Jira ticket key (e.g., LLDCRMYSG-4446)" },
            type: { type: Type.STRING, description: "The type of ticket (e.g., New Campaign, Task)" },
            summary: { type: Type.STRING, description: "The descriptive title or campaign ID" },
            priority: { type: Type.STRING, description: "The priority (Low, Medium, High, or Critical)" },
            dueDate: { type: Type.STRING, description: "The due date mentioned in the text" },
          },
          required: ["key", "summary"],
        },
      },
      systemInstruction: "You are a specialized parser for Jira ticket data. Extract information accurately from unstructured pasted text.",
    },
  });

  try {
    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
};
