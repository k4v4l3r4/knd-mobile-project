'use client';

import React, { useEffect, useState } from 'react';
import { BillingService } from '@/services/billing-service';
import { Invoice } from '@/types/billing';
import { Loader2, CheckCircle2, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function AdminPaymentsPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Fetching UNPAID and PAYMENT_RECEIVED for confirmation
      // We assume the API supports filter or returns all
      const response = await BillingService.getAllInvoices({ 
        status: ['UNPAID', 'PAYMENT_RECEIVED'],
        include: 'tenant' // standard Laravel pattern
      });
      setInvoices(response.data || response); // Handle pagination or array
    } catch (err) {
      toast.error('Gagal memuat daftar pembayaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleConfirm = async (invoiceId: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Pembayaran?',
      text: 'Layanan tenant akan otomatis diaktifkan setelah konfirmasi ini.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Konfirmasi',
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
    
    setProcessingId(invoiceId);
    try {
      await BillingService.confirmPayment(invoiceId);
      toast.success('Pembayaran dikonfirmasi & Layanan Diaktifkan');
      fetchInvoices(); // Refresh list
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal konfirmasi pembayaran');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Konfirmasi Pembayaran
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Verifikasi manual pembayaran dari tenant
          </p>
        </div>
        <button 
          onClick={fetchInvoices}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 p-2 rounded-lg transition-colors"
        >
          <Search size={20} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-6 font-bold text-slate-700 dark:text-slate-300">Invoice</th>
                <th className="p-6 font-bold text-slate-700 dark:text-slate-300">Tenant</th>
                <th className="p-6 font-bold text-slate-700 dark:text-slate-300">Nominal</th>
                <th className="p-6 font-bold text-slate-700 dark:text-slate-300">Metode</th>
                <th className="p-6 font-bold text-slate-700 dark:text-slate-300">Status</th>
                <th className="p-6 font-bold text-slate-700 dark:text-slate-300 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-emerald-600" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Tidak ada pembayaran yang perlu dikonfirmasi
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-6 font-mono font-medium text-slate-900 dark:text-white">
                      #{invoice.invoice_number}
                      <div className="text-xs text-slate-400 mt-1">
                        {format(new Date(invoice.created_at), 'dd MMM yyyy')}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="font-bold text-slate-900 dark:text-white">{invoice.tenant?.name || '-'}</div>
                      <div className="text-xs text-slate-500">RT {invoice.tenant?.rt_rw || '-'}</div>
                    </td>
                    <td className="p-6 font-bold text-slate-900 dark:text-white">
                      Rp {invoice.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="p-6">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        invoice.payment_channel === 'FLIP' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {invoice.payment_channel || 'MANUAL'}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        invoice.status === 'PAYMENT_RECEIVED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {invoice.status === 'PAYMENT_RECEIVED' ? 'DITERIMA' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <button
                        onClick={() => handleConfirm(invoice.id)}
                        disabled={!!processingId}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === invoice.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Konfirmasi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
