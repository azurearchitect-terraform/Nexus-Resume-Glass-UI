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
3. BREVITY & DENSITY: Recruiters skim. Bullet points should be concise and impactful. Prioritize hard skills, tools, and metrics.
4. COMPREHENSIVE DETAIL: Include all significant achievements provided in the source ROLE DATA. Do not arbitrarily cap the number of bullet points unless necessary for layout (aim for high impact).
5. CLOUD & INFRASTRUCTURE: Use professional terminology naturally.
6. NO ARBITRARY COMPRESSION: Older roles should still be accurately represented with multiple bullet points if the source data contains them.
7. ACCURATE TERMINOLOGY: Include all relevant technical skills and tools (e.g., CI/CD, DevOps, Cloud Platforms) as they appear in the source data.
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
