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
Optimize this structured resume data for the target role: ${targetRole || 'Professional'}.
Audience: ${audience || 'Recruiters'}. Mode: ${mode || 'Standard'}.
${customPrompt ? `Custom Instructions: ${customPrompt}` : ''}
${brainDump ? `ADDITIONAL CONTEXT (BRAIN DUMP): ${brainDump}\nSift through this raw data to extract hidden achievements.` : ''}

ROLE DATA:
${JSON.stringify(role)}

CORPORATE DNA TAILORING (DEMONSTRATE, DO NOT DECLARE):
${targetCompany ? `Tailor appropriately for ${targetCompany}. Focus on specific impacts and technologies relevant to their industry.` : ''}

GLOBAL SYSTEM RULES (STRICT ENFORCEMENT):
1. ZERO-SHOT ANTI-HALLUCINATION: Use ONLY the provided role data. Do NOT invent numbers, percentages, budgets, or metrics.
2. TENURE & TIMELINE AWARENESS: 
   - For short tenures (under 6 months): Focus on "Rapid Delivery," "Auditing," or "Assessment." CRITICAL: Do NOT alter the job title or append the word "(Contract)" to short roles. Leave the title exactly as provided.
3. BREVITY & DENSITY CONSTRAINT: Recruiters skim. Bullet points MUST be concise and dense. Do NOT exceed 15 words per bullet point. Prioritize hard skills, tools, and metrics over verbose corporate jargon.
4. CRITICAL BULLET COUNT RULE: You MUST NOT generate more bullet points than what is provided in the source ROLE DATA, and respect caps for top jobs (1st: 4 max, 2nd: 4 max, 3rd: 4 max, 4th: 3 max).
5. THE BALANCED IaC RULE: Terraform/IaC is permitted, but strictly limited to 2 bullet points TOTAL across the entire resume. Use only execution-focused verbs: "Deployed," "Maintained," "Utilized," or "Provisioned."
6. OLDER ROLE COMPRESSION: For any role before 2018, generate EXACTLY one (1) high-impact bullet point.
7. GLOBAL NEGATIVE CONSTRAINTS: ABSOLUTELY FORBIDDEN: "CI/CD", "Pipelines", "DevOps", "Kubernetes", "Ansible", "GitOps". These terms MUST NOT appear anywhere in the output. Focus descriptions entirely on Azure Migration, FinOps, HA/DR, and Governance.
8. PLAYER-COACH MODE: ONLY IF mode is 'Player-Coach':
   - BALANCE: 60% Execution (Azure infra), 40% Leadership (Mentoring, Architecture reviews).
   - HYBRID VOCABULARY: Use "Architected & Led," "Designed & Mentored," "Engineered & Standardized."

OUTPUT SCHEMA:
Return ONLY a valid JSON array of strings containing the high-impact bullet points for this role. Do not include keys, objects, or markdown formatting outside the array. Example: ["Bullet 1", "Bullet 2"]
`;

    try {
      const res = await genAI.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

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
