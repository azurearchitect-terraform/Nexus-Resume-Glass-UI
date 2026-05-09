import crypto from 'crypto';
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

/**
 * Token Optimization Strategy
 */

/**
 * Trims input text to a reasonable limit before sending to any AI
 */
export function trimInput(text: string, maxLength: number = 8000): string {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

const cache = new Map<string, any>();

export function clearCache() {
  cache.clear();
}

export function saveToCache(key: string, data: any) {
  cache.set(key, data);
}

export function getFromCache(key: string) {
  return cache.get(key);
}

export async function extractRelevantResumeData(resumeText: string, geminiApiKey: string, openaiApiKey: string = '', pipelineType: string = 'hybrid-gemini') {
  const isHybridOpenAI = pipelineType === 'hybrid-openai' && openaiApiKey;

  if (isHybridOpenAI) {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const trimmedResume = trimInput(resumeText, 15000);
    const prompt = `
      Extract the FULL structured data from this resume.
      STRICT RULE: You MUST extract EVERY SINGLE professional role and EVERY SINGLE project mentioned. 
      Do not skip any roles, even if they are very old.
      
      For each role, extract ALL of its original achievement bullets into the "achievements" array.

      Return ONLY a JSON object:
      {
        "personal_info": { "name": "Extract Full Name", "location": "City, State", "email": "email address", "phone": "phone number", "linkedin": "linkedin profile url" },
        "summary": "Full professional overview",
        "skills": {
          "Technical": ["Skill 1", "Skill 2"],
          "Tools": ["Tool 1", "Tool 2"],
          "Management": ["Leadership", "Team Management"]
        },
        "experience": [
          {
            "role": "EXACT Job Title",
            "company": "EXACT Company Name",
            "duration": "Dates (e.g. June 2020 - Present)",
            "achievements": ["Original Bullet 1", "Original Bullet 2", "... all other bullets ..."]
          },
          ... include ALL other roles here ...
        ],
        "projects": [
          { "name": "Project Name", "description": "Full Description", "technologies": ["Tech 1", "Tech 2"] }
        ],
        "education": [ { "school": "University Name", "degree": "Degree Earned", "year": "Year" } ],
        "certifications": [
          { "name": "Cert Name", "issuer": "Issuing Body", "date": "Date" }
        ]
      }
      
      RESUME TEXT:
      ${trimmedResume}
    `;

    try {
      console.log(`[Nexus AI] Stage 1: Extraction. Attempting with OpenAI (gpt-4o)...`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const text = completion.choices[0].message.content || "";
      const parsed = JSON.parse(text);
      return { 
        data: parsed, 
        usage: { promptTokenCount: completion.usage?.prompt_tokens, candidatesTokenCount: completion.usage?.completion_tokens, totalTokenCount: completion.usage?.total_tokens }, 
        _model: "gpt-4o" 
      };
    } catch (error) {
      console.error("Error extracting resume data with OpenAI:", error);
    }
  }

  const genAI = new GoogleGenAI(geminiApiKey ? { apiKey: geminiApiKey } : {});
  const trimmedResume = trimInput(resumeText, 15000);

  const prompt = `
    Extract the FULL structured data from this resume.
    STRICT RULE: You MUST extract EVERY SINGLE professional role and EVERY SINGLE project mentioned. 
    Do not skip any roles, even if they are very old.
    
    For each role, extract ALL of its original achievement bullets into the "achievements" array.

    Return ONLY a JSON object:
    {
      "personal_info": { "name": "Full Name", "location": "City, State", "email": "email", "phone": "phone", "linkedin": "linkedin url" },
      "summary": "Professional overview",
      "skills": {
        "Technical": ["Skill 1", "Skill 2"],
        "Soft Skills": ["Skill 1", "Skill 2"]
      },
      "experience": [
        {
          "role": "EXACT Job Title",
          "company": "EXACT Company Name",
          "duration": "Dates",
          "achievements": ["Bullet 1", "Bullet 2", "... all other bullets ..."]
        },
        ... include ALL other roles here ...
      ],
      "projects": [
        { "name": "Project Name", "description": "Description", "technologies": ["Tech 1"] }
      ],
      "education": [ { "school": "University", "degree": "Degree", "year": "Year" } ],
      "certifications": [
        { "name": "Cert Name", "issuer": "Issuing Body", "date": "Date" }
      ]
    }
    
    RESUME TEXT:
    ${trimmedResume}
  `;

  // Stage 1: Extraction
  let primaryModel = "gemini-3.1-pro-preview";
  let fallbackModel = "gemini-3.1-flash-lite-preview";

  try {
    try {
      console.log(`[Nexus AI] Stage 1: Extraction. Attempting with ${primaryModel}...`);
      const response = await genAI.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      
      if (parsed) {
        return { data: parsed, usage: (response as any).usageMetadata, _model: primaryModel };
      }
    } catch (quotaError: any) {
      const errorMsg = quotaError?.message?.toLowerCase() || "";
      if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("resource_exhausted")) {
        console.warn(`[Optimization] ${primaryModel} quota reached. Falling back to ${fallbackModel}...`);
        const response = await genAI.models.generateContent({
          model: fallbackModel,
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        
        if (parsed) {
          return { data: parsed, usage: (response as any).usageMetadata, _model: fallbackModel };
        }
      } else {
        throw quotaError;
      }
    }
    return { data: null, usage: null };
  } catch (error) {
    console.error("Error extracting resume data:", error);
    return { data: null, usage: null };
  }
}

export async function extractJDKeywords(jobDescription: string, geminiApiKey: string, openaiApiKey: string = '', pipelineType: string = 'hybrid-gemini') {
  const isHybridOpenAI = pipelineType === 'hybrid-openai' && openaiApiKey;

  if (isHybridOpenAI) {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const trimmedJD = trimInput(jobDescription, 10000);
    const prompt = `
      Extract the top 12 essential keywords and requirements from this job description.
      Return ONLY a JSON array of strings.
      
      JD:
      ${trimmedJD}
    `;

    try {
      console.log(`[Nexus AI] Stage 1: JD Keywords. Attempting with OpenAI (gpt-4o)...`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const text = completion.choices[0].message.content || "";
      const parsed = JSON.parse(text);
      // Expected output is a JSON array
      const keywords = (parsed && Array.isArray(parsed)) ? parsed : (parsed.keywords || []);
      return { 
        data: keywords, 
        usage: { promptTokenCount: completion.usage?.prompt_tokens, candidatesTokenCount: completion.usage?.completion_tokens, totalTokenCount: completion.usage?.total_tokens }, 
        _model: "gpt-4o" 
      };
    } catch (error) {
      console.error("Error extracting JD keywords with OpenAI:", error);
    }
  }

  const genAI = new GoogleGenAI(geminiApiKey ? { apiKey: geminiApiKey } : {});
  const trimmedJD = trimInput(jobDescription, 10000);

  const prompt = `
    Extract the top 12 essential keywords and requirements from this job description.
    Return ONLY a JSON array of strings.
    
    JD:
    ${trimmedJD}
  `;

  // Stage 1: JD Analysis
  let primaryModel = "gemini-3.1-pro-preview";
  let fallbackModel = "gemini-3.1-flash-lite-preview";

  try {
    try {
      console.log(`[Nexus AI] Stage 1: JD Keywords. Attempting with ${primaryModel}...`);
      const response = await genAI.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const keywords = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      if (keywords && keywords.length > 0) {
        return { data: keywords, usage: (response as any).usageMetadata, _model: primaryModel };
      }
    } catch (quotaError: any) {
      const errorMsg = quotaError?.message?.toLowerCase() || "";
      if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("resource_exhausted")) {
        console.warn(`[Optimization] ${primaryModel} quota reached. Falling back to ${fallbackModel}...`);
        const response = await genAI.models.generateContent({
          model: fallbackModel,
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const text = response.text || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const keywords = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        
        if (keywords && keywords.length > 0) {
          return { data: keywords, usage: (response as any).usageMetadata, _model: fallbackModel };
        }
      } else {
        throw quotaError;
      }
    }
    return { data: [], usage: null };
  } catch (error) {
    console.error("Error extracting JD keywords:", error);
    return { data: [], usage: null };
  }
}

export function trimContentForAI(resumeData: any, keywords: string[]) {
  // Normalize skills
  let uniqueSkills: string[] = [];
  if (Array.isArray(resumeData.skills)) {
    const seenSkills = new Set<string>();
    uniqueSkills = resumeData.skills.filter((s: string) => {
      const normalized = s.toLowerCase().trim();
      if (seenSkills.has(normalized)) return false;
      seenSkills.add(normalized);
      return true;
    });
  } else if (typeof resumeData.skills === 'object' && resumeData.skills !== null) {
    // If it's the categorized object we requested
    Object.values(resumeData.skills).forEach((group: any) => {
      if (Array.isArray(group)) {
        group.forEach((s: string) => {
          if (typeof s === 'string') uniqueSkills.push(s);
        });
      }
    });
  }

  // Ensure we don't exceed reasonable limits but provide enough for Step 3
  return {
    personal_info: resumeData.personal_info || {},
    // Trim summary to ~150 words
    summary: resumeData.summary?.substring(0, 1000),
    skills: uniqueSkills.slice(0, 30),
    experience: (resumeData.experience || []).map((exp: any, index: number) => {
      const seenBullets = new Set<string>();
      return {
        id: `role_${index + 1}`,
        role: exp.role || exp.title || '',
        company: exp.company || exp.employer || '',
        duration: exp.duration || exp.dates || '',
        // Remove duplicate bullets and provide up to 20 for AI selection (increased from 10)
        original_bullets: (exp.achievements || exp.bullets || [])
          .filter((a: string) => {
            const normalized = a.toLowerCase().trim();
            if (seenBullets.has(normalized)) return false;
            seenBullets.add(normalized);
            return true;
          })
          .slice(0, 20)
      };
    }),
    projects: (resumeData.projects || []).slice(0, 6),
    education: resumeData.education,
    certifications: resumeData.certifications,
    jd_keywords: (keywords || []).slice(0, 15)
  };
}

export function enforceFidelity(aiResponse: any, originalInput: any) {
  try {
    const aiData = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
    const originalExperience = originalInput.experience || [];
    const aiExperience = aiData.experience || [];

    // Create a map for quick lookup by ID
    const aiRoleMap = new Map();
    aiExperience.forEach((role: any) => {
      if (role.id) aiRoleMap.set(role.id, role);
    });

    // Reconstruct experience based STRICKLY on original structure
    const enforcedExperience = originalExperience.map((originalRole: any) => {
      const matchedAI = aiRoleMap.get(originalRole.id);
      
      return {
        role: originalRole.role,
        company: originalRole.company,
        duration: originalRole.duration,
        // If AI provided bullets for this role, use them. Otherwise, fallback to original.
        bullets: matchedAI?.bullets && Array.isArray(matchedAI.bullets) 
          ? matchedAI.bullets 
          : (originalRole.original_bullets || [])
      };
    });

    // Return the full object with enforced experience
    return {
      ...aiData,
      experience: enforcedExperience
    };
  } catch (error) {
    console.error("[Fidelity] Error enforcing structure:", error);
    return aiResponse; // Fallback to raw if logic fails
  }
}
