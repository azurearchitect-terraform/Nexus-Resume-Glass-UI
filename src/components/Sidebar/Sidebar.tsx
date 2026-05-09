import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Layout, 
  Type, 
  Briefcase, 
  GraduationCap, 
  Code, 
  Layers, 
  Image as ImageIcon, 
  Sparkles,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
  Settings,
  Target,
  FileText,
  RefreshCw,
  Cpu,
  Zap,
  CheckCircle2,
  Search
} from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { ElementType, CanvasElement } from '../../types/resume';
import { cn } from '../../lib/utils';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { rewriteSectionWithAI } from '../../services/aiService';

interface SortableItemProps {
  id: string;
  element: any;
  key?: string;
}

const SortableItem = ({ id, element }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const { toggleVisibility, removeElement, selectElement, selectedElementIds, darkMode } = useResumeStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  const isSelected = selectedElementIds.includes(id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer active:scale-[0.98]",
        isSelected 
          ? (darkMode ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_-5px_rgba(0,229,255,0.3)]" : "border-indigo-500 bg-indigo-50") 
          : (darkMode ? "border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10" : "border-transparent hover:bg-gray-50"),
        !element.isVisible && "opacity-40"
      )}
      onClick={() => selectElement(id)}
    >
      <div {...attributes} {...listeners} className={cn("cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-white/5 transition-colors", darkMode ? "text-white/20 hover:text-white/60" : "text-gray-400")}>
        <GripVertical size={12} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={cn("text-[9px] font-black uppercase tracking-widest leading-none mb-1", darkMode ? (isSelected ? "text-cyan-400" : "text-white/40") : "text-gray-700")}>
          {element.type}
        </div>
        <div className={cn("text-[10px] font-medium truncate opacity-60", darkMode ? "text-white" : "text-gray-600")}>
          {element.content}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); toggleVisibility(id); }}
          className={cn("p-1.5 rounded-md transition-colors", darkMode ? "hover:bg-white/10 text-white/30 hover:text-white/90" : "hover:bg-gray-200 text-gray-500")}
        >
          {element.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeElement(id); }}
          className={cn("p-1.5 rounded-md transition-colors", darkMode ? "hover:bg-red-500/20 text-white/30 hover:text-red-400" : "hover:bg-red-100 text-red-500")}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  const { 
    addElement, 
    elements, 
    reorderElements, 
    resetResume, 
    jobDescription, 
    targetRole, 
    updateConfig,
    updateElement,
    aiEngine,
    audience,
    setComparisonData,
    darkMode
  } = useResumeStore();
  const [activeTab, setActiveTab] = useState<'tools' | 'config'>('tools');

  const audiences = [
    { id: 'Enterprise', name: 'Enterprise/Big Tech', desc: 'Focus on scale, leadership, and architecture.' },
    { id: 'Startup', name: 'Startup/Agile', desc: 'Focus on speed, versatility, and ownership.' },
    { id: 'Technical', name: 'Technical/Internal', desc: 'Deep dive into implementation and tooling.' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = elements.findIndex((el) => el.id === active.id);
      const newIndex = elements.findIndex((el) => el.id === over.id);
      reorderElements(oldIndex, newIndex);
    }
  };

  const tools = [
    { type: 'text' as ElementType, icon: Type, label: 'Text Block' },
    { type: 'experience' as ElementType, icon: Briefcase, label: 'Experience' },
    { type: 'education' as ElementType, icon: GraduationCap, label: 'Education' },
    { type: 'skills' as ElementType, icon: Code, label: 'Skills' },
    { type: 'projects' as ElementType, icon: Layers, label: 'Projects' },
  ];

  const engines = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', desc: 'Next Gen Fast', icon: Zap },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', desc: 'Next Gen Pro', icon: Cpu },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', desc: 'Lightweight Fast Model', icon: Zap },
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', desc: 'Latest Fast Model', icon: Zap },
  ];

  return (
    <aside className={cn(
      "w-64 h-full border-r flex flex-col overflow-hidden transition-all duration-300 relative z-20 shrink-0",
      darkMode ? "bg-[#060b1a]/80 backdrop-blur-xl border-white/5" : "bg-white border-black/5"
    )}>
      {/* Search Header */}
      <div className="p-3">
         <button 
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-left group",
            darkMode ? "bg-white/5 border-white/5 hover:border-white/20" : "bg-gray-50 border-gray-200 hover:border-gray-300"
          )}
        >
          <Search size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-medium opacity-40 group-hover:opacity-70 transition-opacity flex-1">Quick Search...</span>
          <div className="px-1 py-0.5 rounded border border-white/10 bg-white/5 text-[8px] font-black opacity-30">
            ⌘K
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className={cn(
        "flex px-3 border-b border-transparent mb-2",
        darkMode ? "" : "border-gray-100"
      )}>
        <button 
          onClick={() => setActiveTab('tools')}
          className={cn(
            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-b-2",
            activeTab === 'tools' 
              ? (darkMode ? "text-cyan-400 border-cyan-500 bg-cyan-500/5 shadow-[0_4px_12px_-4px_rgba(0,229,255,0.2)]" : "text-indigo-600 border-indigo-600 bg-indigo-50/30") 
              : (darkMode ? "text-white/30 border-transparent hover:text-white/60" : "text-gray-400 hover:text-gray-600")
          )}
        >
          <Layout size={12} />
          Assets
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={cn(
            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-b-2",
            activeTab === 'config' 
              ? (darkMode ? "text-violet-400 border-violet-500 bg-violet-500/5 shadow-[0_4px_12px_-4px_rgba(168,85,247,0.2)]" : "text-indigo-600 border-indigo-600 bg-indigo-50/30") 
              : (darkMode ? "text-white/30 border-transparent hover:text-white/60" : "text-gray-400 hover:text-gray-600")
          )}
        >
          <Settings size={12} />
          Global
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
        {activeTab === 'tools' ? (
          <>
            {/* Add Elements */}
            <div>
              <h3 className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-3 opacity-40 px-1", darkMode ? "text-white" : "text-gray-400")}>Components</h3>
              <div className="grid grid-cols-2 gap-2">
                {tools.map((tool) => (
                  <button
                    key={tool.type}
                    onClick={() => addElement(tool.type)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border transition-all group active:scale-95",
                      darkMode 
                        ? "bg-white/2 border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 shadow-sm" 
                        : "border-gray-100 hover:border-indigo-300 hover:bg-indigo-50"
                    )}
                  >
                    <tool.icon size={16} className={cn("mb-1.5 transition-colors", darkMode ? "text-white/40 group-hover:text-cyan-400" : "text-gray-500 group-hover:text-indigo-600")} />
                    <span className={cn("text-[8px] font-bold uppercase tracking-wider transition-colors", darkMode ? "text-white/50 group-hover:text-white/90" : "text-gray-600 group-hover:text-indigo-700")}>{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Layers / Section List */}
            <div>
              <h3 className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-3 opacity-40 px-1", darkMode ? "text-white" : "text-gray-400")}>Active Layers</h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={elements.map(el => el.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {elements.map((element) => (
                      <SortableItem key={element.id} id={element.id} element={element} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="glass p-3 border-white/5 bg-white/2">
              <label className={cn("text-[9px] font-black uppercase mb-2 flex items-center gap-2", darkMode ? "text-white/40" : "text-gray-500")}>
                <Target size={12} className="text-cyan-400" />
                Default Role
              </label>
              <input 
                type="text"
                value={targetRole}
                onChange={(e) => updateConfig({ targetRole: e.target.value })}
                placeholder="e.g. Senior Frontend Engineer"
                className={cn(
                  "w-full px-3 py-1.5 border rounded-md text-[11px] focus:outline-none transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/50 placeholder:opacity-20" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              />
            </div>

            <div className="glass p-3 border-white/5 bg-white/2">
              <label className={cn("text-[9px] font-black uppercase mb-2 flex items-center gap-2", darkMode ? "text-white/40" : "text-gray-500")}>
                <FileText size={12} className="text-violet-400" />
                Baseline Notes
              </label>
              <textarea 
                value={jobDescription}
                onChange={(e) => updateConfig({ jobDescription: e.target.value })}
                placeholder="Core career achievements..."
                className={cn(
                  "w-full h-32 px-3 py-1.5 border rounded-md text-[11px] focus:outline-none transition-all resize-none leading-relaxed",
                  darkMode ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/50 placeholder:opacity-20" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              />
            </div>

            <div>
              <h3 className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-3 opacity-40 px-1", darkMode ? "text-white" : "text-gray-400")}>Style Engine</h3>
              <div className="space-y-1.5">
                {audiences.map((aud) => (
                  <button
                    key={aud.id}
                    onClick={() => updateConfig({ audience: aud.id })}
                    className={cn(
                      "w-full p-2.5 rounded-lg border transition-all flex items-center gap-3 text-left active:scale-[0.98]",
                      audience === aud.id 
                        ? (darkMode ? "border-cyan-500/50 bg-cyan-500/10" : "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500") 
                        : (darkMode ? "border-white/5 hover:border-white/10 bg-white/2 hover:bg-white/5" : "border-gray-100 hover:border-gray-200 bg-white")
                    )}
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className={cn("text-[10px] font-black uppercase tracking-wider", darkMode ? (audience === aud.id ? "text-cyan-400" : "text-white/70") : "text-gray-900")}>{aud.name}</div>
                      <div className="text-[9px] text-white/30 truncate">{aud.desc}</div>
                    </div>
                    {audience === aud.id && <CheckCircle2 size={12} className="text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        "p-3 border-t transition-all",
        darkMode ? "bg-white/2 border-white/5" : "bg-gray-50 border-gray-100"
      )}>
        <button 
          onClick={resetResume}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
            darkMode ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "bg-gray-900 text-white hover:bg-black"
          )}
        >
          <Plus size={14} />
          New Draft
        </button>
      </div>
    </aside>
  );
};
