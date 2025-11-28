import { GoogleGenAI, Type } from "@google/genai";
import { JobContext, AnalysisResult } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Common System Instruction
 */
const SYSTEM_INSTRUCTION_BASE = `You are an expert Career Coach and Resume Writer. 
You act as a RAG (Retrieval Augmented Generation) system.
You will be provided with relevant CONTEXT from the user's database.
ALWAYS use this retrieved information to answer queries, aiming for truthfulness and relevance.
Maintain a professional, confident, and results-oriented tone.`;

export const analyzeAndTailorResume = async (
  retrievedContext: string,
  currentResume: string,
  jobContext: JobContext
): Promise<AnalysisResult> => {
  
  const prompt = `
  Analyze this resume against the target job description using the provided background context.
  
  --- RETRIEVED CONTEXT FROM DATABASE ---
  ${retrievedContext}
  ---------------------------------------
  
  TARGET JOB:
  Title: ${jobContext.jobTitle}
  Company: ${jobContext.companyName}
  Description: ${jobContext.jobDescription}

  CURRENT RESUME:
  ${currentResume}
  
  TASK:
  Critique the resume. 
  1. Identify strictly relevant points that match the JD.
  2. Identify irrelevant points that are wasting space.
  3. Look at the RETRIEVED CONTEXT and find skills/projects missing from the resume but required by the JD.
  4. Provide actionable suggestions to improve the resume.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relevant: { type: Type.ARRAY, items: { type: Type.STRING } },
            irrelevant: { type: Type.ARRAY, items: { type: Type.STRING } },
            missing_from_kb: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["relevant", "irrelevant", "missing_from_kb", "suggestions"]
        },
      },
    });
    
    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeAndTailorCoverLetter = async (
  retrievedContext: string,
  currentLetter: string,
  jobContext: JobContext
): Promise<AnalysisResult> => {

  const prompt = `
  Analyze this cover letter draft against the target job description.
  
  --- RETRIEVED CONTEXT FROM DATABASE ---
  ${retrievedContext}
  ---------------------------------------

  TARGET JOB:
  Title: ${jobContext.jobTitle}
  Company: ${jobContext.companyName}
  Description: ${jobContext.jobDescription}

  CURRENT COVER LETTER:
  ${currentLetter}
  
  TASK:
  Critique the cover letter.
  1. Identify strong points that connect well to the JD.
  2. Identify fluff, cliches, or irrelevant info.
  3. Suggest what relevant experience from the CONTEXT is missing and should be added.
  4. Provide specific suggestions to make it more compelling and concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relevant: { type: Type.ARRAY, items: { type: Type.STRING } },
            irrelevant: { type: Type.ARRAY, items: { type: Type.STRING } },
            missing_from_kb: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["relevant", "irrelevant", "missing_from_kb", "suggestions"]
        },
      },
    });
    
    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const answerApplicationQuestion = async (
  retrievedContext: string,
  question: string,
  jobContext?: JobContext
): Promise<string> => {

  let prompt = `QUESTION: "${question}"\n\n`;
  
  if (jobContext) {
    prompt += `CONTEXT (Target Job): ${jobContext.jobTitle} at ${jobContext.companyName}\n${jobContext.jobDescription}\n\n`;
  }

  prompt += `
  --- RETRIEVED USER EXPERIENCE ---
  ${retrievedContext}
  ---------------------------------
  
  TASK:
  Draft a high-quality answer to this specific application question using the provided USER EXPERIENCE.
  - Be specific and use STAR method (Situation, Task, Action, Result) if applicable.
  - Keep it focused on why I am a good fit.
  - Do NOT invent facts not present in the experience context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        temperature: 0.5,
      },
    });
    return response.text || "Failed to generate answer.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};