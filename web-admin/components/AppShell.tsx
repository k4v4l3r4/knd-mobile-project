'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Menu } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Login Page Check - Full Screen, No Layout
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0B0E14] transition-colors duration-300">
      
      {/* MOBILE OVERLAY BACKDROP */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR COMPONENT */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        {/* MOBILE HEADER */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-[#11141D] border-b border-slate-200 dark:border-slate-800 lg:hidden sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <div className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">
            RT ONLINE
          </div>
          {/* Theme Toggle for Mobile */}
          <div>
            <ThemeToggle />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth h-[calc(100vh-64px)] lg:h-screen">
          <div className="max-w-7xl mx-auto w-full pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
