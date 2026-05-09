import { GoogleGenAI, Type } from "@google/genai";

export interface OptimizationInput {
  resumeText: string;
  jobDescription: string;
  mode: string;
  targetAudience: string;
  customPrompt?: string;
}

/**
 * Step 1: Extract only the most relevant data from the resume using Gemini (cheap)
 */
export async function extractRelevantResumeData(resumeText: string, geminiApiKey: string): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const prompt = `
    Extract the most important information from this resume for a job application.
    Focus on:
    1. Key skills (technical and soft)
    2. Most recent 3-4 professional experiences (Role, Company, Key Achievements)
    3. Education summary
    4. Certifications
    
    Return the data as a clean, structured JSON object.
    
    RESUME:
    ${resumeText}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  
  const text = response.text || "";
  
  try {
    // Basic JSON extraction from markdown if needed
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse extracted resume data:", e);
    return { raw: resumeText.substring(0, 2000) }; // Fallback
  }
}

/**
 * Step 1b: Extract key requirements and keywords from the JD using Gemini (cheap)
 */
export async function extractJDKeywords(jobDescription: string, geminiApiKey: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const prompt = `
    Extract the top 15-20 essential keywords and requirements from this job description.
    Include technical skills, tools, methodologies, and soft skills mentioned.
    
    Return only a JSON array of strings.
    
    JOB DESCRIPTION:
    ${jobDescription}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  
  const text = response.text || "";
  
  try {
    const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] || text;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JD keywords:", e);
    return [];
  }
}

/**
 * Step 2: Trim and structure content to minimize tokens for the expensive AI call
 */
export function trimContentForAI(structuredData: any, keywords: string[]): any {
  // Limit bullets per job to save tokens
  if (structuredData.experience && Array.isArray(structuredData.experience)) {
    structuredData.experience = structuredData.experience.map((exp: any) => ({
      ...exp,
      achievements: exp.achievements ? exp.achievements.slice(0, 5) : []
    }));
  }

  // Remove redundant or low-value fields if they exist
  delete structuredData.references;
  delete structuredData.hobbies;

  return {
    ...structuredData,
    target_keywords: keywords
  };
}
