import React, { useState, useEffect, useCallback } from 'react';
import { Search, Command, X, FileText, Briefcase, Code, GraduationCap, Zap, Settings, HelpCircle, ArrowRight, User, Layout, BarChart3, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useResumeStore } from '../store/useResumeStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  resumeData: any;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, isDarkMode, resumeData }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'element' | 'section' | 'tool'>('all');
  const { elements, selectElement } = useResumeStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setQuery('');
      setActiveCategory('all');
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const getResults = () => {
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();

    // Search in Elements
    if (activeCategory === 'all' || activeCategory === 'element') {
      elements.forEach(el => {
        const content = el.content || '';
        const type = el.type || '';
        if (!query || content.toLowerCase().includes(lowerQuery) || type.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: el.id,
            type: 'element',
            title: type.charAt(0).toUpperCase() + type.slice(1),
            subtitle: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
            icon: type === 'experience' ? Briefcase : type === 'education' ? GraduationCap : type === 'skills' ? Code : FileText,
            action: () => {
              selectElement(el.id);
              onClose();
            }
          });
        }
      });
    }

    // Search in Sections
    if (activeCategory === 'all' || activeCategory === 'section') {
      const sectionIcons: any = {
        personal_info: User,
        experience: Briefcase,
        skills: Code,
        certifications: Zap,
        projects: Zap,
        education: GraduationCap,
        summary: FileText
      };

      if (resumeData) {
        Object.keys(resumeData).forEach(key => {
          const displayTitle = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          if (!query || key.toLowerCase().includes(lowerQuery) || displayTitle.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: `section-${key}`,
              type: 'section',
              title: displayTitle,
              subtitle: 'Navigate to this resume section',
              icon: sectionIcons[key] || FileText,
              action: () => {
                const el = document.getElementById(`section-${key}`) || document.getElementById(key);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                onClose();
              }
            });
          }
        });
      }
    }

    // App Tools
    if (activeCategory === 'all' || activeCategory === 'tool') {
      const tools = [
        { title: 'Job Tracker', icon: Briefcase, id: 'tracker' },
        { title: 'AI Optimizer', icon: Zap, id: 'optimizer' },
        { title: 'Portal Skill Optimization', icon: Key, id: 'skill_extractor' },
        { title: 'Resume JSON Viewer', icon: Code, id: 'json' },
        { title: 'Admin Dashboard', icon: BarChart3, id: 'admin' },
        { title: 'Settings', icon: Settings, id: 'settings' }
      ];

      tools.forEach(tool => {
        if (!query || tool.title.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `tool-${tool.id}`,
            type: 'tool',
            title: tool.title,
            subtitle: 'Open application tool',
            icon: tool.icon,
            action: () => {
              // Action logic handled by parent or specific tool triggers
              if (tool.id === 'json') {
                 document.dispatchEvent(new CustomEvent('toggle-json-viewer'));
              } else if (tool.id === 'admin') {
                 document.dispatchEvent(new CustomEvent('toggle-admin-dashboard'));
              }
              onClose();
            }
          });
        }
      });
    }

    return results;
  };

  const results = getResults();

  const highlightMatch = (text: string, query: string) => {
    if (!text || !query) return text || '';
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => (
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="text-emerald-500 font-bold">{part}</span> 
            : part
        ))}
      </span>
    );
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All', icon: Command },
    { id: 'section', label: 'Sections', icon: Layout },
    { id: 'element', label: 'Content', icon: FileText },
    { id: 'tool', label: 'Tools', icon: Zap },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'
        }`}
      >
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search className="w-5 h-5 opacity-50" />
          <input 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything (Sections, Content, Tools)..."
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:opacity-30"
          />
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold opacity-50">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md transition-colors">
            <X className="w-4 h-4 opacity-50" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-2 px-4 border-b border-white/5 overflow-x-auto shrink-0 no-scrollbar">
          {categories.map(cat => {
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat.id 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : isDarkMode ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-black/50'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar min-h-[300px]">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.slice(0, 50).map((result) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={result.action}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group ${
                      isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      result.type === 'tool' ? 'bg-amber-500/10 text-amber-500' :
                      result.type === 'section' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {highlightMatch(result.title, query)}
                        <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded opacity-50 font-bold border ${
                          isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'
                        }`}>
                          {result.type}
                        </span>
                      </div>
                      <div className="text-xs opacity-50 truncate w-full">
                        {highlightMatch(result.subtitle, query)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <span className="text-[10px] font-bold opacity-30">SELECT</span>
                      <ArrowRight className="w-4 h-4 text-emerald-500 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </div>
                  </button>
                );
              })}
              {results.length > 50 && (
                <div className="p-4 text-center text-xs opacity-30 italic font-medium">
                  Showing top 50 results. Refine your search to find more.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 h-full flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-full bg-white/5 border border-white/10 animate-pulse">
                <HelpCircle className="w-8 h-8 opacity-20" />
              </div>
              <div className="flex flex-col items-center">
                <div className="font-bold opacity-40">No matches found for "{query}"</div>
                <div className="text-xs opacity-30 mt-1">Try another keyword or change the category filter.</div>
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 border-t flex items-center justify-between text-[10px] font-bold opacity-30 uppercase tracking-widest bg-black/5 dark:bg-white/5 ${
          isDarkMode ? 'border-white/10' : 'border-black/5'
        }`}>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-0.5">
                <kbd className="p-1 px-1.5 bg-white/10 border border-white/10 rounded">↑</kbd>
                <kbd className="p-1 px-1.5 bg-white/10 border border-white/10 rounded">↓</kbd>
              </span>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="p-1 px-1.5 bg-white/10 border border-white/10 rounded">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="p-1 px-1.5 bg-white/10 border border-white/10 rounded">Esc</kbd>
              Close
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Nexus Search Engine v1.1
          </div>
        </div>
      </motion.div>
    </div>

  );
};
