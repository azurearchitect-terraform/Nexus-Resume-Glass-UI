import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  FileText, 
  Brain, 
  BarChart3, 
  User, 
  Settings,
  Sparkles
} from 'lucide-react';

interface NavItem {
  name: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Resume', icon: FileText },
  { name: 'AI Tools', icon: Brain },
  { name: 'Analytics', icon: BarChart3 },
  { name: 'Profile', icon: User },
  { name: 'Settings', icon: Settings },
];

export const WorkspaceSidebar = () => {
  const [activeItem, setActiveItem] = useState('Dashboard');

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed left-4 top-4 bottom-4 w-20 flex flex-col items-center py-6 bg-neutral-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Glow effect */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="mt-2 mb-10 flex items-center justify-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 gap-4 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.name;

          return (
            <div key={item.name} className="relative group">
              <motion.button
                onClick={() => setActiveItem(item.name)}
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/10 text-emerald-400 shadow-inner' 
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-6 w-6" />
                
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-8 bg-emerald-400 rounded-r-full"
                  />
                )}
              </motion.button>

              {/* Tooltip */}
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 0, x: 10 }}
                  whileHover={{ opacity: 1, x: 15 }}
                  className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-neutral-900/90 backdrop-blur-lg border border-white/10 rounded-lg text-xs font-medium text-white whitespace-nowrap pointer-events-none"
                >
                  {item.name}
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Profile/Bottom */}
      <div className="pt-6 border-t border-white/5">
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-800/50 text-neutral-400 hover:text-white border border-white/5"
        >
          <User className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.aside>
  );
};
