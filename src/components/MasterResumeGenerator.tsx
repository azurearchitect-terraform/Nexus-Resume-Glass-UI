import React, { useState } from 'react';
import { Brain, Sparkles, AlertCircle } from 'lucide-react';
import { generateMasterResume } from '../services/geminiService';

interface MasterResumeGeneratorProps {
  isDarkMode: boolean;
  engineConfig: Record<string, any>;
  selectedEngine: string;
  setResumeText: (text: string) => void;
}

export const MasterResumeGenerator: React.FC<MasterResumeGeneratorProps> = ({ 
  isDarkMode, 
  engineConfig, 
  selectedEngine,
  setResumeText
}) => {
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    startYear: '',
    endYear: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.company || !formData.role) {
      setError("Please provide at least company and role.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateMasterResume(formData, {
        mode: selectedEngine as any,
        geminiConfig: { engine: 'gemini', model: engineConfig.gemini.model, apiKey: engineConfig.gemini.apiKey },
        openaiConfig: { engine: 'openai', model: engineConfig.openai.model, apiKey: engineConfig.openai.apiKey }
      });
      setResumeText(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setError(e.message || "Failed to generate master resume.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold opacity-60">Company</label>
        <input className={`w-full p-2 text-xs rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`} value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
        <label className="text-[10px] uppercase font-bold opacity-60">Role</label>
        <input className={`w-full p-2 text-xs rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
        <div className="flex gap-2">
            <div className="flex-1">
                <label className="text-[10px] uppercase font-bold opacity-60">Start Year</label>
                <input className={`w-full p-2 text-xs rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`} value={formData.startYear} onChange={e => setFormData({...formData, startYear: e.target.value})} />
            </div>
            <div className="flex-1">
                <label className="text-[10px] uppercase font-bold opacity-60">End Year</label>
                <input className={`w-full p-2 text-xs rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`} value={formData.endYear} onChange={e => setFormData({...formData, endYear: e.target.value})} />
            </div>
        </div>
        <label className="text-[10px] uppercase font-bold opacity-60">Basic Experience Description</label>
        <textarea className={`w-full p-2 text-xs rounded-lg h-24 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Briefly describe what you did..." />
      </div>
      <button 
        onClick={handleSubmit} 
        disabled={isLoading}
        className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl text-xs transition-colors hover:bg-emerald-400"
      >
        {isLoading ? 'Generating...' : 'Generate Master Resume'}
      </button>
      {error && <div className="text-[10px] text-red-500">{error}</div>}
    </div>
  );
};
