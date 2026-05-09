import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar/Sidebar';

export const Layout = ({ children, isDarkMode, setIsDarkMode, isFocusMode, setIsFocusMode, activeTab, setActiveTab, user, ...rest }: any) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className={`h-screen flex flex-col relative overflow-hidden ${isDarkMode ? 'dark bg-[#060b1a] text-white/95' : 'bg-neutral-50 text-neutral-900'} transition-colors`}>
      {/* Background Auras */}
      {isDarkMode && (
        <>
          <div className="absolute top-0 left-0 w-full h-full aura-purple pointer-events-none opacity-50" />
          <div className="absolute top-0 right-0 w-full h-full aura-cyan pointer-events-none opacity-30" />
          <div className="absolute bottom-0 left-0 w-full h-full aura-green pointer-events-none opacity-20" />
        </>
      )}
      
      {/* Mobile-friendly header */}
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="font-bold">NEXUS AI</h1>
        <div className="flex items-center gap-2">
          <button 
            className="md:hidden p-2"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? 'Close' : 'Menu'}
          </button>
          <button 
            className="w-8 h-8 rounded-full bg-indigo-500 hover:ring-2 ring-white" 
            onClick={() => setActiveTab('profile')}
            aria-label="Profile"
          />
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        <div className={`
          fixed inset-0 z-50 transition-transform md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            <Sidebar />
            <button 
                className="md:hidden absolute top-4 right-4"
                onClick={() => setIsSidebarOpen(false)}
            >Close</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ isDarkMode, setIsDarkMode, isFocusMode, setIsFocusMode, user, ...rest }} />
        </div>
      </main>
    </div>
  );
};
