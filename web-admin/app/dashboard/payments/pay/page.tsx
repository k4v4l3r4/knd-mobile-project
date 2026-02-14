'use client';

import React, { useEffect, useState } from 'react';
import { BillingService } from '@/services/billing-service';
import { Invoice } from '@/types/billing';
import { Loader2, ArrowLeft, Wallet, Building2, Copy, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useTenant } from '@/context/TenantContext';

export default function PaymentPage() {
  const router = useRouter();
  const { isDemo } = useTenant();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingChannel, setProcessingChannel] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const data = await BillingService.getCurrentInvoice();
        setInvoice(data);
        if (data.status === 'PAID') {
          router.replace('/dashboard/invoices/current');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error('Tidak ada invoice aktif');
          router.push('/dashboard/billing');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [router]);

  const handlePay = async (channel: 'MANUAL' | 'FLIP') => {
    if (isDemo) {
      toast.error('Mode Demo: Pembayaran tidak tersedia');
      return;
    }
    if (!invoice) return;
    setProcessingChannel(channel);
    try {
      const result = await BillingService.pay(invoice.id, channel);
      // Update invoice locally with new instruction
      setInvoice({
        ...invoice,
        payment_channel: channel,
        payment_instruction: result.instruction,
        payment_mode: result.payment_mode as any
      });
      toast.success('Instruksi pembayaran dibuat');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setProcessingChannel(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin ke clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (!invoice) return null;

  // If we have instruction (either from initial load or after selection)
  if (invoice.payment_instruction) {
    const instruction = invoice.payment_instruction;
    const isFlip = invoice.payment_channel === 'FLIP';

    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <Link 
          href="/dashboard/invoices/current"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft size={18} /> Kembali ke Invoice
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-900 text-white p-6 text-center">
            <h2 className="text-lg font-bold mb-1">Selesaikan Pembayaran</h2>
            <p className="text-slate-400 text-sm">
              Transfer sesuai nominal tepat hingga 3 digit terakhir
            </p>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-sm text-slate-500 mb-2">Total Transfer</div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-3">
                Rp {instruction.amount.toLocaleString('id-ID')}
                <button 
                  onClick={() => copyToClipboard(instruction.amount.toString())}
                  className="text-slate-400 hover:text-emerald-500 transition-colors"
                >
                  <Copy size={20} />
                </button>
              </div>
              {instruction.payment_code && (
                <div className="text-xs text-amber-600 font-bold mt-2 bg-amber-50 inline-block px-3 py-1 rounded-full">
                  PENTING: Pastikan nominal transfer SAMA PERSIS (termasuk kode unik {instruction.payment_code})
                </div>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Building2 className="text-slate-700" size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{instruction.bank_name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Atas nama: {instruction.account_holder}</div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="font-mono text-xl font-bold text-slate-900 dark:text-white tracking-wider">
                  {instruction.account_number}
                </div>
                <button 
                  onClick={() => copyToClipboard(instruction.account_number)}
                  className="text-emerald-600 hover:text-emerald-700 font-bold text-sm"
                >
                  SALIN
                </button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 mb-6">
              <CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Konfirmasi:</strong> Layanan akan aktif otomatis setelah pembayaran dikonfirmasi oleh admin. Simpan bukti transfer Anda.
              </div>
            </div>

            <Link
              href="/dashboard/invoices/current"
              className="block w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl font-bold text-center transition-colors"
            >
              Saya Sudah Transfer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Selection Screen
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link 
        href="/dashboard/invoices/current"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-8 transition-colors"
      >
        <ArrowLeft size={18} /> Kembali
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Metode Pembayaran</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Pilih cara pembayaran yang Anda inginkan</p>

      <div className="grid gap-4">
        <button
          onClick={() => handlePay('MANUAL')}
          disabled={!!processingChannel}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-left flex items-center gap-4 group"
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Building2 size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Transfer Bank Manual</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Transfer ke rekening resmi RT/RW (BCA/Mandiri/BRI)</p>
          </div>
          {processingChannel === 'MANUAL' && <Loader2 className="animate-spin text-emerald-600" />}
        </button>

        <button
          onClick={() => handlePay('FLIP')}
          disabled={!!processingChannel}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 transition-all text-left flex items-center gap-4 group"
        >
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
            <Wallet size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Flip / E-Wallet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bebas biaya admin antar bank</p>
          </div>
          {processingChannel === 'FLIP' && <Loader2 className="animate-spin text-orange-600" />}
        </button>
      </div>
    </div>
  );
}
