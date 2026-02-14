'use client';

import React, { useEffect, useState } from 'react';
import { BillingService } from '@/services/billing-service';
import { Plan, BillingSummary } from '@/types/billing';
import { PlanSelectionCard } from '@/components/billing/PlanSelectionCard';
import { Loader2, ArrowLeft, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { useTenant } from '@/context/TenantContext';

export default function SubscribePage() {
  const router = useRouter();
  const { isDemo } = useTenant();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, summaryData] = await Promise.all([
          BillingService.getPlans(),
          BillingService.getSummary()
        ]);
        setPlans(plansData);
        setSummary(summaryData);
      } catch (err) {
        toast.error('Gagal memuat data paket');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat berlangganan paket');
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi Langganan',
      text: 'Apakah Anda yakin ingin memilih paket ini? Invoice akan diterbitkan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Pilih Paket',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl font-sans',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold'
      }
    });

    if (!result.isConfirmed) return;

    setProcessingId(planId);
    try {
      await BillingService.subscribe(planId);
      toast.success('Invoice berhasil dibuat!');
      router.push('/dashboard/invoices/current');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memilih paket');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  // Guard: RT under RW billing
  if (summary?.billing_mode === 'RW' && summary.tenant_status !== 'DEMO') { // Assuming logic: if I am RT and mode is RW, I can't pay. 
    // Wait, ADMIN_RW can subscribe for everyone. 
    // How do we know if user is ADMIN_RW?
    // We assume the API returns allowed actions or we check role. 
    // But the instructions say: "RT di bawah RW billing: Tampilkan pesan terkunci".
    // I will assume the summary.can_subscribe flag handles this logic from backend? 
    // Or I check `billing_mode`.
    // Let's implement the Lock UI if can_subscribe is false and billing_mode is RW.
    // Actually, `BillingSummary` doesn't strictly have `role`. 
    // But `can_subscribe` should be the source of truth.
    
    if (!summary.can_subscribe && summary.billing_mode === 'RW') {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Akses Penagihan Dibatasi
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Tagihan untuk akun ini dikelola secara terpusat oleh RW.
          </p>
          <Link 
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
          >
            <ArrowLeft size={16} /> Kembali ke Billing
          </Link>
        </div>
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <Link 
        href="/dashboard/billing"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-8 transition-colors"
      >
        <ArrowLeft size={18} /> Kembali
      </Link>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          Pilih Paket Langganan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Tingkatkan layanan RT/RW Anda dengan fitur lengkap dan dukungan prioritas.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {plans.map((plan) => (
          <PlanSelectionCard
            key={plan.id}
            plan={plan}
            onSelect={handleSubscribe}
            isLoading={processingId === plan.id}
            disabled={!!processingId} // Disable others when one is processing
            isPopular={plan.type === 'YEARLY'}
          />
        ))}
      </div>
    </div>
  );
}
