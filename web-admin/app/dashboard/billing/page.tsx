'use client';

import React, { useEffect, useState } from 'react';
import { BillingService } from '@/services/billing-service';
import { BillingSummary } from '@/types/billing';
import { BillingSummaryCard } from '@/components/billing/BillingSummaryCard';
import { Loader2, ShieldCheck, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import axios from '@/lib/axios';

export default function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRW, setIsRW] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, profileRes] = await Promise.all([
          BillingService.getSummary(),
          axios.get('/me').catch(() => ({ data: { data: { role: '' } } }))
        ]);
        
        setSummary(summaryData);
        
        const role = profileRes.data?.data?.role || '';
        setIsAdmin(role === 'ADMIN_RW' || role === 'ADMIN_RT' || role === 'SUPER_ADMIN');
        setIsRW(role === 'ADMIN_RW' || role === 'SUPER_ADMIN');
        
      } catch (err: any) {
        console.error('Failed to fetch billing data:', err);
        setError('Gagal memuat data billing.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-rose-500 mb-2 font-bold">Terjadi Kesalahan</div>
        <div className="text-slate-500">{error}</div>
      </div>
    );
  }

  if (!summary) return null;

  // REMOVED BLOCK: Allow viewing Billing in Read-Only mode for DEMO
  // if (summary.tenant_status === 'DEMO') {
  //   return (
  //     <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
  //        ...
  //     </div>
  //   );
  // }

  return (
    <div className="w-full py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Billing & Langganan
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Kelola status langganan dan pembayaran layanan RT Online
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <BillingSummaryCard summary={summary} />
          
          {/* Admin Menu Section */}
          {isAdmin && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Menu Admin Billing
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link 
                  href="/dashboard/admin/payments"
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                        Konfirmasi Pembayaran
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Verifikasi pembayaran manual
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </Link>

                {isRW && (
                  <Link 
                    href="/dashboard/billing/hierarchy"
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-lg">
                        <Users size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          Hirarki Billing RW
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Kelola status billing RT
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Info Section */}
        <div className="space-y-4">
          <InfoCard 
            title="Siklus Tagihan" 
            value={summary.subscription?.type === 'YEARLY' ? 'Tahunan' : 'Bulanan'}
            desc="Tagihan dibuat otomatis"
          />
          <InfoCard 
            title="Metode Pembayaran" 
            value="Transfer & Flip"
            desc="Verifikasi otomatis & manual"
          />
          <InfoCard 
            title="Status Akun" 
            value={summary.tenant_status}
            desc={summary.tenant_status === 'ACTIVE' ? 'Layanan berjalan normal' : 'Perlu perhatian'}
            highlight={summary.tenant_status !== 'ACTIVE'}
          />
        </div>
      </div>
    </div>
  );
}

const InfoCard = ({ title, value, desc, highlight = false }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
    <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">{title}</div>
    <div className={`text-lg font-bold mb-1 ${highlight ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
      {value}
    </div>
    <div className="text-xs text-slate-400 dark:text-slate-500">{desc}</div>
  </div>
);
