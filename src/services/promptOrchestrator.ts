export type OptimizationMode = 'conservative' | 'balanced' | 'aggressive';
export type PersonaStyle = 'technical_ic' | 'delivery_lead' | 'executive_leadership';

export interface OrchestratorConfig {
  mode: OptimizationMode;
  persona: PersonaStyle;
  targetCompany?: string;
  duration?: string;
}

export class PromptOrchestrator {
  static getVerbGovernance(): string {
    return `
VERB GOVERNANCE (STRICT ENFORCEMENT):
- BANNED ACTION VERBS (DO NOT USE): Spearheaded, Orchestrated, Pioneered, Directed, Revolutionized, Conceptualized. These make the resume sound AI-generated.
- APPROVED GROUNDED ACTION VERBS: Managed, Implemented, Coordinated, Governed, Standardized, Optimized, Delivered, Configured, Automated, Led, Resolved, Streamlined, Improved, Maintained, Deployed.
- Keep verbiage operational, believable, and technically accurate.
`;
  }

  static getDensityRules(): string {
    return `
RESUME DENSITY CONTROL:
- Maximum 1 core achievement per bullet point.
- Maximum 2 technologies mentioned per bullet point.
- Maximum 1 metric per bullet point.
- Avoid stacked enterprise buzzwords (e.g. do NOT write: "Orchestrated strategic enterprise cloud transformation modernization initiatives").
- Avoid long compound sentences. Simplify and humanize.
`;
  }

  static getMetricValidationDirectives(mode: OptimizationMode): string {
    if (mode === 'conservative') {
      return `
METRIC VALIDATION ENGINE (CONSERVATIVE MODE - STRICT FACTUAL ADHERENCE):
- DO NOT invent, estimate, or extrapolate any numbers, budgets, scale metrics, or percentages.
- Use ONLY metrics explicitly present in the candidate's original resume data.
- If a bullet lacks explicit metrics, focus entirely on qualitative technical achievements, compliance governance, or operational stability outcomes.
- NEVER write "100% compliance", "100% operational alignment", or stack arbitrary percentages.
`;
    }

    if (mode === 'aggressive') {
      return `
METRIC VALIDATION ENGINE (AGGRESSIVE MODE - HIGH IMPACT):
- Allows estimated metrics ONLY based on actual system scale (e.g. VM counts, subscriptions managed) if strongly supported by original context.
- STRICTLY block fake percentages, cost-savings, or SLA metrics that are not in the raw data.
- NEVER write "100% compliance", "100% operational alignment", or stack arbitrary percentages.
`;
    }

    // default to balanced
    return `
METRIC VALIDATION ENGINE (BALANCED MODE - DEFAULT):
- Allows small inferred scale references (e.g. size of infrastructure handled) ONLY if strongly supported.
- BANNED: Generating arbitrary percentage improvements (like 'alignment with SLAs by 30%', 'improved uptime by 15%') or fake budget numbers.
- If no metrics are available, prioritize operational credibility, technical ownership, and infrastructure reliability.
- NEVER write "100% compliance", "100% operational alignment", or stack arbitrary percentages.
`;
  }

  static getPersonaDirectives(persona: PersonaStyle): string {
    switch (persona) {
      case 'technical_ic':
        return `
PERSONA: TECHNICAL INDIVIDUAL CONTRIBUTOR (IC):
- Focus: Azure landing zones, cloud governance, security, HA/DR resiliency, standardization, configuration, and operational engineering.
- BANNED: Executive transformation language, direct people management claims, hiring/firing authority, strategic organization ownership.
- Wording style: Grounded, technical, and operational. Focus on execution and design.
`;
      case 'delivery_lead':
        return `
PERSONA: DELIVERY LEAD:
- Focus: Escalation coordination, service delivery monitoring, SLA coordination support, incident management, stakeholder collaboration, and operational leadership.
- Focus on acting as a secondary lead or coordinator, managing workflow processes rather than formal department ownership.
`;
      case 'executive_leadership':
        return `
PERSONA: EXECUTIVE LEADERSHIP:
- Focus: Cloud modernization roadmaps, governance strategies, strategic cost optimization, enterprise alignment, and stakeholder communication.
- Focus on business value and high-level architectural governance. NOTE: Wording must still be realistic and grounded.
`;
    }
  }

  static getRoleGuardrails(company: string, duration?: string): string {
    const companyLower = (company || '').toLowerCase();
    let rules = '';

    if (companyLower.includes('concentrix')) {
      rules += `
CONCENTRIX ROLE GUARDRAILS (STRICT ENFORCEMENT):
- The candidate was NOT officially a Service Delivery Manager (SDM) and did not have direct managerial ownership of a 20-member team.
- BANNED PHRASES: "Managed 20-member team", "Directed service delivery organization", "Formal SDM ownership", "hiring authority".
- MANDATED POSITIONING: Frame role as "Operational Coordinator", "Secondary Operational Lead", "Governance Partner", "Escalation Coordination", "Service Stability Contributor", or "SLA Coordination Support". Focus on collaborative coordination and escalation management.
`;
    }

    if (companyLower.includes('hcltech') || companyLower.includes('hcl technologies')) {
      rules += `
HCLTECH SHORT-TENURE GUARDRAILS (STRICT ENFORCEMENT):
- The candidate worked ONLY ONE MONTH at HCLTech.
- BANNED CLAIMS: Large-scale transformation ownership, major SLA improvements, strategic cloud migration leadership, or significant architectural decisions.
- MANDATED POSITIONING: Position experience strictly around onboarding, shadowing enterprise workflows, operational exposure, monitoring tools familiarity, support coordination, and infrastructure familiarization.
`;
    }

    // Apply general short tenure protection if duration indicates a short period (< 3 months)
    const isShort = (duration || '').includes('1 month') || (duration || '').includes('2 month') || (duration || '').toLowerCase().includes('shadow');
    if (isShort && !companyLower.includes('hcltech')) {
      rules += `
SHORT TENURE GUARDRAILS:
- This role was of very short duration. Do not claim major strategic transformations or SLA percentage improvements. Focus on knowledge transfer, onboarding, shadowing, and support activities.
`;
    }

    return rules;
  }

  static getHumanizationLayerRules(): string {
    return `
HUMANIZATION & JARGON REDUCTION RULES:
- Eliminate AI-sounding jargon stack (e.g. change "Orchestrated strategic enterprise cloud transformation modernization initiatives" to "Implemented Azure infrastructure modernization initiatives supporting operational scalability").
- Simplify overly complex sentences. Use active, professional human speech.
- Maximum 2 buzzwords/jargon per bullet point. Keep it highly readable and believable.
`;
  }

  static getRecruiterAuditDirectives(): string {
    return `
RECRUITER SKEPTICISM AUDIT & SELF-CORRECTION:
- Evaluate output against a strict Recruiter skepticism check:
  1. Do the achievements sound realistic for the candidate's title and tenure?
  2. Are there any perfect metrics ("100% compliance", "100% uptime")?
  3. Is there buzzword overload?
  4. Are there any banned AI verbs (Spearheaded, Orchestrated, Pioneered, Directed)?
- Provide a realism score (0 to 100). If the score is below 90, trigger self-correction instructions to automatically downgrade and simplify the wording.
`;
  }

  static getCombinedDirectives(config: OrchestratorConfig): string {
    return `
=== PLATFORM REALISM GOVERNANCE ===
${this.getVerbGovernance()}
${this.getDensityRules()}
${this.getMetricValidationDirectives(config.mode)}
${this.getPersonaDirectives(config.persona)}
${this.getRoleGuardrails(config.targetCompany || '', config.duration)}
${this.getHumanizationLayerRules()}
${this.getRecruiterAuditDirectives()}
`;
  }
}
