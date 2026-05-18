import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Sparkles, SlidersHorizontal, Bell, LayoutGrid, UserCircle, Settings } from 'lucide-react';

type LiquidGlassDemoProps = {
  isDarkMode: boolean;
};

export default function LiquidGlassDemo({ isDarkMode }: LiquidGlassDemoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const paletteItems = useMemo(
    () => ['Open Resume Builder', 'Switch Theme', 'Toggle Focus Mode', 'Export PDF', 'Open Profile'],
    [],
  );

  const filteredPaletteItems = paletteItems.filter((item) =>
    item.toLowerCase().includes(paletteQuery.toLowerCase()),
  );

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-indigo-950/60 to-slate-900/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-white/5 pointer-events-none" />
      <div className="liquid-container z-0 opacity-70">
        <div className="liquid-blob w-[75vw] h-[75vw] -top-1/4 -left-1/6" style={{ animationDelay: '-3s' }} />
        <div className="liquid-blob liquid-blob-secondary w-[60vw] h-[60vw] top-1/3 right-0" style={{ animationDelay: '-9s' }} />
        <div className="liquid-blob w-[55vw] h-[55vw] -bottom-1/4 left-1/3" style={{ animationDelay: '-15s', background: 'rgba(168, 85, 247, 0.42)' }} />
      </div>

      <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-[1500px] mx-auto space-y-6">
          <section className="glass-panel glass-spec rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/70 mb-2">Liquid Glass Material System</p>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">Liquid Glass Material Showcase</h1>
                <p className="text-sm md:text-base text-white/80 max-w-2xl">
                  Explore thin/panel/thick/card materials, capsule controls, modal glass, and spotlight overlay in one view.
                </p>
              </div>
              <button
                type="button"
                className="ios-control ios-control-accent glass-spec text-sm font-semibold px-6 py-3 self-start"
                onClick={() => setIsPaletteOpen(true)}
              >
                Open Spotlight (⌘K)
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[280px,1fr] gap-6">
            <aside className="glass-thick glass-spec rounded-3xl p-4 md:p-5 space-y-3 h-fit">
              {[
                { label: 'Dashboard', icon: LayoutGrid },
                { label: 'Notifications', icon: Bell },
                { label: 'Audience Controls', icon: SlidersHorizontal },
                { label: 'Profile', icon: UserCircle },
                { label: 'Settings', icon: Settings },
              ].map((item, idx) => (
                <button
                  key={item.label}
                  type="button"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all ${idx === 0 ? 'ios-control ios-control-accent glass-spec' : 'glass-thin hover:bg-white/20'}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </aside>

            <section className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {['Glass Thin', 'Glass Panel', 'Glass Card'].map((title, index) => (
                  <div key={title} className={`${index === 0 ? 'glass-thin' : index === 1 ? 'glass-panel' : 'glass-card'} glass-spec rounded-2xl p-5`}>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60 mb-2">{title}</p>
                    <h3 className="text-lg font-semibold text-white">{index === 0 ? 'HUD Layer' : index === 1 ? 'Content Layer' : 'Interactive Card'}</h3>
                    <p className="text-sm text-white/75 mt-2">Enhanced blur, saturation, and rim highlights for a clearer Liquid Glass effect.</p>
                  </div>
                ))}
              </div>

              <div className="glass-card glass-spec rounded-3xl p-5 md:p-6 space-y-5">
                <h2 className="text-xl font-semibold tracking-tight text-white">Sample form controls</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs uppercase tracking-widest text-white/60">Target Role</span>
                    <input
                      type="text"
                      defaultValue="Senior Software Engineer"
                      className="mt-2 w-full rounded-2xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-widest text-white/60">Target Company</span>
                    <select className="mt-2 w-full rounded-2xl px-4 py-3 bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40">
                      <option value="apple">Apple</option>
                      <option value="microsoft">Microsoft</option>
                      <option value="google">Google</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="ios-control ios-control-accent glass-spec text-sm px-5 py-2.5" onClick={() => setIsModalOpen(true)}>
                    Open Modal Example
                  </button>
                  <button type="button" className="ios-control glass-spec text-sm px-5 py-2.5" onClick={() => setIsPaletteOpen(true)}>
                    Open Command Palette
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/45 backdrop-blur-sm z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              className={`absolute z-40 inset-x-4 md:inset-x-auto md:right-8 top-24 md:w-[460px] rounded-3xl p-6 glass-thick glass-spec ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
            >
              <h3 className="text-xl font-bold mb-2">Modal / Popup Material</h3>
              <p className="text-sm text-white/80 mb-5">This uses the thick glass layer plus specular rim to imitate an iOS sheet.</p>
              <div className="flex justify-end gap-3">
                <button type="button" className="ios-control glass-spec px-4 py-2 text-sm" onClick={() => setIsModalOpen(false)}>
                  Close
                </button>
                <button type="button" className="ios-control ios-control-accent glass-spec px-4 py-2 text-sm" onClick={() => setIsModalOpen(false)}>
                  Confirm
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaletteOpen && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-md z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaletteOpen(false)}
            />
            <motion.div
              className="absolute z-50 top-16 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl glass-thick glass-spec rounded-3xl overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <div className="p-4 border-b border-white/15">
                <div className="glass-thin rounded-full px-4 py-3 flex items-center gap-3">
                  <Search className="w-4 h-4 text-white/80" />
                  <input
                    autoFocus
                    value={paletteQuery}
                    onChange={(e) => setPaletteQuery(e.target.value)}
                    placeholder="Type a command..."
                    className="w-full bg-transparent text-white placeholder:text-white/50 focus:outline-none"
                  />
                  <span className="text-[11px] px-2 py-1 rounded-full border border-white/20 text-white/60">ESC</span>
                </div>
              </div>
              <div className="p-3 space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
                {filteredPaletteItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setIsPaletteOpen(false)}
                    className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors text-white/90 flex items-center justify-between"
                  >
                    <span>{item}</span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </button>
                ))}
                {filteredPaletteItems.length === 0 && (
                  <p className="text-sm text-white/60 px-4 py-6">No commands found.</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
