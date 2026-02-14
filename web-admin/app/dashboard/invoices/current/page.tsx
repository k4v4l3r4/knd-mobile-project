'use client';

import React, { useEffect, useState } from 'react';
import { BillingService } from '@/services/billing-service';
import { Invoice } from '@/types/billing';
import { Loader2, Download, CreditCard, ArrowLeft, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function CurrentInvoicePage() {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const data = await BillingService.getCurrentInvoice();
        setInvoice(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error('Tidak ada invoice aktif');
          router.push('/dashboard/billing');
        } else {
          toast.error('Gagal memuat invoice');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [router]);

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const blob = await BillingService.downloadInvoice(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Gagal mengunduh PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (!invoice) return null;

  const isUnpaid = invoice.status === 'UNPAID';
  const isPaid = invoice.status === 'PAID';
  const isPaymentReceived = invoice.status === 'PAYMENT_RECEIVED';
  const isFailed = invoice.status === 'FAILED';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={18} /> Kembali
        </Link>
        
        {/* Status Badge */}
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2
          ${isPaid ? 'bg-emerald-100 text-emerald-700' : 
            isPaymentReceived ? 'bg-blue-100 text-blue-700' :
            isFailed ? 'bg-rose-100 text-rose-700' :
            'bg-amber-100 text-amber-700'}`}>
          {isPaid ? <CheckCircle2 size={16} /> : 
           isPaymentReceived ? <Clock size={16} /> :
           isFailed ? <AlertTriangle size={16} /> :
           <AlertTriangle size={16} />}
          {invoice.status.replace('_', ' ')}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Nomor Invoice</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
              #{invoice.invoice_number}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Tagihan</div>
            <div className="text-3xl font-bold text-emerald-600">
              Rp {invoice.total_amount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tanggal Tagihan</div>
              <div className="font-medium text-slate-900 dark:text-white">
                {format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: id })}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Jatuh Tempo</div>
              <div className="font-medium text-slate-900 dark:text-white">
                {format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: id })}
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          {(isUnpaid || isFailed) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <div className="font-bold text-amber-800 dark:text-amber-500 mb-1">Menunggu Pembayaran</div>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Silakan selesaikan pembayaran agar layanan tetap aktif.
                </p>
              </div>
            </div>
          )}

          {isPaymentReceived && (
             <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8 flex items-start gap-3">
              <Clock className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div>
                <div className="font-bold text-blue-800 dark:text-blue-500 mb-1">Pembayaran Diterima</div>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Pembayaran sedang diverifikasi oleh admin. Layanan akan aktif setelah konfirmasi.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {downloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              Unduh PDF
            </button>

            {isUnpaid && (
              <Link
                href="/dashboard/payments/pay"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CreditCard size={18} />
                Bayar Sekarang
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
