'use client'; 
 
 import './globals.css';
import { Inter } from 'next/font/google';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TenantProvider } from '@/context/TenantContext';
import { TrialBanner, ExpiredOverlay } from '@/components/TenantStatusComponents';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isLoginPage = pathname === '/login';

  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TenantProvider>
          <TrialBanner />
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }} />
          <ExpiredOverlay />
          
          {isLoginPage ? (
            <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950">
              {children}
            </main>
          ) : (
            <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
              
              {/* MOBILE OVERLAY */}
              {isSidebarOpen && (
                <div
                  className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              {/* SIDEBAR COMPONENT */}
              <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

              {/* MAIN CONTENT WRAPPER */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
                
                {/* MOBILE HEADER */}
                <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 lg:hidden sticky top-0 z-30 print:hidden transition-colors">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors">
                      <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">RT</span>
                      </div>
                      <span className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight">RT ONLINE</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-50 dark:from-emerald-900 dark:to-teal-900 border border-emerald-100 dark:border-emerald-800" />
                  </div>
                </header>

                {/* CONTENT SCROLLABLE AREA */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scroll-smooth">
                  {children}
                </main>
              </div>

            </div>
          )}
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}