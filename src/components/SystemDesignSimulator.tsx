import React, { useState } from 'react';
import { ArrowLeft, Server, MessageSquare, Send } from 'lucide-react';

interface SystemDesignSimulatorProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const SystemDesignSimulator: React.FC<SystemDesignSimulatorProps> = ({ isDarkMode, onBack }) => {
  const [prompt, setPrompt] = useState('Design a Global HA Database for AWS');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');

  const handleStart = () => {
    setMessages([
      { role: 'user', text: `Let's practice: ${prompt}` },
      { role: 'ai', text: `Great. To design ${prompt}, let's start with the requirements. Can you outline the functional and non-functional requirements you'd consider?` }
    ]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: "That's a good start. How would you handle data replication across regions to ensure high availability and low latency?" }]);
    }, 1000);
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
            <Server className="w-5 h-5 text-indigo-500" />
            System Design Simulator
          </h2>
          <p className="text-xs opacity-70">FAANG Architecture Mock Interview</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold">Ready to whiteboard?</h3>
            <p className="text-sm opacity-70">Enter a system design question to start your mock interview.</p>
          </div>
          
          <input 
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={`w-full p-4 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}
            placeholder="e.g., Design Twitter, Design Netflix"
          />
          <button 
            onClick={handleStart}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            Start Interview
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full relative">
          <div className="flex-1 overflow-y-auto space-y-4 pb-24 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white' 
                    : isDarkMode ? 'bg-white/10' : 'bg-gray-100'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          
          <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${isDarkMode ? 'bg-[#1e2024] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Explain your architectural choices..."
                className={`flex-1 p-3 rounded-xl border outline-none text-sm ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-black/10'}`}
              />
              <button 
                onClick={handleSend}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
