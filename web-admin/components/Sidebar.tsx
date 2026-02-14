'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Building, Megaphone, FileText, Wallet, 
  TrendingDown, BarChart3, Database, Package, CheckSquare, 
  CalendarClock, BookOpen, ShieldAlert, MessageSquareWarning, 
  ShoppingCart, Settings, LogOut, X, ChevronRight, LogIn, Gift, Loader2, Cctv, CreditCard, Network
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import axios from '@/lib/axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';
import { formatRole } from '@/lib/utils';
import { DemoLabel } from '@/components/TenantStatusComponents';

const menus = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Langganan & Billing', icon: CreditCard, href: '/dashboard/billing' },
  { name: 'Data Warga', icon: Users, href: '/dashboard/warga' },
  { name: 'Manajemen Kost', icon: Building, href: '/dashboard/kost' },
  { name: 'Pengumuman', icon: Megaphone, href: '/dashboard/pengumuman' },
  { name: 'Layanan Surat', icon: FileText, href: '/dashboard/surat' },
  { name: 'Bansos (Bantuan)', icon: Gift, href: '/dashboard/bansos' },
  { name: 'Keuangan', icon: Wallet, href: '/dashboard/keuangan' },
  { name: 'Laporan Iuran', icon: FileText, href: '/dashboard/iuran' },
  { name: 'Inventaris', icon: Package, href: '/dashboard/inventaris' },
  { name: 'Voting Warga', icon: CheckSquare, href: '/dashboard/voting' },
  { name: 'Jadwal Ronda', icon: CalendarClock, href: '/dashboard/jadwal-ronda' },
  { name: 'Monitoring CCTV', icon: Cctv, href: '/dashboard/cctv' },
  { name: 'Buku Tamu', icon: BookOpen, href: '/dashboard/tamu' },
  { name: 'Emergency / SOS', icon: ShieldAlert, href: '/dashboard/darurat' },
  { name: 'Laporan Warga', icon: MessageSquareWarning, href: '/dashboard/laporan-warga' },
  { name: 'UMKM Warga', icon: ShoppingCart, href: '/dashboard/umkm' },
];

const superAdminMenus = [
  { name: 'Revenue Overview', icon: BarChart3, href: '/dashboard/super-admin/revenue' },
  { name: 'Tenants Billing', icon: Building, href: '/dashboard/super-admin/tenants' },
  { name: 'Invoices', icon: FileText, href: '/dashboard/super-admin/invoices' },
  { name: 'Payment Settings', icon: CreditCard, href: '/dashboard/super-admin/payment-settings' },
];

export default function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [rtName, setRtName] = useState('RT Online');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchUserProfile();
    fetchAppSettings();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/me');
      setUser(response.data.data); // Adjust based on actual API response structure
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchAppSettings = async () => {
    try {
      const response = await axios.get('/app-settings');
      if (response.data.success) {
        setLogoUrl(response.data.data.logo_url);
        setRtName(response.data.data.rt_name || 'RT Online');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleLogout = async () => {
    // 1. Better Confirmation UX using SweetAlert2
    const result = await Swal.fire({
      title: 'Yakin ingin keluar?',
      text: "Sesi Anda akan berakhir.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981', // Emerald-500
      cancelButtonColor: '#64748b', // Slate-500
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl font-sans',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold'
      }
    });

    if (!result.isConfirmed) return;
    
    setIsLoggingOut(true);
    const toastId = toast.loading('Sedang keluar...');

    try {
      // 2. Call Logout API
      await axios.post('/logout');
      
      // 3. Clear Cookies (Correct storage based on axios.ts)
      Cookies.remove('admin_token');
      Cookies.remove('admin_token', { path: '/' });
      
      // 4. Also clear localStorage just in case legacy code uses it
      localStorage.removeItem('token');

      toast.success('Berhasil logout', { id: toastId });
      
      // 5. Redirect
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Gagal logout', { id: toastId });
      
      // Force logout anyway
      Cookies.remove('admin_token');
      Cookies.remove('admin_token', { path: '/' });
      localStorage.removeItem('token');
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isSettingsActive = pathname === '/dashboard/pengaturan';

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800
      transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      grid grid-rows-[auto_1fr_auto] h-screen max-h-screen overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none lg:shadow-none
      print:hidden
    `}>
      
      {/* --- LOGO AREA --- */}
      <div className="h-24 shrink-0 flex items-center justify-between px-6 border-b border-slate-100/50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/dashboard')}>
          <div className="relative w-11 h-11 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 group-hover:scale-105 transition-all duration-300">
             {(user?.rt?.logo_url || logoUrl) ? (
                <img src={user?.rt?.logo_url || logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
             ) : (
                <div className="text-white font-bold text-xl tracking-tighter">RT</div>
             )}
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100 leading-none group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                {user?.rt?.rt_name || rtName}
              </span>
              <DemoLabel />
            </div>
            <span className="text-[11px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mt-1">Super App</span>
          </div>
        </div>
        <button className="lg:hidden p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" onClick={() => setIsOpen && setIsOpen(false)}>
          <X size={20} />
        </button>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="overflow-y-auto min-h-0 py-6 px-4 space-y-1.5 custom-scrollbar flex flex-col">
        <div className="flex-1 space-y-1.5">
          <div className="px-4 mb-3 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Menu Utama'}
          </div>
          {(user?.role === 'SUPER_ADMIN' ? superAdminMenus : menus).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen && setIsOpen(false)}
                className={`
                  flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-900/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}
                `}
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className={`
                      p-1.5 rounded-xl transition-all duration-300
                      ${isActive 
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:shadow-sm'}
                  `}>
                      <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span>{item.name}</span>
                </div>
                
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-l-full"></div>
                )}
              </Link>
            );
          })}
        </div>

        {/* --- SETTINGS BUTTON (Scrollable) --- */}
        <div className="mt-2 mb-4">
          <Link
            href="/dashboard/pengaturan"
            onClick={() => setIsOpen && setIsOpen(false)}
            className={`
              flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
              ${isSettingsActive 
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-900/30' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}
            `}
          >
              <div className="flex items-center gap-3.5 relative z-10">
                  <div className={`
                      p-1.5 rounded-xl transition-all duration-300
                      ${isSettingsActive 
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:shadow-sm'}
                  `}>
                      <Settings size={18} strokeWidth={isSettingsActive ? 2.5 : 2} />
                  </div>
                  <span>Pengaturan</span>
              </div>
              
              {isSettingsActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-l-full"></div>
              )}
          </Link>
        </div>
      </nav>

      {/* --- FOOTER (User Profile Only) --- */}
      <div className="shrink-0 flex flex-col bg-white dark:bg-slate-900 z-10 border-t border-slate-100 dark:border-slate-800">
        <div className="p-4 bg-slate-50/30 dark:bg-slate-800/30">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-emerald-100 dark:hover:border-emerald-900 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-50 dark:from-emerald-900 dark:to-teal-900 border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0">
                       <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                          {user?.name?.charAt(0).toUpperCase() || 'A'}
                       </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {user?.name || 'Admin'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {formatRole(user?.role)}
                      </span>
                  </div>
              </div>
              <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Logout"
              >
                  {isLoggingOut ? (
                      <Loader2 size={18} className="animate-spin text-rose-500" />
                  ) : (
                      <LogOut size={18} strokeWidth={1.5} />
                  )}
              </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
