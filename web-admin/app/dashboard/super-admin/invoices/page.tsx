'use client';

import { useState, useEffect } from 'react';
import { SuperAdminService } from '@/services/super-admin-service';
import { Invoice } from '@/types/billing';
import { Search, FileText, Download, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    payment_channel: '',
    start_date: '',
    end_date: ''
  });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    fetchInvoices();
  }, [filters.status, filters.payment_channel, filters.start_date, filters.end_date, page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await SuperAdminService.getInvoices({ ...filters, page });
      setInvoices(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Gagal memuat data invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on search
    fetchInvoices();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleDownload = async (id: number) => {
    try {
      const blob = await SuperAdminService.downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Gagal download invoice');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Invoices Explorer</h1>
          <p className="text-slate-500 dark:text-slate-400">Riwayat semua transaksi pembayaran di platform</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="No. Invoice / Tenant..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-64"
            />
          </div>
          <select 
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
          >
            <option value="">Semua Status</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="DRAFT">Draft</option>
          </select>
          <select 
            value={filters.payment_channel}
            onChange={(e) => setFilters({...filters, payment_channel: e.target.value})}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
          >
            <option value="">Semua Channel</option>
            <option value="FLIP">Flip</option>
            <option value="MANUAL">Manual</option>
          </select>
          
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({...filters, start_date: e.target.value})}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({...filters, end_date: e.target.value})}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Invoice No</th>
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Tidak ada data ditemukan</td></tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {invoice.tenant?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 capitalize">
                      {invoice.invoice_type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {invoice.payment_channel || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        invoice.status === 'PENDING' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDownload(invoice.id)}
                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Download Invoice"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {meta && (
          <PaginationControls
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            onPageChange={handlePageChange}
            isLoading={loading}
          />
        )}
      </div>
    </div>
  );
}
