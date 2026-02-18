'use client';

import React from 'react';
import { useTenant } from '@/context/TenantContext';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export const TrialBanner = () => {
  const { isTrial, daysRemaining, isExpired, status } = useTenant();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (!status?.trial_end_at || !isTrial || isExpired) {
      setTimeLeft(null);
      return;
    }

    const updateTime = () => {
      const end = new Date(status.trial_end_at as string).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (v: number) => v.toString().padStart(2, '0');
      const dayPart = days > 0 ? `${days} hari ` : '';

      setTimeLeft(`${dayPart}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, [status?.trial_end_at, isTrial, isExpired]);
  
  if (!isTrial || isExpired) return null;

  const isCritical = daysRemaining <= 2;
  const bgColor = isCritical ? 'bg-rose-500' : 'bg-emerald-600';

  const handleUpgradeClick = () => {
    router.push('/dashboard/billing/subscribe');
  };

  return (
    <div className={`${bgColor} text-white px-4 py-3 shadow-md relative z-50 print:hidden`}>
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">
              {isCritical
                ? 'Trial hampir berakhir. Segera lakukan pembayaran agar layanan tidak terhenti.'
                : 'Anda sedang menggunakan Mode Trial. Segera lakukan pembayaran sebelum masa trial berakhir.'}
            </span>
            {timeLeft && (
              <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest bg-black/10 px-3 py-0.5 rounded-full">
                <span className="uppercase text-[10px] font-semibold opacity-80">Sisa waktu</span>
                <span className="text-sm font-semibold">{timeLeft}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpgradeClick}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
          >
            Upgrade Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExpiredOverlay = () => {
  const { isExpired } = useTenant();
  const router = useRouter();

  if (!isExpired) return null;

  const handleLogout = () => {
    Cookies.remove('admin_token');
    Cookies.remove('admin_token', { path: '/' });
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600 dark:text-rose-500">
          <Lock size={40} />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Masa Berlaku Habis
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Masa trial atau berlangganan Anda telah berakhir. Silakan lakukan pembayaran untuk mengaktifkan kembali layanan RT Online.
        </p>

        <div className="space-y-3">
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20">
            Bayar Sekarang
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-xl transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export const DemoLabel = () => {
  const { isDemo } = useTenant();
  
  if (!isDemo) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-500">
      <ShieldAlert size={12} />
      <span className="text-[10px] font-extrabold uppercase tracking-wider">Mode Demo</span>
    </div>
  );
};
