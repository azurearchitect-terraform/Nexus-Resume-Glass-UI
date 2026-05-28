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
- APPROVED GROUNDED ACTION VERBS: Managed, Implemented, Coordinated, Governed, Standardized, Optimized, Delivered, Configured, Automated, Led, Resolved, Streamlined, Improved, Maintained, Deployed, Supported.
- Keep verbiage operational, believable, and technically accurate.
- SOFTEN LEADERSHIP WORDING: Avoid aggressive executive ownership. For example:
  - Instead of "Led and mentored a 5-member cloud engineering team", prefer "Provided operational guidance and mentoring to a 5-member cloud engineering team".
- WORDING TRANSLATION RULES (DOWNGRADE OVER-OPTIMIZATION):
  - Change "Governed major incident response processes" to "Coordinated major incident response activities".
  - Change "Defined operational governance standards" to "Established platform standards and monitoring practices".
  - If a bullet sounds too strategic, too perfect, or too ATS-engineered, downgrade it slightly into natural, believable operational language.
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
- REDUCE KEYWORD STACKING IN SKILLS: Do not stack keywords. Prioritize high-relevance skills present in the candidate's original resume, balancing ATS optimization with human scannability.
- REDUCE OVERUSE OF BANNED JARGON:
  - "governance": Replace with "operational standards", "platform controls", "compliance alignment", "operational policies", "infrastructure standards", or "reliability practices".
  - "operational" / "enterprise": Reduce repetitive usage. Vary wording naturally to sound written by a human.
- SUMMARY REALISM: Avoid overly executive wording in the summary. Keep it grounded in senior infrastructure execution, SLA/service stability, and Azure + Hybrid Cloud operations.
`;
  }

  static getMetricValidationDirectives(mode: OptimizationMode): string {
    if (mode === 'conservative') {
      return `
METRIC VALIDATION ENGINE (CONSERVATIVE MODE - STRICT FACTUAL ADHERENCE):
- DO NOT invent, estimate, or extrapolate any numbers, budgets, scale metrics, or percentages.
- Use ONLY metrics explicitly present in the candidate's original resume data.
- If a bullet lacks explicit metrics, focus entirely on qualitative technical achievements, compliance alignment, or operational stability outcomes.
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
    const generalPersonaRules = `
TARGET POSITIONING CONTROLS:
- POSITION CANDIDATE AS: Infrastructure Operations Lead, Azure Infrastructure Specialist, Cloud Operations Professional, Infrastructure Delivery Professional, MSP Infrastructure Engineer, or Technical Operations Specialist.
- DO NOT POSITION AS: Executive Director, Transformation Executive, Cloud-Native Architect, Kubernetes Specialist, or DevOps Leader.
- PRESERVE AND STRENGTHEN MSP SIGNALS: SLA/OLA alignment, incident management, escalation handling, operational readiness, service stability, cross-functional coordination, disaster recovery, runbooks/SOPs, L1/L2/L3 coordination.
`;

    switch (persona) {
      case 'technical_ic':
        return `
${generalPersonaRules}
PERSONA: TECHNICAL INDIVIDUAL CONTRIBUTOR (IC):
- Focus: Azure landing zones, cloud platform controls, security, HA/DR resiliency, standardization, configuration, and operational engineering.
- BANNED: Executive transformation language, direct people management claims, hiring/firing authority, strategic organization ownership.
- Wording style: Grounded, technical, and operational. Focus on execution and design.
`;
      case 'delivery_lead':
        return `
${generalPersonaRules}
PERSONA: DELIVERY LEAD:
- Focus: Escalation coordination, service delivery monitoring, SLA coordination support, incident management, stakeholder collaboration, and operational coordination.
- Focus on acting as a secondary lead or coordinator, managing workflow processes rather than formal department ownership or formal people management.
`;
      case 'executive_leadership':
        return `
${generalPersonaRules}
PERSONA: EXECUTIVE LEADERSHIP:
- Focus: Cloud modernization roadmaps, platform controls, strategic cost optimization, enterprise alignment, and stakeholder communication.
- Focus on business value and high-level architectural standards. NOTE: Wording must still be realistic and grounded; avoid over-executive branding or exaggerated strategic language.
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
- BANNED PASSIVE/WEAK VERBS: Do NOT use passive or weak phrasing like "Gained exposure to", "Participated in", "Assisted with", "Shadowed", "Familiarized with".
- MANDATED ACTIVE POSITIONING: Emphasize active ownership and specific contributions using active operational verbs (e.g. "Analyzed enterprise Azure monitoring alerts", "Configured and validated backup schedules", "Supported infrastructure incident resolution", "Documented operational workflows").
`;
    }

    // Apply general short tenure protection if duration indicates a short period (< 3 months)
    const isShort = (duration || '').includes('1 month') || (duration || '').includes('2 month') || (duration || '').toLowerCase().includes('shadow');
    if (isShort && !companyLower.includes('hcltech')) {
      rules += `
SHORT TENURE GUARDRAILS:
- This role was of very short duration. Do not claim major strategic transformations or SLA percentage improvements.
- BANNED PASSIVE/WEAK VERBS: Do NOT use passive/weak verbs or phrases like "Gained exposure to", "Participated in", "Assisted with", "Shadowed".
- MANDATED ACTIVE POSITIONING: Emphasize active ownership and specific technical contributions using active operational verbs (e.g. "Analyzed", "Configured", "Monitored", "Supported", "Documented", "Validated").
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
  1. Do the achievements sound realistic for the candidate's title and tenure? (Check short-tenure roles for over-exaggerated claims).
  2. Are there any perfect metrics ("100% compliance", "100% uptime", "100% SLA alignment")?
  3. Is there buzzword overload or keyword stuffing?
  4. Are there any banned AI verbs (Spearheaded, Orchestrated, Pioneered, Directed)?
  5. Are there any suspicious strategic leadership claims for operational coordination roles?
- Provide a realism score (0 to 100). If the score is below 90, trigger self-correction instructions to automatically downgrade and simplify the wording into believable operational language.
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
