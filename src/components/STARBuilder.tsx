import React, { useState } from 'react';
import { ArrowLeft, Target, Sparkles, LayoutList } from 'lucide-react';

interface STARBuilderProps {
  isDarkMode: boolean;
  onBack: () => void;
  resumeData?: any;
}

export const STARBuilder: React.FC<STARBuilderProps> = ({ isDarkMode, onBack, resumeData }) => {
  const [principle, setPrinciple] = useState('Customer Obsession');
  const [story, setStory] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const principles = [
    "Customer Obsession", "Ownership", "Invent and Simplify", 
    "Are Right, A Lot", "Learn and Be Curious", "Hire and Develop the Best",
    "Insist on Highest Standards", "Think Big", "Bias for Action",
    "Frugality", "Earn Trust", "Dive Deep", "Have Backbone; Disagree and Commit",
    "Deliver Results"
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setStory({
        situation: "While leading the cloud migration team, we faced severe latency issues impacting 40% of our enterprise clients during peak hours.",
        task: "I needed to architect a zero-downtime solution to route traffic dynamically across multi-region clusters without increasing our AWS spend by more than 10%.",
        action: "I spearheaded the deployment of an Active-Active architecture using Route53 latency-based routing and Aurora Global Databases, and convinced stakeholders to adopt a phased rollout.",
        result: "Reduced P99 latency by 65%, improved customer satisfaction scores by 40%, and we successfully onboarded 3 new Fortune 500 clients within the same quarter due to the new SLA guarantees."
      });
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            Amazon LP / STAR Builder
          </h2>
          <p className="text-xs opacity-70">Behavioral Interview Ghostwriter</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 max-w-4xl mx-auto w-full">
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
          <h3 className="text-sm font-bold mb-4 uppercase tracking-wider opacity-70">1. Select Leadership Principle</h3>
          <div className="flex flex-wrap gap-2">
            {principles.map(p => (
              <button
                key={p}
                onClick={() => setPrinciple(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  principle === p 
                    ? 'bg-rose-500 text-white border-rose-500' 
                    : isDarkMode ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-70 flex items-center gap-2">
              <LayoutList className="w-4 h-4" /> 
              2. Extract from Resume History
            </h3>
          </div>
          <p className="text-xs opacity-70 mb-4">We will scan your Master Resume to find the best achievement that demonstrates <strong>{principle}</strong>.</p>
          
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? 'Drafting STAR Narrative...' : 'Generate Perfect STAR Story'}
          </button>
        </div>

        {story && (
          <div className={`p-6 rounded-2xl border shadow-xl ${isDarkMode ? 'bg-[#2a1b22] border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
            <h3 className="text-lg font-bold text-rose-500 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5" /> Generated Response for: {principle}
            </h3>
            
            <div className="space-y-4">
              {Object.entries(story).map(([key, value]) => (
                <div key={key} className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-rose-500 text-white font-black flex items-center justify-center uppercase">
                    {key.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-1">{key}</h4>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      {value as string}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
