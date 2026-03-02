'use client';

import React from 'react';
import { BillingSummary } from '@/types/billing';
import { 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ShieldCheck,
  Building2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'react-hot-toast';

interface BillingSummaryCardProps {
  summary: BillingSummary;
}

export const BillingSummaryCard: React.FC<BillingSummaryCardProps> = ({ summary }) => {
  const { tenant_status, billing_mode, subscription, pending_invoice, can_subscribe, message } = summary;
  const { isDemo } = useTenant();

  const isTrial = tenant_status === 'TRIAL';
  const isActive = tenant_status === 'ACTIVE';
  const isExpired = tenant_status === 'EXPIRED';
  const isLifetime = tenant_status === 'ACTIVE' && subscription?.type === 'LIFETIME';

  const getStatusBadge = () => {
    switch (tenant_status) {
      case 'TRIAL':
        return (
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Clock size={14} /> TRIAL
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <CheckCircle2 size={14} /> ACTIVE
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <AlertCircle size={14} /> EXPIRED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-slate-800/50 rounded-full -translate-y-1/2 translate-x-1/3 -z-0 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Status Langganan
            </h2>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
              <Building2 size={16} />
              <span>Ditagihkan ke: <span className="font-semibold text-slate-700 dark:text-slate-300">{billing_mode === 'RW' ? 'RW (Pusat)' : 'RT (Mandiri)'}</span></span>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-6">
          {subscription ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Paket Saat Ini</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {subscription.plan_name}
                    {subscription.type === 'LIFETIME' && (
                      <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-xs font-bold border border-indigo-200">
                        LIFETIME
                      </span>
                    )}
                  </div>
                </div>
                {subscription.type !== 'LIFETIME' && subscription.remaining_days !== null && (
                  <div className="text-right">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Sisa Hari</div>
                    <div className={`text-2xl font-bold ${subscription.remaining_days <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {subscription.remaining_days} Hari
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Tanggal Mulai
                  </div>
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {format(new Date(subscription.start_date), 'dd MMMM yyyy', { locale: id })}
                  </div>
                </div>
                {subscription.end_date && (
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Calendar size={12} /> Berakhir Pada
                    </div>
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      {format(new Date(subscription.end_date), 'dd MMMM yyyy', { locale: id })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-slate-500 dark:text-slate-400 mb-2">Belum ada paket langganan aktif</div>
              {billing_mode === 'RW' && (
                 <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg inline-block">
                   Tagihan dikelola oleh RW
                 </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {pending_invoice && (
            isDemo ? (
              <button
                onClick={() => toast.error('Mode Demo: Pembayaran tidak tersedia')}
                className="flex-1 bg-amber-500/50 cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-bold text-center flex items-center justify-center gap-2"
              >
                <CreditCard size={18} />
                Bayar Tagihan
              </button>
            ) : (
              <Link 
                href="/dashboard/invoices/current"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold transition-colors text-center flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <CreditCard size={18} />
                Bayar Tagihan
              </Link>
            )
          )}

          {can_subscribe && (
            isDemo ? (
              <button
                onClick={() => toast.error('Mode Demo: Langganan tidak tersedia')}
                className="flex-1 bg-emerald-600/50 cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-bold text-center flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} />
                {subscription ? 'Perpanjang Paket' : 'Aktifkan Langganan'}
              </button>
            ) : (
              <Link 
                href="/dashboard/billing/subscribe"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <ShieldCheck size={18} />
                {subscription ? 'Perpanjang Paket' : 'Aktifkan Langganan'}
              </Link>
            )
          )}

          {isActive && !pending_invoice && (
            <Link 
              href="/dashboard/invoices/current"
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold transition-colors text-center flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              Lihat Invoice
            </Link>
          )}
          
          {billing_mode === 'RW' && !can_subscribe && (
            <button 
              disabled
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-4 py-3 rounded-xl text-center text-sm flex items-center justify-center gap-2 cursor-not-allowed group relative border border-slate-200 dark:border-slate-700"
            >
              <LockIcon />
              <span>Langganan Terkunci (RW)</span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                {message || "Billing dikelola oleh RW. Anda tidak perlu membayar."}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);
