import { GoogleGenAI } from "@google/genai";

export async function runAgents(input: any, geminiKey: string) {
  const genAI = new GoogleGenAI({ apiKey: geminiKey });

  const agents = {
    hr: "Improve clarity, impact, and alignment with STAR methodology. Flag weak verbs like 'Managed', 'Supported', 'Assisted'. Encourage stronger verbs like 'Spearheaded', 'Led', 'Directed'.",
    ats: "Optimize for ATS keywords (Azure Infrastructure Architect, Cloud Infrastructure Leader, Enterprise Cloud Architect, Hybrid Cloud, HA/DR, Cloud Reliability, Cloud Governance). Ensure clean hierarchy.",
    architect: "Enhance technical depth for Azure Infrastructure Leadership. Ensure no fake Kubernetes/DevOps exaggeration. Allowed verbs: 'Architected', 'Spearheaded', 'Optimized', 'Standardized', 'Orchestrated', 'Led', 'Modernized'."
  };

  const results: any = {};

  for (const [key, instruction] of Object.entries(agents)) {
    const prompt = `
You are a ${key.toUpperCase()} resume expert.

${instruction}

INPUT:
${JSON.stringify(input)}

Return structured JSON.
`;

    try {
      const modelChain = ["gemini-3.5-flash", "gemini-3-flash-preview"];
      let res: any = null;
      let lastError: any = null;
      for (const model of modelChain) {
        try {
          console.log(`[Agent ${key}] Attempting run with model: ${model}`);
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
            console.warn(`[Agent ${key}] Quota error on ${model}. Trying fallback...`);
            continue;
          }
          throw err;
        }
      }
      if (!res) throw lastError || new Error(`Agent ${key} failed on all fallback models`);
      results[key] = JSON.parse(res.text || "{}");
    } catch (err) {
      console.error(`[Agent ${key}] Failed:`, err);
      results[key] = { error: "Agent failed" };
    }
  }

  return results;
}
