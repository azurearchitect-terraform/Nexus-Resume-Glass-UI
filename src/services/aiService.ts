import { GoogleGenAI } from "@google/genai";
import { optimizeResume, getDecryptedKey } from "./geminiService";

export const optimizeFullResume = async (
  resumeData: any,
  jobDescription: string,
  targetRole: string,
  aiEngine: string = "gemini-3-flash-preview",
  audience: string = "Enterprise",
  config?: any
) => {
  try {
    const result = await optimizeResume(
      JSON.stringify(resumeData),
      jobDescription,
      targetRole,
      "balanced",
      audience,
      config || { 
        mode: 'gemini',
        geminiConfig: {
          engine: 'gemini',
          model: aiEngine,
          apiKey: ''
        },
        openaiConfig: {
          engine: 'openai',
          model: 'gpt-4o-mini',
          apiKey: ''
        }
      }
    );

    return result;
  } catch (error) {
    console.error("Full Optimization Error:", error);
    throw error;
  }
};

export const improveTextWithAI = async (
  text: string, 
  context?: { jobDescription?: string; targetRole?: string; aiEngine?: string; apiKey?: string }
) => {
  try {
    const apiKey = await getDecryptedKey(context?.apiKey || '');
    const ai = new GoogleGenAI({ apiKey });
    const modelName = context?.aiEngine || "gemini-3-flash-preview";
    
    const prompt = `
      You are a senior FAANG resume strategist.
      
      Tasks:
      1. Rewrite tailored to the job description.
      2. BREVITY & LEADERSHIP: Focus on short, punchy bullet points (<1.5 lines). Use more, smaller bullet points to drive impact. Include leadership impact (mentoring, leading cross-functional teams) alongside metric-driven results.
      3. GOOGLE XYZ FORMULA: Follow "Accomplished [X] by [Y] through [Z]". Ensure every bullet conveys either hard outcome metrics OR demonstrated leadership.
      4. ACTION VERBS: Start with strong verbs (Spearheaded, Architected, Mentored, Optimized).
      5. No fluff: Replace "Responsible for..." or "Helped with..." with high-impact accomplishments.
      6. TITLE PRESERVATION (CRITICAL): STRICTLY preserve exact role titles (e.g., preserve "Officer IT cum Logistics").
      
      Output:
      - Clean structured resume
      - No explanations
      
      Original Text:
      "${text}"
      
      ${context?.targetRole ? `Target Role: ${context.targetRole}` : ''}
      ${context?.jobDescription ? `Job Description: ${context.jobDescription}` : ''}
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
    });

    const result = response.text?.trim() || text;
    return result.replace(/Office IT [Cc]um Logistics/g, 'Officer IT cum Logistics');
  } catch (error) {
    console.error("AI Improvement Error:", error);
    return text;
  }
};

export const rewriteSectionWithAI = async (
  sectionType: string, 
  content: any, 
  context?: { jobDescription?: string; targetRole?: string; aiEngine?: string; apiKey?: string }
) => {
  try {
    const apiKey = await getDecryptedKey(context?.apiKey || '');
    const ai = new GoogleGenAI({ apiKey });
    const modelName = context?.aiEngine || "gemini-3-flash-preview";

    const prompt = `
      You are a senior FAANG resume strategist.
      
      Tasks:
      1. Rewrite tailored to the job description.
      2. BREVITY & LEADERSHIP: Focus on short, punchy bullet points (<1.5 lines). Use more, smaller bullet points to drive impact. Include leadership impact (mentoring, leading cross-functional teams) alongside metric-driven results.
      3. GOOGLE XYZ FORMULA: Follow "Accomplished [X] by [Y] through [Z]". Ensure every bullet conveys either hard outcome metrics OR demonstrated leadership.
      4. ACTION VERBS: Start with strong verbs (Spearheaded, Architected, Mentored, Optimized).
      5. No fluff: Replace "Responsible for..." or "Helped with..." with high-impact accomplishments.
      6. TITLE PRESERVATION (CRITICAL): STRICTLY preserve exact role titles (e.g., preserve "Officer IT cum Logistics").
      
      Output:
      - Clean structured resume in JSON format
      - No explanations
      
      Section Type: ${sectionType}
      ${context?.targetRole ? `Target Role: ${context.targetRole}` : ''}
      ${context?.jobDescription ? `Job Description: ${context.jobDescription}` : ''}
      
      Current Content:
      ${JSON.stringify(content, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = response.text?.trim();
    if (!result) return content;

    const parsed = JSON.parse(result);

    // FAIL-SAFE: Ensure "Officer IT cum Logistics" is preserved
    const fixTitle = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/Office IT [Cc]um Logistics/g, 'Officer IT cum Logistics');
      }
      if (Array.isArray(obj)) {
        return obj.map(fixTitle);
      }
      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = fixTitle(obj[key]);
        }
        return newObj;
      }
      return obj;
    };

    return fixTitle(parsed);
  } catch (error) {
    console.error("AI Section Rewrite Error:", error);
    return content;
  }
};
