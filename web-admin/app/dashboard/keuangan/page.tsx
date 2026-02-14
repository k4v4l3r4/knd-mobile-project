"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Loader2, Filter, Download, Plus, FileText, RefreshCw
} from 'lucide-react';
import { DemoLabel } from "@/components/TenantStatusComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { useTenant } from "@/context/TenantContext";

export default function KeuanganPage() {
  const router = useRouter();
  const { isDemo, isTrial, isExpired } = useTenant();
  const [summary, setSummary] = useState({
    total_in: 0,
    total_out: 0,
    balance: 0,
    breakdown: {} as Record<string, number>
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'IN' | 'OUT' | 'TRANSFER'>('IN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    source_type: '',
    description: '',
    from_account_id: '',
    to_account_id: ''
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAccounts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const [feesRes, activitiesRes] = await Promise.all([
        api.get('/fees'),
        api.get('/settings/activities')
      ]);
      if (feesRes.data) setFees(feesRes.data.data || feesRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/rt/finance-accounts');
      if (response.data.success) {
        setAccounts(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, transactionsRes] = await Promise.all([
        api.get('/rt/kas/summary'),
        api.get('/rt/kas/transactions')
      ]);
      setSummary(summaryRes.data.data);
      setTransactions(transactionsRes.data.data.data);
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
      toast.error("Gagal memuat data keuangan");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (isDemo || isTrial || isExpired) {
        toast.error("Fitur Export Laporan tidak tersedia dalam mode Trial/Demo.");
        return;
    }

    setIsDownloading(true);
    const toastId = toast.loading("Sedang membuat laporan PDF...");
    
    try {
      const response = await api.get('/rt/kas/export/pdf', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `Laporan-Kas-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      
      toast.success("Laporan berhasil diunduh", { id: toastId });
    } catch (error) {
      console.error("Failed to download report:", error);
      toast.error("Gagal mengunduh laporan", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenModal = (type: 'IN' | 'OUT' | 'TRANSFER') => {
    if (isDemo) {
        toast.error("Mode Demo: Transaksi tidak dapat ditambahkan.");
        return;
    }
    if (isExpired) {
        toast.error("Masa Aktif Habis: Silakan perpanjang langganan untuk menambah transaksi.");
        return;
    }

    setModalType(type);
    setFormData({
      amount: '',
      source_type: '', // Force user to select from dropdown
      description: '',
      from_account_id: '',
      to_account_id: ''
    });
    setIsCustomCategory(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
        toast.error("Mode Demo: Transaksi tidak dapat disimpan.");
        return;
    }
    if (isExpired) {
        toast.error("Masa Aktif Habis: Silakan perpanjang langganan.");
        return;
    }

    setIsSubmitting(true);

    try {
      const amountVal = parseFloat(formData.amount);
      if (isNaN(amountVal) || amountVal <= 0) {
        toast.error("Nominal harus berupa angka dan lebih dari 0");
        setIsSubmitting(false);
        return;
      }

      // Validation for Source Type (Category)
      if (modalType !== 'TRANSFER' && !formData.source_type.trim()) {
        toast.error("Mohon pilih atau isi Kategori/Sumber transaksi");
        setIsSubmitting(false);
        return;
      }

      if (modalType === 'TRANSFER') {
        await api.post('/rt/kas/transfer', {
            amount: amountVal,
            from_account_id: formData.from_account_id,
            to_account_id: formData.to_account_id,
            description: formData.description
        });
        toast.success("Transfer berhasil!");
      } else {
        await api.post('/rt/kas/transactions', {
            amount: amountVal,
            direction: modalType,
            source_type: formData.source_type,
            description: formData.description
        });
        toast.success(`Berhasil menambahkan ${modalType === 'IN' ? 'pemasukan' : 'pengeluaran'}`);
      }
      
      setIsModalOpen(false);
      fetchData(); // Refresh data
      fetchAccounts(); // Refresh account balances
    } catch (error: any) {
      console.error("Failed to submit transaction:", error);
      if (error.response && error.response.status === 422) {
          const validationErrors = error.response.data.errors;
          // Format errors into a list
          const errorMessages = Object.values(validationErrors).flat().join('\n');
          toast.error(`Validasi Gagal:\n${errorMessages}`);
      } else if (error.response && error.response.data && error.response.data.message) {
          toast.error(`Gagal: ${error.response.data.message}`);
      } else {
          toast.error("Gagal menyimpan transaksi (Pastikan semua input valid)");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Keuangan RT
            <DemoLabel />
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Ringkasan kas dan laporan keuangan transparan
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button 
             variant="outline" 
             className="gap-2 text-slate-600 dark:text-slate-300"
             onClick={() => router.push('/dashboard/keuangan/laporan')}
           >
             <FileText size={16} />
             Lihat Laporan
           </Button>
           <Button 
             className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
             onClick={() => handleOpenModal('OUT')}
           >
             <ArrowDownRight size={16} />
             Pengeluaran
           </Button>
           <Button 
             className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
             onClick={() => handleOpenModal('IN')}
           >
             <Plus size={16} />
             Pemasukan
           </Button>
           <Button 
             className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
             onClick={() => handleOpenModal('TRANSFER')}
           >
             <RefreshCw size={16} />
             Transfer
           </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Saldo Akhir */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={64} className="text-emerald-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Saldo Akhir</p>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">
            {formatCurrency(summary.balance)}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 w-fit px-3 py-1 rounded-full text-xs font-medium">
            <TrendingUp size={14} />
            <span>Posisi Kas Saat Ini</span>
          </div>
        </div>

        {/* Pemasukan */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowUpRight size={64} className="text-blue-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Total Masuk</p>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">
            {formatCurrency(summary.total_in)}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 w-fit px-3 py-1 rounded-full text-xs font-medium">
            <ArrowUpRight size={14} />
            <span>Total Pemasukan</span>
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowDownRight size={64} className="text-rose-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Total Keluar</p>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">
            {formatCurrency(summary.total_out)}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 w-fit px-3 py-1 rounded-full text-xs font-medium">
            <ArrowDownRight size={14} />
            <span>Total Pengeluaran</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Transactions Table */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Riwayat Transaksi</h3>
            {/* <button className="text-sm text-emerald-600 font-medium hover:underline">Lihat Semua</button> */}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg font-semibold text-slate-700 dark:text-slate-200">Tanggal</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Sumber</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Keterangan</th>
                  <th className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 text-right">Masuk</th>
                  <th className="px-4 py-3 rounded-r-lg font-semibold text-rose-600 dark:text-rose-400 text-right">Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {transactions.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            Belum ada transaksi
                        </td>
                    </tr>
                ) : (
                    transactions.map((tx) => (
                      <tr key={`${tx.origin}-${tx.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {format(new Date(tx.created_at), "dd MMM yyyy", { locale: id })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap
                            ${tx.source_type === 'DENDA' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 
                              tx.source_type === 'IURAN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}>
                            {tx.source_type || 'UMUM'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {tx.description || '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {tx.direction === 'IN' ? formatCurrency(tx.amount) : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {tx.direction === 'OUT' ? formatCurrency(tx.amount) : '-'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Transaction Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'IN' ? 'Tambah Pemasukan' : (modalType === 'OUT' ? 'Tambah Pengeluaran' : 'Transfer Kas')}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'TRANSFER' 
                ? 'Pindahkan dana antar akun kas (Misal: Tunai ke Bank).' 
                : 'Catat transaksi kas manual (non-otomatis).'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            
            {modalType === 'TRANSFER' && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="from_account">Dari Akun</Label>
                        <Select 
                            value={formData.from_account_id} 
                            onValueChange={(val) => {
                                setFormData(prev => ({
                                    ...prev, 
                                    from_account_id: val,
                                    // Reset to_account if it matches the new from_account
                                    to_account_id: prev.to_account_id === val ? '' : prev.to_account_id
                                }));
                            }}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Akun Asal" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id.toString()}>
                                        {acc.name} ({formatCurrency(acc.balance)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="to_account">Ke Akun</Label>
                        <Select 
                            value={formData.to_account_id} 
                            onValueChange={(val) => setFormData({...formData, to_account_id: val})}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Akun Tujuan" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.filter(acc => acc.id.toString() !== formData.from_account_id).map(acc => (
                                    <SelectItem key={acc.id} value={acc.id.toString()}>
                                        {acc.name} ({formatCurrency(acc.balance)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Nominal (Rp)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Contoh: 500000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="1"
              />
            </div>

            {modalType !== 'TRANSFER' && (
                <div className="space-y-2">
                <Label htmlFor="source">Kategori / Sumber</Label>
                <div className="relative">
                  <select
                    id="source"
                    value={isCustomCategory ? 'Lainnya' : formData.source_type}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Lainnya') {
                        setIsCustomCategory(true);
                        setFormData({ ...formData, source_type: '' });
                      } else {
                        setIsCustomCategory(false);
                        setFormData({ ...formData, source_type: val });
                      }
                    }}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                    required={!isCustomCategory}
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    {modalType === 'IN' ? (
                      <>
                        <optgroup label="Iuran & Pemasukan">
                          {fees.map((fee: any) => (
                            <option key={fee.id} value={fee.name}>{fee.name}</option>
                          ))}
                        </optgroup>
                        <option value="Kas RT">Kas RT</option>
                        <option value="Sumbangan">Sumbangan</option>
                        <option value="Lainnya">Lainnya</option>
                      </>
                    ) : (
                      <>
                        <optgroup label="Kegiatan & Pengeluaran">
                          {activities.map((act: any) => (
                            <option key={act.id} value={act.name}>{act.name}</option>
                          ))}
                        </optgroup>
                        <option value="Operasional">Operasional</option>
                        <option value="Perbaikan">Perbaikan</option>
                        <option value="Lainnya">Lainnya</option>
                      </>
                    )}
                  </select>
                </div>
                {isCustomCategory && (
                  <Input
                    placeholder="Tulis kategori manual..."
                    className="mt-2"
                    value={formData.source_type}
                    onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                    required
                    autoFocus
                  />
                )}
                </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Keterangan Detail</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi lengkap transaksi..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                 Batal
               </Button>
               <Button 
                 type="submit" 
                 disabled={isSubmitting}
                 className={
                    modalType === 'IN' ? "bg-emerald-600 hover:bg-emerald-700" : 
                    (modalType === 'OUT' ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700")
                 }
               >
                 {isSubmitting ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Menyimpan...
                   </>
                 ) : (
                   'Simpan Transaksi'
                 )}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
