import { GoogleGenAI } from "@google/genai";
import { PromptOrchestrator, OptimizationMode, PersonaStyle } from "./promptOrchestrator";

export async function generatePerRole(
  experience: any[], 
  geminiKey: string, 
  targetCompany?: string, 
  targetRole?: string,
  audience?: string,
  mode?: string,
  customPrompt?: string,
  brainDump?: string
) {
  const genAI = new GoogleGenAI({ apiKey: geminiKey });
  
  const cleanApiKey = (key: string): string => {
    if (!key) return '';
    return key.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '').replace(/^["']|["']$/g, '');
  };

  const genAIWithCleanKey = new GoogleGenAI({ apiKey: cleanApiKey(geminiKey) });

  const promises = experience.map(async (role, index) => {
    const companyLower = (role.company || "").toLowerCase();
    const isConcentrix = companyLower.includes("concentrix");
    const isMM = companyLower.includes("m&m") || companyLower.includes("software development centre") || companyLower.includes("m&m software");
    const isArcher = companyLower.includes("archer");
    const isCasepoint = companyLower.includes("casepoint");
    const isHCL = companyLower.includes("hcltech") || companyLower.includes("hcl technologies");

    let bulletRule = "";
    if (isConcentrix || isMM) {
      bulletRule = "Output a MAXIMUM of 5 to 6 bullet points for this role. Each bullet point should be high-impact and can span up to 2 lines of text.";
    } else if (isArcher) {
      bulletRule = "Output exactly 4 to 5 high-impact bullet points for this role. Each bullet point should be strictly one-line (1-line).";
    } else if (isCasepoint) {
      bulletRule = "Output exactly 4 high-impact bullet points for this role. Each bullet point should be strictly one-line (1-line).";
    } else {
      bulletRule = "Preserve all original bullet points and achievements. Optimize their wording to be professional, realistic, and recruiter-safe but do not delete or truncate them aggressively. Max 3 to 5 bullets per role, maintaining their original scope and technical detail. Every single bullet point for this role MUST be strictly a one-line (1-line) description.";
    }

    // Resolve optimization mode
    let optMode: OptimizationMode = 'balanced';
    if (mode === 'conservative') optMode = 'conservative';
    if (mode === 'aggressive') optMode = 'aggressive';

    // Title-to-Tone validation for persona style
    const isLeadership = /director|manager|lead|head|executive|vp|chief|principal/i.test(targetRole || role.role || '');
    let persona: PersonaStyle = isLeadership ? 'executive_leadership' : 'technical_ic';
    
    // Automatic downgrade rules
    if (isConcentrix) {
      persona = 'delivery_lead';
    }
    if (isHCL) {
      persona = 'technical_ic';
    }

    const platformGovernance = PromptOrchestrator.getCombinedDirectives({
      mode: optMode,
      persona: persona,
      targetCompany: role.company,
      duration: role.duration
    });

    const prompt = `
ACT AS:
You are an Enterprise Resume Intelligence Agent.

PRIMARY OBJECTIVE:
Optimize the candidate's experience entry for the target role: ${targetRole || 'Senior Azure Infrastructure Leader'}.
Audience: ${audience || 'Recruiters'}. Mode: ${optMode}. Persona calibrated as: ${persona}.
${customPrompt ? `Custom Instructions: ${customPrompt}` : ''}
${brainDump ? `ADDITIONAL CONTEXT (BRAIN DUMP): ${brainDump}\nSift through this raw data to extract hidden achievements.` : ''}

ROLE DATA:
${JSON.stringify(role)}

CORPORATE DNA TAILORING (DEMONSTRATE, DO NOT DECLARE):
${targetCompany ? `Tailor appropriately for ${targetCompany}. Focus on specific impacts and technologies relevant to their industry.` : ''}

GLOBAL GOVERNANCE SYSTEM DIRECTIVES:
${platformGovernance}

FORMATTING RULES:
- BULLET QUANTITY & DURATION SPECIFIC RULES: ${bulletRule}
- PRESERVE TITLES: Do NOT modify job titles under any circumstances. Leave them exactly as provided in the ROLE DATA.
- GOOGLE XYZ FORMULA: Incorporate the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]."
  - [X] = The impact or accomplishment.
  - [Y] = The metrics, data, or scale (e.g. cost savings, MTTR reduction, availability, team size, subscription scale).
  - [Z] = The mechanism, action, or skill used.
  - IF A BULLET HAS NO METRICS (e.g. MetricConfidence is weakly_inferred or generated): Focus on operational credibility, technical ownership, and governance stability. Do NOT fabricate percentages.

OUTPUT SCHEMA:
Return ONLY a valid JSON array of strings containing the optimized bullet points for this role. Do not include keys, objects, or markdown formatting outside the array. Example: ["Bullet 1", "Bullet 2"]
`;

    try {
      const modelChain = ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
      let res: any = null;
      let lastError: any = null;
      for (const model of modelChain) {
        try {
          console.log(`[RoleGen] Attempting generation for role ${index + 1} with model: ${model}`);
          res = await genAIWithCleanKey.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
          });
          break;
        } catch (err: any) {
          lastError = err;
          const errorMsg = err?.message?.toLowerCase() || "";
          const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("limit") || errorMsg.includes("exhausted");
          if (isQuotaError) {
            console.warn(`[RoleGen] Quota error on ${model}. Trying fallback...`);
            continue;
          }
          throw err;
        }
      }
      if (!res) throw lastError || new Error("All models in the chain failed for role optimization");

      const text = res.text || "[]";
      let bullets = [];
      try {
        const parsed = JSON.parse(text);
        bullets = Array.isArray(parsed) ? parsed : (parsed.bullets || []);
      } catch (e) {
        console.error(`[RoleGen] JSON Parse error for ${role.id || index}:`, e);
      }

      return {
        id: role.id || `role_${index + 1}`,
        role: role.role,
        company: role.company,
        duration: role.duration,
        bullets: bullets
      };
    } catch (err) {
      console.error(`[RoleGen] Failed for ${role.id || index}:`, err);
      return {
        id: role.id || `role_${index + 1}`,
        role: role.role,
        company: role.company,
        duration: role.duration,
        bullets: role.original_bullets || []
      };
    }
  });

  return Promise.all(promises);
}
