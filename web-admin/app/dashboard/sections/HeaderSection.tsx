'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, X, User, LogOut, Settings, ChevronDown, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DemoLabel } from '@/components/TenantStatusComponents';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale, id } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';
import { toast } from 'react-hot-toast';
import { formatRole } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ACTION';
  url: string | null;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  role: string;
  avatar: string | null;
  photo_url: string | null;
}

export default function HeaderSection() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isDemo, status } = useTenant();
  
  const currentDate = format(new Date(), 'EEEE, d MMMM yyyy', { locale: id });

  useEffect(() => {
    if (!status) return;
    fetchUnreadCount();
    fetchUser();
  }, [status]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUser = async () => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        setUser({ id: 1, name: 'Demo Admin', role: 'ADMIN', avatar: null, photo_url: null });
        return;
      }
      const res = await api.get('/profile');
      setUser(res.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to fetch user:', error);
      }
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        setUnreadCount(0);
        return;
      }
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to fetch unread count:', error);
      }
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        setNotifications([]);
        return;
      }
      const res = await api.get('/notifications');
      setNotifications(res.data.data || res.data); // Handle pagination or plain array
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to fetch notifications:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
    setIsProfileOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsOpen(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        const token = Cookies.get('admin_token');
        if (!(isDemo || !token)) {
          await api.post(`/notifications/${notification.id}/read`);
        }
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (error) {
        if (!isDemo) {
          console.error('Failed to mark as read:', error);
        }
      }
    }

    if (notification.url) {
      router.push(notification.url);
      setIsOpen(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        return;
      }
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to mark all as read:', error);
      }
    }
  };

  const handleLogout = async () => {
    // 1. Better Confirmation UX using SweetAlert2
    const result = await Swal.fire({
      title: 'Yakin ingin keluar?',
      text: "Sesi Anda akan berakhir.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e', // Rose-500
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
    
    const toastId = toast.loading('Sedang keluar...');

    try {
      await api.post('/logout');
      
      Cookies.remove('admin_token');
      Cookies.remove('admin_token', { path: '/' });
      localStorage.removeItem('token'); 

      toast.success('Berhasil logout', { id: toastId });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
      
      // Force logout
      Cookies.remove('admin_token');
      Cookies.remove('admin_token', { path: '/' });
      localStorage.removeItem('token'); 
      
      toast.error('Logout berhasil (paksa)', { id: toastId });
      router.push('/login');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'ACTION': return <CheckCircle size={16} className="text-emerald-500" />;
      default: return <Info size={16} className="text-teal-500" />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-20">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">
            {currentDate}
          </span>
          <DemoLabel />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
          Selamat datang kembali, <span className="text-emerald-600 dark:text-emerald-400">{user?.name || 'Admin'}</span>! 👋
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={toggleDropdown}
            className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md hover:-translate-y-0.5 transition-all group relative"
          >
            <Bell size={24} strokeWidth={2} className="group-hover:animate-swing" />
            {unreadCount > 0 && (
              <span className="absolute top-3 right-3.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
            )}
          </button>

          {/* Dropdown Notification */}
          {isOpen && (
            <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Check size={12} strokeWidth={3} /> Tandai dibaca
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                    <span className="text-xs font-medium">Memuat notifikasi...</span>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.slice(0, 5).map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer flex gap-4 ${!item.is_read ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : ''}`}
                      >
                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
                          item.type === 'WARNING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 
                          item.type === 'ACTION' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          {getIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm text-slate-900 dark:text-white mb-0.5 ${!item.is_read ? 'font-bold' : 'font-medium'}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-1.5 leading-relaxed">
                            {item.message}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase tracking-wide">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: idLocale })}
                          </span>
                        </div>
                        {!item.is_read && (
                          <div className="flex-shrink-0 self-center">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-emerald-100 dark:ring-emerald-900" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                        <Bell size={20} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <span className="text-sm font-medium">Belum ada notifikasi baru</span>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <Link 
                  href="/dashboard/notifikasi" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold inline-flex items-center gap-1 py-1 px-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                >
                  Lihat Semua Notifikasi <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileDropdownRef}>
          <button 
            className="flex items-center gap-3 cursor-pointer bg-white dark:bg-slate-900 p-1.5 pr-4 rounded-[2rem] border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 hover:-translate-y-0.5 transition-all group"
            onClick={toggleProfileDropdown}
          >
            <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-tr from-emerald-500 to-teal-400 relative ring-2 ring-white dark:ring-slate-800 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform flex items-center justify-center">
              {user?.avatar || user?.photo_url ? (
                 <img 
                   src={user?.avatar?.startsWith('http') ? user.avatar : `http://localhost:8000${user?.avatar || user?.photo_url}`} 
                   alt={user?.name || 'Profile'} 
                   className="w-full h-full object-cover"
                   onError={(e) => {
                      (e.target as any).src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=10b981&color=fff`;
                      (e.target as any).style.padding = '0';
                   }}
                 />
              ) : (
                <div className="text-white font-bold text-sm tracking-tight">
                  {user?.name?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-none group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{user?.name || 'Loading...'}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{formatRole(user?.role)}</p>
            </div>
            <ChevronDown size={16} className="text-slate-300 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ml-1" strokeWidth={3} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-60 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="p-2 space-y-1">
                <Link 
                  href="/dashboard/profile" 
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-2xl transition-all"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User size={18} strokeWidth={2} />
                  Profil Saya
                </Link>
                <Link 
                  href="/dashboard/pengaturan" 
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-2xl transition-all"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings size={18} strokeWidth={2} />
                  Pengaturan Akun
                </Link>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-300 rounded-2xl transition-all"
                >
                  <LogOut size={18} strokeWidth={2} />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
