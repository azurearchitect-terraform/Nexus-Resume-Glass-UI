import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import { jsonrepair } from "jsonrepair";
import { routeTask, RouterConfig } from "./aiRouter";
import { MasterResume, SuitabilityResult, Certification, StarStory, AuditReport } from "../types";
import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { db, auth } from "../firebase";
import { PromptOrchestrator, OptimizationMode, PersonaStyle } from "./promptOrchestrator";

export interface OptimizationResult {
  personal_info: {
    name: string;
    location: string;
    email: string;
    phone: string;
    linkedin: string;
    linkedinText?: string;
  };
  summary: string;
  skills: {
    Infrastructure: string[];
    DevSecOps: string[];
    Governance: string[];
    Observability: string[];
  };
  experience: {
    role: string;
    company: string;
    duration: string;
    bullets: string[];
  }[];
  certifications: (string | Certification)[];
  projects: { title: string; description: string }[];
  education: string[];
  ats_keywords_from_jd: string[];
  ats_keywords_added_to_resume: string[];
  keyword_gap: string[];
  match_score: number;
  baseline_score: number;
  improvement_notes: string[];
  audience_alignment_notes: string;
  why_this_job?: string;
  rejection_reasons?: string[];
  star_stories?: StarStory[];
  audit_report?: AuditReport;
  authenticity_audit?: {
    realism_score: number;
    flagged_phrases: string[];
    compliance_checklist: {
      no_fake_metrics: boolean;
      no_overused_ai_verbs: boolean;
      realistic_tenure_positioning: boolean;
      accurate_team_size: boolean;
      humanized_language: boolean;
    };
  };
  cover_letter?: string;
  _usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  _geminiUsage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  _intermediateData?: {
    resumeData: any;
    jdKeywords: string[];
  };
  _engine?: string;
  _model?: string;
}

export type EngineType = 'gemini' | 'openai';

export interface EngineConfig {
  engine: EngineType;
  model: string;
  apiKey?: string; // This will now hold the encrypted API key
}

function extractJson(text: string): string {
  if (!text) return "";
  
  // Try to find JSON block in markdown
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  let extracted = text;
  if (jsonMatch && jsonMatch[1]) {
    extracted = jsonMatch[1].trim();
  } else {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');

    if (firstBrace !== -1 && firstBracket !== -1) {
      if (firstBrace < firstBracket) {
        extracted = text.substring(firstBrace).trim();
      } else {
        extracted = text.substring(firstBracket).trim();
      }
    } else if (firstBrace !== -1) {
      extracted = text.substring(firstBrace).trim();
    } else if (firstBracket !== -1) {
      extracted = text.substring(firstBracket).trim();
    } else {
      extracted = text.trim();
    }
  }

  try {
    return jsonrepair(extracted);
  } catch (e) {
    console.error("Failed to repair JSON:", e);
    return extracted;
  }
}

function cleanApiKey(key: string): string {
  if (!key) return '';
  // Trim whitespaces, newlines, strip non-printable/control ASCII characters, and remove outer quotes
  return key.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '').replace(/^["']|["']$/g, '');
}

export async function getDecryptedKey(encryptedKey: string): Promise<string> {
  const idToken = await auth.currentUser?.getIdToken();

  if (encryptedKey && !encryptedKey.includes(':')) {
    return cleanApiKey(encryptedKey);
  }

  try {
    const response = await fetch('/api/decrypt-keys', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ encryptedKey })
    });
    if (response.ok) {
      const data = await response.json();
      const rawKey = data.keys?.gemini || data.keys?.openai || '';
      return cleanApiKey(rawKey);
    }
  } catch (e) {
    console.warn("Failed to decrypt key:", e);
  }
  return '';
}

const FALLBACK_GEMINI_MODEL = 'gemini-3.5-flash';

async function callAI(prompt: string, model: string, engine: EngineType, encryptedKey?: string) {
  const idToken = await auth.currentUser?.getIdToken();

  if (engine === 'openai' && !encryptedKey) {
    throw new Error("OpenAI API Key is missing. Please save your profile first.");
  }

  // Fallback Logic definitions
  
  if (engine === 'gemini') {
    // Gemini MUST be called from the frontend as per guidelines
    try {
      const apiKey = await getDecryptedKey(encryptedKey || "");
      
      if (!apiKey) {
        throw new Error("Gemini API key is missing. Please provide your own key in settings or contact the administrator.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const getFallbackChain = (startModel: string): string[] => {
        switch (startModel) {
          case 'gemini-3.1-pro-preview':
          case 'gemini-3-flash-preview':
            return ['gemini-3-flash-preview', 'gemini-3.5-flash'];
          case 'gemini-3.5-flash':
            return ['gemini-3.5-flash', 'gemini-3-flash-preview'];
          default:
            return [startModel, 'gemini-3.5-flash', 'gemini-3-flash-preview'];
        }
      };

      // Attempt primary model, fallback on error
      const executeWithFallback = async (modelToTry: string): Promise<any> => {
        const isThinkingModel = modelToTry.includes('thinking') || modelToTry.includes(':thinking');
        let cleanedStart = modelToTry.replace(':thinking', '');
        
        // Exact model mapping without substring replacement issues
        if (cleanedStart === 'gemini-1.5-pro') {
          cleanedStart = 'gemini-3.1-pro-preview';
        } else if (cleanedStart === 'gemini-1.5-flash' || cleanedStart === 'gemini-3.1-flash') {
          cleanedStart = 'gemini-3-flash-preview';
        }

        const chain = getFallbackChain(cleanedStart);
        let lastError: any = null;

        for (const modelName of chain) {
          try {
            console.log(`[Gemini Service] Attempting execution with model: ${modelName}`);
            const response = await ai.models.generateContent({ 
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: prompt.toLowerCase().includes('json') ? "application/json" : "text/plain",
                thinkingConfig: isThinkingModel ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
              }
            });

            return {
              result: response.text || "",
              usage: {
                promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata?.totalTokenCount || 0
              }
            };
          } catch (innerError: any) {
            lastError = innerError;
            const errorMsg = innerError?.message?.toLowerCase() || "";
            console.warn(`[Gemini Service] Model ${modelName} failed. Error: ${errorMsg}`);
          }
        }
        
        throw lastError || new Error(`All models in fallback chain failed.`);
      };

      return await executeWithFallback(model);
      
    } catch (error: any) {
      let errorMessage = error?.message || String(error);
      
      // Try to parse Gemini error if it's a JSON string
      try {
        if (errorMessage.startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // Not a JSON string, ignore
      }

      console.error("Gemini Frontend Error:", errorMessage);
      throw new Error(errorMessage);
    }
  } else {
    // OpenAI and other engines can stay on the backend
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt,
          model,
          engine,
          encryptedKey
        })
      });

      if (!response.ok) {
        let errorMsg = "Backend AI Call Failed";
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`[AI Service] OpenAI execution failed:`, error);
      throw error;
    }
  }
}


export async function fetchJobDescription(url: string, config: RouterConfig): Promise<string> {
  const routedConfig = routeTask('extract_job_description', config);
  const prompt = `
You are an expert recruiter and data extractor.
Please read the following job posting URL and extract the full job description text.
Include the job title, company name, responsibilities, requirements, and any other relevant details.
Format the output as clean, readable text. Do not include any JSON formatting or extra conversational text.

JOB URL: ${url}
`;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    return data.result || "";
  } catch (error) {
    console.error("Error fetching job description:", error);
    throw error;
  }
}

export async function evaluateSuitability(
  resumeText: string,
  jobDescription: string,
  config: RouterConfig,
  fastMode: boolean = false
): Promise<SuitabilityResult> {
  const routedConfig = routeTask('evaluate_suitability', config);
  
  let modelToUse = routedConfig.model;
  if (fastMode && routedConfig.engine === 'gemini') {
    modelToUse = 'gemini-3.5-flash-lite';
  } else if (!modelToUse) {
    modelToUse = routedConfig.engine === 'openai' ? 'gpt-4o-mini' : 'gemini-3.5-flash-lite';
  }

  const prompt = `
You are an expert technical recruiter screening a candidate's resume against a job description.
The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
Your goal is to quickly evaluate if the candidate is a good fit, a stretch, or not recommended.
Additionally, perform a focus Audit identifying flaws in wording, metrics, and alignment.

CRITICAL INSTRUCTIONS FOR AUDIT:
1. Impact: Audit every bullet point. Do they convey clear impact? If not, flag it.
2. Metrics: Achievements should ideally have a metric (%, $, time, scale) or clear outcome. Flag any achievements that are vague.
3. Action Verbs: Ensure bullets start with strong action verbs. Flag passive language like "Participated in" or "Helped with".
4. Dates: A "Present" or "Current" end date in experience is perfectly valid. Do not flag current roles as having date errors.
5. Scoring: The matchScore represents alignment with the JD. The readinessScore represents overall resume professionality and polish.
6. Critique: Be specific. Point out exactly which bullets lack impact or are too wordy.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return ONLY a JSON object with the following structure:
{
  "verdict": "Strong Match" | "Stretch Role" | "Not Recommended",
  "matchScore": number (0-100),
  "dealbreakers": string[] (list of major missing requirements, empty if none),
  "strengths": string[] (list of key matching qualifications),
  "reasoning": string (1-2 sentences explaining the verdict),
  "readinessScore": number (0-100 overall professional readiness / resume quality),
  "critique": [
    {
      "category": "e.g., Metrics/Impact",
      "feedback": "Detailed constructive criticism",
      "severity": "low" | "medium" | "high"
    }
  ]
}
`;

  try {
    const data = await callAI(prompt, modelToUse, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    if (!resultText) throw new Error("No response from AI");
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error evaluating suitability:", error);
    throw error;
  }
}

export async function optimizeResume(
  resumeText: string,
  jobDescription: string,
  targetRole: string,
  mode: "conservative" | "balanced" | "aggressive" | "Player-Coach",
  audience: string,
  config: RouterConfig,
  linkedInUrl?: string,
  linkedInPdfText?: string,
  jobUrl?: string,
  fastMode: boolean = false,
  recruiterSimulationMode: boolean = false,
  customPrompt?: string,
  pipelineType?: string,
  targetCompany?: string,
  brainDump?: string,
  strictAtsMode: boolean = false,
  generateCoverLetter: boolean = false
): Promise<OptimizationResult> {
  const routedConfig = routeTask(recruiterSimulationMode ? 'recruiter_simulation' : 'rewrite_resume', config);
  
  // Cost-saving logic: If fastMode is enabled, prefer Gemini Flash even in Hybrid mode to reduce OpenAI costs
  let modelToUse = routedConfig.model;
  let engineToUse = routedConfig.engine;
  
  if (fastMode) {
    if (config.mode === 'production') {
      // In Hybrid mode, fastMode forces Gemini to save costs
      engineToUse = 'gemini';
      modelToUse = 'gemini-3.5-flash-lite';
    } else {
      // In single-engine mode, just use the smaller model
      modelToUse = routedConfig.engine === 'openai' ? 'gpt-4o-mini' : 'gemini-3.5-flash-lite';
    }
  }

  const isLeadershipRole = /director|manager|lead|head|executive|vp|chief|principal|senior manager/i.test(targetRole);
  const isTechnicalRole = /engineer|developer|architect|specialist|analyst|technician/i.test(targetRole);

  // V2 PIPELINE INTEGRATION: Use the optimized backend pipeline for production mode
  if ((config.mode === 'production' || pipelineType) && !recruiterSimulationMode && !fastMode) {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/v2/optimize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          targetRole,
          mode,
          audience,
          customPrompt,
          encryptedKey: config.openaiConfig.apiKey,
          pipelineType,
          targetCompany,
          brainDump,
          strictAtsMode,
          generateCoverLetter
        })
      });

      if (response.ok) {
        const data = await response.json();
        const resultText = extractJson(data.result || "");
        const parsed = JSON.parse(resultText);
        
        // Post-processing
        parsed._engine = 'hybrid-v2';
        if (data.usage) parsed._usage = data.usage;
        if (data.geminiUsage) parsed._geminiUsage = data.geminiUsage;
        if (data.intermediateData) parsed._intermediateData = data.intermediateData;
        
        // Apply UI formatting
        // Skills must be grouped into categories.
        const skillCategories = Object.keys(parsed.skills || {});
        const formattedSkills: Record<string, string[]> = {};
        
        // Use all categories provided by AI
        skillCategories.forEach(cat => {
          formattedSkills[cat] = parsed.skills[cat];
        });
        const defaultCats = isLeadershipRole 
          ? ["Strategic Leadership", "Management", "Operations", "Technical Proficiency"]
          : ["Core Technical", "Tools & Frameworks", "Process & Methodology", "Soft Skills"];
        while (Object.keys(formattedSkills).length < 4) {
          const nextCat = defaultCats.find(c => !formattedSkills[c]);
          if (nextCat) formattedSkills[nextCat] = [];
          else formattedSkills[`Category ${Object.keys(formattedSkills).length + 1}`] = [];
        }
        parsed.skills = formattedSkills;
        
        // Apply title fix to V2 results as well
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
      }
    } catch (e) {
      console.warn("V2 Pipeline failed, falling back to legacy optimization:", e);
    }
  }

  // Resolve optimization mode and persona dynamically for PromptOrchestrator
  let optMode: OptimizationMode = 'balanced';
  if (mode === 'conservative') optMode = 'conservative';
  if (mode === 'aggressive') optMode = 'aggressive';

  const isLeadership = /director|manager|lead|head|executive|vp|chief|principal/i.test(targetRole);
  let persona: PersonaStyle = isLeadership ? 'executive_leadership' : 'technical_ic';

  const resumeLower = (resumeText || "").toLowerCase();
  const companyLower = (targetCompany || "").toLowerCase();
  const isConcentrix = companyLower.includes("concentrix") || resumeLower.includes("concentrix");
  const isHCL = companyLower.includes("hcltech") || companyLower.includes("hcl technologies") || resumeLower.includes("hcltech") || resumeLower.includes("hcl technologies");
  
  if (isConcentrix) {
    persona = 'delivery_lead';
  }
  if (isHCL) {
    persona = 'technical_ic';
  }

  const platformGovernance = PromptOrchestrator.getCombinedDirectives({
    mode: optMode,
    persona: persona,
    targetCompany: targetCompany
  });

  const prompt = `
ACT AS:
You are a Senior Prompt Engineer with 5+ years of experience specializing in FAANG-level resume engineering, executive branding, ATS optimization, enterprise cloud leadership positioning, and STAR-method resume transformation for Microsoft, Google, Amazon, Meta, Oracle, Adobe, VMware, Accenture, Deloitte, and enterprise infrastructure organizations.

YOUR ROLE:
You are NOT a generic resume writer. You are:
* A Principal Resume Strategist
* A FAANG Technical Recruiter
* A Cloud Leadership Branding Expert
* An Executive Infrastructure Positioning Specialist
* A Senior ATS Optimization Consultant

PRIMARY OBJECTIVE:
Transform the candidate's resume into a STRICT FAANG-STYLE Senior Azure Infrastructure Leadership resume using authentic STAR methodology while maintaining COMPLETE FACTUAL ACCURACY.

THE CURRENT DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
${recruiterSimulationMode ? 'TASK: Critical Hiring Manager Review. Provide rejection reasons based on lack of impact/metrics.' : 'TASK: Rewrite resume into a top-tier professional document.'}

${customPrompt ? `CUSTOM: ${customPrompt}` : ''}
${brainDump ? `ADDITIONAL CONTEXT (BRAIN DUMP): ${brainDump}\nSift through this raw data and include high-impact achievements that are missing from the original resume.` : ''}

CORPORATE DNA TAILORING:
${targetCompany === 'amazon' ? 'TAILOR FOR AMAZON: Emphasize "Ownership", "Bias for Action", and "Data-driven results". Use terminology from Amazon Leadership Principles.' : ''}
${targetCompany === 'microsoft' ? 'TAILOR FOR MICROSOFT: Emphasize "Enterprise Scale", "Cloud Transformation", and "Collaborative Ecosystems".' : ''}
${targetCompany === 'google' ? 'TAILOR FOR GOOGLE: Emphasize "Systems Design", "Extreme Scale", "Algorithmic Efficiency", and "Google XYZ Formula".' : ''}
${targetCompany === 'meta' ? 'TAILOR FOR META: Emphasize "Moving Fast", "Shipping End-to-End Impact", and "Performance Optimization".' : ''}
${targetCompany === 'accenture' || targetCompany === 'infosys' ? 'TAILOR FOR CONSULTING: Emphasize "Client Delivery", "Global Managed Services", and "Cross-functional Deployment".' : 'TAILOR FOR PRODUCT TECH: Focus on internal product growth and feature ownership.'}

POSITION STRONGLY FOR:
* Head of Cloud Operations
* Senior Cloud Infrastructure Architect
* Director of Cloud Infrastructure
* Cloud Operations Manager
* Infrastructure & Platform Operations Lead
* Azure Infrastructure Architect
* Enterprise Cloud Architect
* IT Infrastructure Manager
* Service Delivery Manager – Cloud
* Technical Operations Manager
* Infrastructure Governance Lead
* CTO-track Infrastructure Leadership Roles

DO NOT POSITION AS:
* Senior DevOps Engineer
* Kubernetes Architect
* Platform Engineer
* Cloud-Native Application Engineer
* Principal SRE
* Microservices Architect
* DevOps Automation Specialist
* Kubernetes Administrator

GLOBAL GOVERNANCE SYSTEM DIRECTIVES:
${platformGovernance}

VERY IMPORTANT TRUTHFULNESS RULES (CRITICAL):
* NEVER fabricate experience.
* NEVER create fake Kubernetes production experience.
* NEVER claim deep Terraform engineering expertise.
* NEVER create fake CI/CD ownership.
* NEVER exaggerate DevOps expertise.
* NEVER invent microservices architecture experience.
* NEVER add technologies not actually used.
* NEVER imply software engineering background.
* NEVER create fake coding-heavy experience.
* NEVER add any fake technologies or fake details to the job description or optimized resume.
* PRESERVE ALL ORIGINAL CERTIFICATIONS: You MUST preserve and include all certifications from the candidate's original resume (including AZ-900, Azure Fundamentals, and any others). Do not omit or filter out any certifications. Do not add or focus on ITIL (ITTL) certification unless explicitly present.
* PRESERVE ALL ORIGINAL ROLES: You MUST preserve and include all historical roles and companies from the candidate's original resume. Under no circumstances should you delete, omit, or merge any roles.
* SKILLS MATCHING RULES: Extract and mention ONLY the skills that are present in or directly matching the candidate's actual resume. Do NOT list or invent skills that the candidate does not have on their original resume.
* TECHNOLOGY FOCUS: Do NOT focus too much on DevOps, Terraform, or Microservices / container services (like Kubernetes, Docker, AKS). Keep the emphasis on Enterprise Azure Infrastructure, Governance, Security, Resiliency, Operations, and Modernization scaling.
* METRIC INTEGRITY & ANTI-PERCENTAGE INFLATION: Do NOT inject fabricated percentage metrics (such as 'alignment with SLAs by 30%', 'decreasing stability incidents by 25%', 'improved system reliability by 20%', etc.) unless they are derived from real, measurable baselines. If no metrics exist, focus on qualitative, verifiable outcomes (e.g. 'ensuring regulatory compliance', 'reducing system complexity', 'improving uptime reliability') rather than stacking fake-looking percentages. Avoid literal 100% metrics (such as '100% compliance', '100% operational alignment') as they look fake and trigger recruiter skepticism.
* CONCENTRIX ROLE CONTEXT: The candidate was NOT officially a Service Delivery Manager (SDM) and did not have formal managerial ownership of a 20-member team. Do NOT use phrasing like 'Orchestrated service delivery management for a 20-member team' or describe formal managerial ownership, as this will lead to verification failures. Frame experience as a Technical Lead / Senior Engineer coordinating operational workflows and collaborating with the team, rather than official managerial leadership.
* HCLTECH TENURE CONSTRAINT: The HCLTech role lasted only ONE MONTH. Do NOT write bullets claiming massive strategic impacts, Azure operations strategies execution, or improving SLA adherence by 15% during this short period. BANNED PASSIVE/WEAK VERBS: Do NOT use weak/passive phrasing like "Gained exposure to", "Participated in", "Assisted with", "Shadowed". MANDATED ACTIVE VERBS: Restrict bullets to active operational tasks using strong active action verbs (e.g. "Analyzed enterprise Azure monitoring alerts", "Configured and validated backup schedules", "Supported infrastructure incident resolution", "Documented operational workflows").

CANDIDATE REAL BACKGROUND:
* 16+ years in enterprise infrastructure and cloud operations.
* Strong Azure Infrastructure and Hybrid Cloud expertise.
* Experienced in Azure governance, security, monitoring, HA/DR, resilience, and operational management.
* Strong experience with enterprise infrastructure modernization.
* Leadership and mentoring experience.
* Strong stakeholder communication and operational coordination.
* Experience handling enterprise infrastructure at scale.
* Strong operational reliability mindset.
* Good understanding of DevOps concepts and automation workflows.
* Basic Terraform understanding (can understand and work with scripts but not advanced engineering).
* No deep Kubernetes production administration experience.
* No deep microservices architecture experience.
* Strong cloud governance and operational transformation experience.

STRICT FAANG RESUME RULES:
1. EVERY bullet point MUST follow STAR methodology (Situation, Task, Action, Result).
2. EVERY bullet MUST: Start with a strong action verb, show ownership, show measurable impact, show scale, show business value, be concise, be technically dense, sound executive-level, architecture-focused, and leadership-oriented.
3. AVOID weak operational wording: Managed, Supported, Assisted, Helped, Worked on, Responsible for.
4. VERB CONTROL: Avoid overuse of overly dramatic executive AI verbs (e.g. 'Spearheaded', 'Orchestrated', 'Pioneered', 'Architected', 'Directed') which make the resume sound AI-generated. Instead, use operational, grounded, believable, and technical action verbs (e.g. 'Implemented', 'Optimized', 'Standardized', 'Configured', 'Deployed', 'Governed', 'Automated', 'Coordinated', 'Resolved', 'Maintained'). Keep wording grounded and believable.
5. RESUME MUST SOUND LIKE: Enterprise Cloud Leadership, Azure Infrastructure Strategy, Reliability Engineering Leadership, Infrastructure Governance, Enterprise Operations Excellence, Cloud Transformation Leadership, Executive Infrastructure Management, Cloud Operations Architecture, Enterprise IT Modernization, Strategic Infrastructure Leadership.
6. RESUME MUST NOT SOUND LIKE: Helpdesk support, Junior sysadmin, Pure operations support, Developer-focused engineer, Kubernetes-heavy engineer, Hardcore DevOps engineer, Coding-heavy architect.
7. EMPHASIZE: Azure Landing Zones, Hybrid Cloud Architecture, Infrastructure Governance, Reliability & Resilience, Disaster Recovery, Business Continuity, Cloud Cost Optimization, Operational Excellence, Monitoring & Observability, Identity & Access Management, Infrastructure Standardization, Infrastructure Automation, Executive Reporting, Service Delivery, Stakeholder Management, Team Leadership, Infrastructure Security, Compliance Governance, Enterprise Transformation.
8. USE METRICS NATURALLY: Cost savings, MTTR reduction, Downtime reduction, Subscription scale, VM scale, Team size, Reliability improvement, Governance coverage, Compliance metrics, Operational efficiency, SLA improvements, Infrastructure availability.
9. ATS OPTIMIZATION TARGET KEYWORDS: Azure Infrastructure Architect, Cloud Infrastructure Leader, Enterprise Cloud Architect, Cloud Operations Manager, Director of Infrastructure, Infrastructure Governance, Hybrid Cloud, Cloud Reliability, HA/DR, Cloud Security, Azure Operations, Infrastructure Transformation, IT Service Delivery, Cloud Governance, Enterprise Infrastructure.
10. FORMATTING & BULLET QUANTITY RULES:
    - Concentrix and M&M: 2-line descriptions with a maximum of 5 to 6 bullet points. Each bullet point should be high impact and can span up to 2 lines of text.
    - Archer: Exactly 4 to 5 high-impact bullet points. Each bullet point must be strictly a single line of text (1-line description).
    - Casepoint: Exactly 4 high-impact bullet points. Each bullet point must be strictly a single line of text (1-line description).
    - For all other (older) roles: Keep strictly one-line (1-line) descriptions for every single bullet point. Do not exceed a single line of text for any bullet point under these older roles. Do NOT truncate or reduce the bullet count aggressively; preserve all original achievements and bullets, optimizing their phrasing to be professional and recruiter-safe.
    - Keep technical density high and use concise executive-style language.
    - Remove repetitive wording.
11. BALANCED IaC: Terraform/IaC references are permitted but limited to 2 bullet points TOTAL across the entire resume.
12. SOURCE ANCHORING (CRITICAL): Each experience entry contains ORIGINAL BULLETS. You MUST derive new bullets ONLY from that specific role’s original content. Do NOT borrow, reuse, or "hallucinate" content from other roles to fill gaps.
13. PRESERVE TITLES: Do NOT modify job titles under any circumstances. Specifically, NEVER change "Officer IT cum Logistics" to "Office IT cum Logistics". This is a mandatory requirement.

INPUT:
RESUME: ${resumeText}
JD: ${jobDescription}
ROLE: ${targetRole}
MODE: ${mode} | AUDIENCE: ${audience}

OUTPUT: JSON matching OptimizationResult schema.
OUTPUT SCHEMA (MUST MATCH EXACTLY):
{
  "personal_info": { "name": "string", "location": "string", "email": "string", "phone": "string", "linkedin": "string", "linkedinText": "string" },
  "summary": "string",
  "skills": { "Category 1": ["string"], "Category 2": ["string"], "Category 3": ["string"], "Category 4": ["string"] },
  "experience": [ { "role": "string", "company": "string", "duration": "string", "bullets": ["string"] } ],
  "projects": [ { "title": "string", "description": "string" } ],
  "education": ["string"],
  "certifications": [
    { "name": "string", "issuer": "string", "date": "string" }
  ],
  "ats_keywords_from_jd": ["string"],
  "ats_keywords_added_to_resume": ["string"],
  "keyword_gap": ["string"],
  "match_score": 85,
  "baseline_score": 60,
  "improvement_notes": ["string"],
  "audience_alignment_notes": "string",
  "rejection_reasons": ["string"],
  "star_stories": [
    { "bullet": "string", "situation": "string", "task": "string", "action": "string", "result": "string" }
  ],
  "audit_report": {
    "score": number,
    "flags": [
      { "id": "string", "type": "string", "message": "string", "fix": "string", "severity": "high" }
    ],
    "trajectory": {
      "stage": "acceleration",
      "description": "string",
      "recommendation": "string"
    }
  },
  "authenticity_audit": {
    "realism_score": 95,
    "flagged_phrases": ["string"],
    "compliance_checklist": {
      "no_fake_metrics": true,
      "no_overused_ai_verbs": true,
      "realistic_tenure_positioning": true,
      "accurate_team_size": true,
      "humanized_language": true
    }
  }
}
`;

  const maxRetries = 5;
  let retryCount = 0;
  let currentModel = modelToUse;

  while (retryCount <= maxRetries) {
    try {
      // Use the potentially overridden engine and model
      const currentApiKey = engineToUse === 'openai' ? config.openaiConfig.apiKey : config.geminiConfig.apiKey;
      const data = await callAI(prompt, currentModel, engineToUse, currentApiKey);
      const resultText = extractJson(data.result || "");

      if (!resultText) {
        throw new Error(`No response from ${engineToUse}`);
      }

      try {
        let parsed = JSON.parse(resultText);

        // Self-correction loop trigger if realism score is low
        const realismScore = parsed.authenticity_audit?.realism_score;
        if (typeof realismScore === 'number' && realismScore < 90) {
          console.log(`[Realism Engine Client] Low realism score detected (${realismScore}/100). Initiating self-correction loop...`);
          const selfCorrectionPrompt = `
            You are a FAANG Resume Realism Auditor and Recruiter Skepticism Auditor.
            The following optimized resume was generated, but failed validation due to the following flagged phrases or unrealistic metrics:
            ${JSON.stringify(parsed.authenticity_audit.flagged_phrases || [])}

            YOUR TASK:
            Rewrite the experience and summary sections to:
            1. Simplify overcomplicated compound sentences.
            2. Remove the flagged phrases.
            3. Downgrade any overinflated executive verbs (Spearheaded, Orchestrated, etc.) to operational action verbs.
            4. Remove any fake metrics or fabricated percentages, prioritizing operational credibility and stable infrastructure outcomes.
            5. Ensure the realism score in authenticity_audit is updated to >= 90 once corrected.

            INPUT RESUME JSON:
            ${JSON.stringify(parsed, null, 2)}

            Output only valid corrected JSON matching the original schema. Do not output any notes or markdown wrapper outside the JSON block.
          `;
          
          const correctionData = await callAI(selfCorrectionPrompt, currentModel, engineToUse, currentApiKey);
          const correctedText = extractJson(correctionData.result || "{}");
          const correctedParsed = JSON.parse(correctedText);
          if (correctedParsed.experience && Array.isArray(correctedParsed.experience)) {
            parsed = correctedParsed;
            console.log(`[Realism Engine Client] Self-correction completed. New realism score: ${parsed.authenticity_audit?.realism_score || 95}`);
          }
        }

        // Post-processing Humanization & Jargon Reduction
        if (parsed.experience && Array.isArray(parsed.experience)) {
          parsed.experience = parsed.experience.map((role: any) => {
            if (role.bullets && Array.isArray(role.bullets)) {
              role.bullets = role.bullets.map((bullet: string) => {
                let cleaned = bullet;
                cleaned = cleaned.replace(/\b[Ss]pearheaded\b/g, "Led");
                cleaned = cleaned.replace(/\b[Oo]rchestrated\b/g, "Coordinated");
                cleaned = cleaned.replace(/\b[Pp]ioneered\b/g, "Standardized");
                cleaned = cleaned.replace(/\b[Dd]irected\b/g, "Managed");
                cleaned = cleaned.replace(/\b100% compliance\b/g, "full compliance");
                cleaned = cleaned.replace(/\b100% operational alignment\b/g, "operational alignment");
                cleaned = cleaned.replace(/\b[Oo]rchestrated strategic enterprise cloud transformation modernization initiatives\b/g, "Implemented Azure infrastructure modernization initiatives supporting operational scalability");
                return cleaned;
              });
            }
            return role;
          });
        }
        
        // Ensure scores are present and numeric
        if (typeof parsed.match_score !== 'number') {
          parsed.match_score = parseInt(parsed.match_score) || 70;
        }
        if (typeof parsed.baseline_score !== 'number') {
          parsed.baseline_score = parseInt(parsed.baseline_score) || 50;
        }

        // Skills must be grouped into categories.
        const skillCategories = Object.keys(parsed.skills || {});
        const formattedSkills: Record<string, string[]> = {};
        
        // Use all categories provided by the AI
        skillCategories.forEach(cat => {
          formattedSkills[cat] = parsed.skills[cat];
        });

        // Fill in missing categories if less than 4
        const defaultCats = isLeadershipRole 
          ? ["Strategic Leadership", "Management", "Operations", "Technical Proficiency"]
          : ["Core Technical", "Tools & Frameworks", "Process & Methodology", "Soft Skills"];
          
        while (Object.keys(formattedSkills).length < 4) {
          const nextCat = defaultCats.find(c => !formattedSkills[c]);
          if (nextCat) formattedSkills[nextCat] = [];
          else formattedSkills[`Category ${Object.keys(formattedSkills).length + 1}`] = [];
        }

        parsed.skills = formattedSkills;
        parsed._engine = engineToUse;

        if (data.usage) {
          parsed._usage = data.usage;
        }

        // FAIL-SAFE: Ensure "Officer IT cum Logistics" is preserved and not changed to "Office IT cum Logistics"
        const fixTitle = (obj: any): any => {
          if (typeof obj === 'string') {
            // Case insensitive match but replace with exact casing
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
      } catch (e) {
        console.error(`Error parsing ${engineToUse} response:`, e, "Raw text:", resultText);
        throw new Error(`JSON_PARSING_ERROR: The ${engineToUse} engine returned an invalid response format.`);
      }
    } catch (error: any) {
      const errorString = error?.message || String(error);
      const isRateLimit = errorString.includes("429") || 
                         errorString.includes("RESOURCE_EXHAUSTED") ||
                         errorString.includes("quota") ||
                         errorString.includes("rate limit");
      const isJsonError = errorString.includes("JSON_PARSING_ERROR") || 
                          errorString.includes("invalid response format");
      
      if ((isRateLimit || isJsonError) && retryCount < maxRetries) {
        retryCount++;
        
        // Fallback to Flash if Pro fails with rate limit or JSON error
        if (engineToUse === 'gemini' && (currentModel.includes('pro') || currentModel.includes('3.1-pro'))) {
          console.warn(`Error hit on Gemini Pro. Falling back to Gemini 3.5 Flash for retry ${retryCount}...`);
          currentModel = 'gemini-3.5-flash';
        }

        const delay = Math.pow(2, retryCount) * 2000 + Math.random() * 1000;
        const retryMsg = isRateLimit 
          ? `AI API quota exceeded. Retrying with exponential backoff (${retryCount}/${maxRetries})...`
          : `Invalid AI response format. Retrying (${retryCount}/${maxRetries})...`;
          
        console.warn(`${retryMsg} (Delay: ${Math.round(delay)}ms)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }

  throw new Error(`Maximum retries exceeded for ${engineToUse}. Please try again in a few minutes.`);
}

export async function analyzeSkillGap(
  resumeText: string,
  jobDescription: string,
  config: RouterConfig
): Promise<{ missing: string[], present: string[] }> {
  const routedConfig = routeTask('extract_skills', config);
  const prompt = `
      Analyze the following resume and job description.
      Identify the skills present in the resume and the skills required by the job description that are missing from the resume.
      Return the result as a JSON object: { "missing": string[], "present": string[] }
      
      RESUME: ${resumeText}
      JOB DESCRIPTION: ${jobDescription}
    `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    return JSON.parse(resultText || '{"missing":[], "present":[]}');
  } catch (error) {
    console.error("Error analyzing skill gap:", error);
    throw error;
  }
}

export async function analyzeResumeCritique(
  resumeText: string,
  jobDescription: string,
  config: RouterConfig
): Promise<{ score: number, critique: { category: string, feedback: string, severity: 'low' | 'medium' | 'high' }[] }> {
  const routedConfig = routeTask('extract_skills', config);
  const prompt = `
      You are an expert career counselor. Audit this resume against the Job Description.
      Be constructive and thorough. Find areas for improvement in wording, impact, and alignment.
      
      STRICT AUDIT CRITERIA:
      1. IMPACT: Do achievements clearly convey the result of the actions taken?
      2. OUTCOMES: Does the resume highlight measurable outcomes or positive changes?
      3. ACTION VERBS: Are the verbs strong and professional?
      
      Return a JSON object:
      {
        "score": number (0-100 overall professional readiness),
        "critique": [
          {
            "category": "e.g., Metrics/Impact",
            "feedback": "Detailed constructive criticism",
            "severity": "low" | "medium" | "high"
          }
        ]
      }

      RESUME: ${resumeText}
      JOB DESCRIPTION: ${jobDescription}
    `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    return JSON.parse(resultText || '{"score":0, "critique":[]}');
  } catch (error) {
    console.error("Error analyzing resume critique:", error);
    throw error;
  }
}

export async function extractSkillsFromJD(
  jdText: string,
  resumeText: string,
  config: RouterConfig
): Promise<{ missing: string[], matching: string[], priority: string[] }> {
  const routedConfig = routeTask('extract_skills', config);
  const prompt = `
    ROLE: Expert Technical Recruiter & Keyword Strategist.
    TASK: Analyze the provided Job Description (JD) and Resume.
    
    1. EXTRACT mandatory technical skills, tools, and domain keywords from the JD.
    2. COMPARE these against the provided Resume.
    3. CATEGORIZE result into three arrays:
       - matching: Skills present in both JD and Resume.
       - missing: Important skills from JD not clearly present in Resume.
       - priority: The top 10-15 keywords user MUST have in their profile for this specific JD to pass ATS and filter searches.
    
    RESUME:
    ${resumeText}
    
    JOB DESCRIPTION:
    ${jdText}
    
    Return strictly JSON:
    {
      "matching": ["skill1", "skill2"],
      "missing": ["skill3", "skill4"],
      "priority": ["key1", "key2"]
    }
  `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    return JSON.parse(resultText || '{"matching":[], "missing":[], "priority":[]}');
  } catch (error) {
    console.error('Skill extraction AI error:', error);
    throw error;
  }
}

export async function analyzeBestAudiences(
  jobDescription: string,
  targetRole: string,
  config: RouterConfig,
  fastMode: boolean = false
): Promise<string[]> {
  const routedConfig = routeTask('multi_audience', config);
  console.log('analyzeBestAudiences called', { jobDescription, targetRole });
  
  let modelToUse = routedConfig.model;
  if (fastMode && routedConfig.engine === 'gemini') {
    modelToUse = 'gemini-3.5-flash-lite';
  } else if (!modelToUse) {
    modelToUse = 'gemini-3.5-flash-lite';
  }
  const prompt = `
    Analyze the following Job Description and Target Role.
    Select the most appropriate audiences from the following list:
    - microsoft
    - leadership
    - cloud-architect
    - solution-architect
    - consulting
    - cloud-eng-mgr
    - infra-mgr
    - assoc-director
    - director-mid
    - director-large
    - principal-architect
    - cto-vp
    - digital-transform
    - platform-dir
    
    If NONE of the above audiences are a perfect fit for the Target Role and JD, you MUST suggest a custom audience name that best describes the target persona (e.g., "Product Management", "Data Science", "Frontend Engineering").
    
    Return ONLY a JSON array of the IDs or custom names. Example: ["cloud-architect", "leadership"] or ["Product Management"]
    
    JOB DESCRIPTION: ${jobDescription}
    TARGET ROLE: ${targetRole}
  `;

  const getKeywordFallback = () => {
    const jd = jobDescription.toLowerCase();
    const role = targetRole.toLowerCase();
    const selected: string[] = [];

    if (jd.includes('leadership') || jd.includes('manager') || jd.includes('director') || role.includes('lead') || role.includes('manager')) {
      selected.push('leadership');
    }
    if (jd.includes('microsoft') || jd.includes('azure')) {
      selected.push('microsoft');
    }
    if (jd.includes('cloud') && (jd.includes('architect') || role.includes('architect'))) {
      selected.push('cloud-architect');
    }
    if (jd.includes('consulting') || jd.includes('client')) {
      selected.push('consulting');
    }
    if (role.includes('director')) {
      selected.push('director-mid');
    }
    if (role.includes('cto') || role.includes('vp')) {
      selected.push('cto-vp');
    }
    if (jd.includes('platform')) {
      selected.push('platform-dir');
    }
    
    return selected.length > 0 ? selected : [targetRole];
  };

  try {
    const data = await callAI(prompt, modelToUse, 'gemini', routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    const parsed = JSON.parse(resultText || '[]');
    return Array.isArray(parsed) ? parsed : (parsed.audiences || [targetRole]);
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit") || errorMsg.includes("exhausted");
    
    if (isQuotaError) {
      console.warn("Auto-audience selection skipped: Gemini API quota exceeded. Using keyword-based fallback.");
      return getKeywordFallback();
    } else {
      console.error("Error analyzing best audiences:", errorMsg);
      // Even for other errors, try keyword fallback to provide a better UX than just returning targetRole
      return getKeywordFallback();
    }
  }
}

export async function selectBestMasterResume(
  resumes: MasterResume[],
  jobDescription: string,
  config: RouterConfig
): Promise<string> {
  if (!resumes || resumes.length === 0) return 'default';
  if (resumes.length === 1) return resumes[0].id;

  const routedConfig = routeTask('select_best_master_resume', config);
  const apiKey = await getDecryptedKey(routedConfig.apiKey || '');
  const ai = new GoogleGenAI({ apiKey });

  const mastersSummary = resumes.map((m) => {
    try {
      const data = typeof m.data === 'string' ? JSON.parse(m.data) : m.data;
      const experienceSummary = data.experience 
        ? data.experience.map((exp: any) => `${exp.title || exp.role} at ${exp.company || exp.organization}`).join(", ")
        : "No experience listed";
      const skillsSummary = data.skills 
        ? Object.values(data.skills).flat().join(", ").substring(0, 500)
        : "No skills listed";
      
      return `ID: ${m.id}\nName: ${m.name}\nExperience: ${experienceSummary}\nKey Skills: ${skillsSummary}...`;
    } catch (e) {
      const content = typeof m.data === 'string' ? m.data : JSON.stringify(m.data);
      return `ID: ${m.id}\nName: ${m.name}\nContext: ${content.substring(0, 1000)}...`;
    }
  }).join("\n\n---\n\n");

  const prompt = `
    Analyze the following Job Description and the list of available "Master Resumes" (summarized below).
    Pick the SINGLE Master Resume ID that is the most relevant and best starting point to optimize for this job.
    Look at the candidate's Experience and Skills from each profile.
    
    JOB DESCRIPTION:
    ${jobDescription}
    
    MASTER RESUMES:
    ${mastersSummary}
    
    Return ONLY a JSON object: { "selectedId": "the-id", "reason": "why this matches best" }
  `;

  try {
    const { result } = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(result);
    const parsed = JSON.parse(resultText);
    return parsed.selectedId;
  } catch (error) {
    console.error("Error selecting best master resume:", error);
    return resumes[0]?.id || 'default';
  }
}



export async function generateInterviewQuestions(
  jobDescription: string,
  resumeText: string,
  config: RouterConfig
): Promise<string[]> {
  const routedConfig = routeTask('interview_questions', config);
  const prompt = `
      Based on the following job description and the candidate's resume, generate 5-10 potential interview questions.
      Return the result as a JSON array of strings: [ "question1", "question2", ... ]
      
      JOB DESCRIPTION: ${jobDescription}
      RESUME: ${resumeText}
    `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    const parsed = JSON.parse(resultText || '[]');
    return Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (error) {
    console.error("Error generating interview questions:", error);
    return [];
  }
}

export async function generateRecruiterMessage(
  jobDescription: string,
  resumeText: string,
  config: RouterConfig
): Promise<string> {
  const routedConfig = routeTask('recruiter_message', config);
  const prompt = `
      You are an expert career coach.
      Write a short, professional, and engaging message for a recruiter to accompany a resume application.
      The message should be concise (max 100 words), highlight the candidate's interest in the role, and briefly mention why they are a good fit based on the job description and resume.
      
      JOB DESCRIPTION: ${jobDescription}
      RESUME: ${resumeText}
      
      Return the message as a plain text string. Do not include any extra conversational text.
    `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    let result = data.result || "";
    
    // Try to parse if it looks like JSON
    if (result.includes('{') && result.includes('}')) {
       try {
         const jsonStr = extractJson(result);
         const parsed = JSON.parse(jsonStr);
         if (parsed.message) {
           result = parsed.message;
         } else if (parsed.recruiter_message) {
           result = parsed.recruiter_message;
         }
       } catch (e) {
         // Ignore and use raw result
       }
    }
    return result.trim();
  } catch (error) {
    console.error("Error generating recruiter message:", error);
    return "";
  }
}

export async function generateCoverLetter(
  jobDescription: string,
  resumeText: string,
  targetRole: string,
  config: RouterConfig
): Promise<string> {
  const routedConfig = routeTask('cover_letter', config);
  const prompt = `
      You are an expert career coach and professional writer.
      Write a high-impact, persuasive cover letter for the following job description and candidate resume.
      The cover letter should be professional, concise (max 300-400 words), and specifically highlight how the candidate's experience aligns with the job requirements.
      Focus on the value the candidate brings to the company.
      
      CRITICAL: You MUST identify the company name from the job description and use it throughout the letter. Do not use placeholders like "[Company Name]". If the company name is not explicitly clear, use a generic but professional reference like "the team at your organization".
      
      JOB DESCRIPTION: ${jobDescription}
      RESUME: ${resumeText}
      TARGET ROLE: ${targetRole}
      
      Return the cover letter as a plain text string. Do not include any extra conversational text.
    `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    let result = data.result || "";
    
    // Try to parse if it looks like JSON
    if (result.includes('{') && result.includes('}')) {
       try {
         const jsonStr = extractJson(result);
         const parsed = JSON.parse(jsonStr);
         if (parsed.cover_letter) {
           result = parsed.cover_letter;
         } else if (parsed.coverLetter) {
           result = parsed.coverLetter;
         }
       } catch (e) {
         // Ignore and use raw result
       }
    }
    return result.trim();
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return "";
  }
}

export async function analyzeLinkedInProfile(
  resumeText: string,
  linkedInText: string,
  config: RouterConfig
): Promise<string> {
  const routedConfig = routeTask('linkedin_analysis', config);
  const prompt = `
      You are an expert LinkedIn profile optimizer and career coach.
      Analyze the following candidate's resume and their LinkedIn profile text.
      Provide a comprehensive review of the LinkedIn profile, highlighting strengths, areas for improvement, and specific suggestions to optimize it for better visibility and impact.
      
      RESUME: ${resumeText}
      LINKEDIN PROFILE: ${linkedInText}
      
      Return the review as a structured markdown document.
    `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    return data.result || "";
  } catch (error) {
    console.error("Error analyzing LinkedIn profile:", error);
    throw error;
  }
}

export async function generateWhyThisJob(
  jobDescription: string,
  resumeText: string,
  config: RouterConfig
): Promise<string> {
  const routedConfig = routeTask('recruiter_message', config);
  const prompt = `
      You are a career strategist.
      Recruiters often ask "Why did you apply for this job?" or "What thrilled you about this role?".
      Based on the job description and the candidate's resume, draft a compelling, authentic response (max 150 words).
      Focus on the specific alignment between the company's mission/needs and the candidate's passions/skills.
      
      JOB DESCRIPTION: ${jobDescription}
      RESUME: ${resumeText}
      
      Return the response as a plain text string. Do not include any extra conversational text.
    `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    return (data.result || "").trim();
  } catch (error) {
    console.error("Error generating Why This Job response:", error);
    return "";
  }
}

export async function optimizeHeadline(
  currentHeadline: string,
  resumeSummary: string,
  keySkills: string[],
  targetRole: string,
  config: RouterConfig
): Promise<{ headline: string; keywords_used: string[] }> {
  const routedConfig = routeTask('optimize_headline', config);
  const prompt = `
    You are a LinkedIn headline optimization expert for IT and Cloud professionals.

    Input:
    - Current Headline: ${currentHeadline}
    - Resume Summary: ${resumeSummary}
    - Key Skills: ${JSON.stringify(keySkills)}
    - Target Role: ${targetRole}

    Tasks:
    1. Rewrite the headline to be:
       - Keyword-rich (ATS and recruiter friendly)
       - Clear and impactful
       - Aligned with target role
    2. Include important keywords like Azure, Cloud, Infrastructure, Migration, etc. if relevant
    3. Keep it under 220 characters

    Constraints:
    - No buzzword stuffing
    - No fake claims
    - Must reflect real experience

    Output (STRICT JSON):
    {
      "headline": "...",
      "keywords_used": ["...", "..."]
    }
  `;

  try {
    const data = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    return JSON.parse(resultText || '{"headline": "", "keywords_used": []}');
  } catch (error) {
    console.error("Error optimizing headline:", error);
    throw error;
  }
}

export async function autoSelectPlayerCoachRole(
  jobDescription: string,
  config: RouterConfig
): Promise<boolean> {
  const routedConfig = routeTask('select_player_coach', config);
  const prompt = `
    Analyze the following Job Description.
    Determine if this role is a "Player-Coach" role (individual contributor + team lead/mentor).
    Return ONLY a JSON object: { "isPlayerCoach": boolean }
    
    JOB DESCRIPTION:
    ${jobDescription}
  `;

  try {
    const data = await callAI(prompt, routedConfig.model || 'gemini-3.5-flash-lite', 'gemini', routedConfig.apiKey);
    const resultText = extractJson(data.result || "");
    const parsed = JSON.parse(resultText);
    return parsed.isPlayerCoach;
  } catch (error) {
    console.error("Error auto-selecting player-coach role:", error);
    return false;
  }
}

export async function generateMasterResume(
  data: { company: string, role: string, startYear: string, endYear: string, description: string },
  config: RouterConfig
): Promise<{ role: string, company: string, duration: string, bullets: string[] }> {
  const routedConfig = routeTask('rewrite_resume', config);
  const prompt = `
    ROLE: Expert Career Coach & Resume Writer.
    TASK: Generate 3-5 high-impact, ATS-friendly bullet points for a user's experience entry.
    
    INPUT DATA:
    Company: ${data.company}
    Role: ${data.role}
    Tenure: ${data.startYear} - ${data.endYear}
    Context/Description: ${data.description}
    
    STRICT GUIDELINES:
    - Use strong action verbs.
    - Include metrics (%, $, time saved, scale) if imaginable.
    - Focus on outcomes and leadership.
    
    OUTPUT (STRICT JSON):
    { "role": string, "company": string, "duration": string, "bullets": string[] }
  `;

  try {
    const dataResult = await callAI(prompt, routedConfig.model, routedConfig.engine, routedConfig.apiKey);
    const resultText = extractJson(dataResult.result || "");
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error generating master resume bullets:", error);
    throw error;
  }
}
