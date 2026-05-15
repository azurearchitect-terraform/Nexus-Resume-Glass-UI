import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar/Sidebar';

export const Layout = ({ children, isDarkMode, setIsDarkMode, isFocusMode, setIsFocusMode, activeTab, setActiveTab, user, ...rest }: any) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'dark bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'} transition-colors`}>
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
