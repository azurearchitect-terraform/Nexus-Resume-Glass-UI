import { GoogleGenAI } from "@google/genai";

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

  const promises = experience.map(async (role, index) => {
    const prompt = `
ACT AS:
You are a Senior Prompt Engineer with 5+ years of experience specializing in FAANG-level resume engineering, executive branding, ATS optimization, enterprise cloud leadership positioning, and STAR-method resume transformation.

YOUR ROLE:
You are a Principal Resume Strategist, FAANG Technical Recruiter, and Cloud Leadership Branding Expert.

PRIMARY OBJECTIVE:
Optimize the candidate's experience entry for the target role: ${targetRole || 'Senior Azure Infrastructure Leader'}.
Audience: ${audience || 'Recruiters'}. Mode: ${mode || 'Standard'}.
${customPrompt ? `Custom Instructions: ${customPrompt}` : ''}
${brainDump ? `ADDITIONAL CONTEXT (BRAIN DUMP): ${brainDump}\nSift through this raw data to extract hidden achievements.` : ''}

ROLE DATA:
${JSON.stringify(role)}

CORPORATE DNA TAILORING (DEMONSTRATE, DO NOT DECLARE):
${targetCompany ? `Tailor appropriately for ${targetCompany}. Focus on specific impacts and technologies relevant to their industry.` : ''}

GLOBAL SYSTEM RULES (STRICT ENFORCEMENT):
1. ZERO-SHOT ANTI-HALLUCINATION & TRUTHFULNESS: Use ONLY the provided role data. Do NOT invent numbers, percentages, budgets, or metrics.
   - NEVER fabricate experience.
   - NEVER create fake Kubernetes production experience or fake CI/CD ownership.
   - NEVER exaggerate DevOps or claim deep Terraform engineering expertise (keep IaC references truthful and limited).
   - NEVER imply software engineering or coding-heavy background.
2. STAR METHODOLOGY: EVERY bullet point MUST follow STAR methodology (Situation, Task, Action, Result) naturally:
   - What was the business/technical challenge? (S/T)
   - What ownership/action did you take and what technologies/processes were used? (A)
   - What was the measurable outcome or impact? (R)
3. VERB CONTROL:
   - AVOID weak verbs: Managed, Supported, Assisted, Helped, Worked on, Responsible for.
   - USE stronger but truthful verbs: Architected, Spearheaded, Optimized, Standardized, Orchestrated, Led, Directed, Improved, Implemented, Streamlined, Governed, Enhanced, Coordinated, Modernized, Transformed.
4. BREVITY & DENSITY: Keep bullet points concise, high-impact, and technically dense. Use executive-style language.
5. BULLET QUANTITY: Output a MAXIMUM of 4 bullet points for this role. If it is an older role (pre-2018), output EXACTLY one (1) bullet point.
6. PRESERVE TITLES: Do NOT modify job titles under any circumstances. Leave them exactly as provided in the ROLE DATA.
7. GOOGLE XYZ FORMULA: Incorporate the XYZ formula with STAR: "Accomplished [X] as measured by [Y], by doing [Z]."
   - [X] = The impact or accomplishment.
   - [Y] = The metrics, data, or scale (e.g. cost savings, MTTR reduction, availability, team size, subscription scale).
   - [Z] = The mechanism, action, or skill used.
   - IF A BULLET HAS NO METRICS: Highlight the clear qualitative outcome/result of the action (e.g., reducing operational complexity, ensuring compliance governance).
8. PLAYER-COACH MODE: ONLY IF mode is 'Player-Coach':
   - 60/40 BALANCE: 60% Execution (Azure infra, governance, HA/DR), 40% Leadership (Mentoring, Agile coordination).
   - Use hybrid vocabulary: "Architected & Led", "Designed & Mentored", "Standardized & Orchestrated".

OUTPUT SCHEMA:
Return ONLY a valid JSON array of strings containing the high-impact bullet points for this role. Do not include keys, objects, or markdown formatting outside the array. Example: ["Bullet 1", "Bullet 2"]
`;

    try {
      const modelChain = ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3-flash-preview"];
      let res: any = null;
      let lastError: any = null;
      for (const model of modelChain) {
        try {
          console.log(`[RoleGen] Attempting generation for role ${index + 1} with model: ${model}`);
          res = await genAI.models.generateContent({
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
