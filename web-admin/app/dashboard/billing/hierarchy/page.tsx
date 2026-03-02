'use client';

import React, { useEffect, useState } from 'react';
import { BillingService } from '@/services/billing-service';
import { HierarchyResponse } from '@/types/billing';
import { Loader2, ArrowLeft, Building2, Crown, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function BillingHierarchyPage() {
  const [data, setData] = useState<HierarchyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await BillingService.getHierarchy();
        setData(response);
      } catch (err: any) {
        toast.error('Gagal memuat data hirarki');
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

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link 
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft size={18} /> Kembali
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Hirarki Billing RW
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Status penagihan untuk semua RT di lingkungan {data.rw_name}
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 mb-8 border border-blue-100 dark:border-blue-800">
        <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Info Penting:</strong> RT dengan paket Lifetime akan tetap aktif meskipun status RW sedang tidak aktif atau belum membayar.
        </div>
      </div>

      <div className="grid gap-4">
        {data.rts.map((rt) => (
          <div 
            key={rt.id} 
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                {rt.name.replace('RT ', '')}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{rt.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Status: <span className={`font-bold ${
                    rt.status === 'ACTIVE' ? 'text-emerald-600' : 
                    rt.status === 'TRIAL' ? 'text-amber-600' : 'text-rose-600'
                  }`}>{rt.status}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              {rt.billing_source === 'LIFETIME' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold">
                  <Crown size={12} /> LIFETIME
                </div>
              ) : rt.billing_source === 'RW_FUNDED' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                  <Building2 size={12} /> DITANGGUNG RW
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded-full text-xs font-bold">
                  <User size={12} /> MANDIRI
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
