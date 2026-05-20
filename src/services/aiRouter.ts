import { EngineConfig, EngineType } from './geminiService';

export type TaskType = 
  | 'parse_resume'
  | 'extract_job_description'
  | 'extract_skills'
  | 'ats_scoring'
  | 'rewrite_resume'
  | 'multi_audience'
  | 'recruiter_simulation'
  | 'interview_questions'
  | 'cover_letter'
  | 'recruiter_message'
  | 'evaluate_suitability'
  | 'linkedin_analysis'
  | 'optimize_headline'
  | 'optimize_about'
  | 'select_best_master_resume'
  | 'select_player_coach';

export interface RouterConfig {
  mode: EngineType | 'production';
  geminiConfig: EngineConfig;
  openaiConfig: EngineConfig;
}

export function routeTask(task: TaskType, config: RouterConfig): EngineConfig {
  if (config.mode !== 'production') {
    // If not in production mode, use the explicitly selected engine
    const engineConfig = config.mode === 'gemini' ? config.geminiConfig : config.openaiConfig;
    if (config.mode === 'gemini') {
      if (task === 'rewrite_resume') {
        return { ...engineConfig, model: 'gemini-3.1-pro-preview' };
      } else {
        return { ...engineConfig, model: 'gemini-3.5-flash' };
      }
    }
    return engineConfig;
  }

  // Production Mode Routing Logic
  let selectedEngine: EngineType;

  switch (task) {
    // Tasks routed to Gemini (Cost-effective & High Performance)
    case 'parse_resume':
    case 'extract_job_description':
    case 'extract_skills':
    case 'ats_scoring':
    case 'evaluate_suitability':
    case 'multi_audience':
    case 'interview_questions':
    case 'recruiter_message':
    case 'optimize_headline':
    case 'optimize_about':
    case 'rewrite_resume':
    case 'cover_letter':
    case 'select_best_master_resume':
    case 'select_player_coach':
      selectedEngine = 'gemini';
      break;

    // Tasks routed to OpenAI (Premium Quality & Complex Reasoning)
    case 'recruiter_simulation':
    case 'linkedin_analysis':
      selectedEngine = 'openai';
      break;
      
    default:
      // Fallback to Gemini if task is unknown
      selectedEngine = 'gemini';
  }

  const engineConfig = selectedEngine === 'gemini' ? config.geminiConfig : config.openaiConfig;
  
  if (selectedEngine === 'gemini') {
    if (task === 'rewrite_resume') {
      return { ...engineConfig, model: 'gemini-3.1-pro-preview' };
    } else {
      return { ...engineConfig, model: 'gemini-3.5-flash' };
    }
  }
  
  // Log the routing decision
  console.log(`[Production Mode] Task: ${task} → ${selectedEngine} (${engineConfig.model})`);
  
  return engineConfig;
}
