"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Loader2, Filter, Download, Plus, FileText, RefreshCw, Trash2, Edit
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
import Cookies from "js-cookie";

export default function KeuanganPage() {
  const router = useRouter();
  const { isDemo, isTrial, isExpired, status } = useTenant();
  const [summary, setSummary] = useState({
    total_in: 0,
    total_out: 0,
    balance: 0,
    breakdown: {} as Record<string, number>
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
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
    account_id: '',
    from_account_id: '',
    to_account_id: ''
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
      amount: '',
      description: '',
      category: '',
      payment_method: '',
      account_id: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditClick = (trx: any) => {
      if (isDemo) {
          toast.error("Mode Demo: Tidak dapat mengedit transaksi.");
          return;
      }
      if (isExpired) return;
      setTransactionToEdit(trx);
      setEditFormData({
          amount: trx.amount.toString(),
          description: trx.description || '',
          category: trx.source_type || '', // source_type is category in current API
          payment_method: trx.payment_method || '',
          account_id: trx.account_id ? trx.account_id.toString() : ''
      });
      setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!transactionToEdit) return;
      setIsUpdating(true);
      try {
          const amountVal = parseFloat(editFormData.amount);
          if (isNaN(amountVal) || amountVal <= 0) {
              toast.error("Nominal harus berupa angka dan lebih dari 0");
              setIsUpdating(false);
              return;
          }

          await api.put(`/transactions/${transactionToEdit.id}`, {
              amount: amountVal,
              description: editFormData.description,
              category: editFormData.category, // Assuming source_type is mapped to category in controller
              payment_method: editFormData.payment_method,
              account_id: editFormData.account_id,
              type: transactionToEdit.direction || transactionToEdit.type, // Need to send type back
              date: transactionToEdit.created_at || transactionToEdit.date // Send original date or allow edit date?
          });
          
          toast.success("Transaksi berhasil diperbarui");
          setIsEditModalOpen(false);
          fetchData();
          fetchAccounts();
      } catch (error: any) {
          console.error("Failed to update transaction:", error);
          if (error.response?.data?.errors) {
              const errorMessages = Object.values(error.response.data.errors).flat().join('\n');
              toast.error(`Gagal: ${errorMessages}`);
          } else {
              toast.error(error.response?.data?.message || "Gagal memperbarui transaksi");
          }
      } finally {
          setIsUpdating(false);
          setTransactionToEdit(null);
      }
  };

  const handleDeleteClick = (trx: any) => {
    if (isDemo) {
        toast.error("Mode Demo: Tidak dapat menghapus transaksi.");
        return;
    }
    if (isExpired) return;
    setTransactionToDelete(trx);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/transactions/${transactionToDelete.id}`);
      toast.success("Transaksi berhasil dihapus");
      setIsDeleteModalOpen(false);
      fetchData();
      fetchAccounts();
    } catch (error: any) {
      console.error("Failed to delete transaction:", error);
      toast.error(error.response?.data?.message || "Gagal menghapus transaksi");
    } finally {
      setIsDeleting(false);
      setTransactionToDelete(null);
    }
  };

  useEffect(() => {
    if (!status) return;
    fetchData();
    fetchAccounts();
    fetchCategories();
  }, [status]);

  const fetchCategories = async () => {
    try {
      const token = Cookies.get("admin_token");
      if (isDemo || !token) {
        const demoFees = [
          { id: 1, name: "Iuran Rutin Bulanan" },
          { id: 2, name: "Iuran Kebersihan" },
          { id: 3, name: "Iuran Keamanan" }
        ];
        const demoActivities = [
          { id: 1, name: "Kegiatan 17 Agustus" },
          { id: 2, name: "Rapat Rutin RT" },
          { id: 3, name: "Perbaikan Fasilitas Umum" }
        ];
        setFees(demoFees);
        setActivities(demoActivities);
        return;
      }
      const [feesRes, activitiesRes] = await Promise.all([
        api.get("/fees"),
        api.get("/settings/activities")
      ]);
      if (feesRes.data) setFees(feesRes.data.data || feesRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
    } catch (error) {
      if (!isDemo) {
        console.error("Failed to fetch categories:", error);
      }
    }
  };

  const fetchAccounts = async () => {
    try {
      const token = Cookies.get("admin_token");
      if (isDemo || !token) {
        const demoAccounts = [
          { id: 1, name: "Kas Tunai", balance: 1500000 },
          { id: 2, name: "Rekening Bank RT", balance: 3500000 }
        ];
        setAccounts(demoAccounts);
        return;
      }
      const response = await api.get("/rt/finance-accounts");
      if (response.data.success) {
        setAccounts(response.data.data);
      }
    } catch (error) {
      if (!isDemo) {
        console.error("Failed to fetch accounts:", error);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("admin_token");
      if (isDemo || !token) {
        const demoSummary = {
          total_in: 7500000,
          total_out: 2500000,
          balance: 5000000,
          breakdown: {
            'Iuran Warga': 5000000,
            Sampah: 500000,
            'Pemasukan Lainnya': 2000000
          }
        };
        const now = new Date();
        const demoTransactions = [
          {
            id: 1,
            origin: "demo",
            created_at: now.toISOString(),
            source_type: "Iuran Warga",
            description: "Iuran rutin bulan ini",
            direction: "IN",
            amount: 3000000
          },
          {
            id: 2,
            origin: "demo",
            created_at: now.toISOString(),
            source_type: "Sampah",
            description: "Iuran sampah bulan ini",
            direction: "IN",
            amount: 500000
          },
          {
            id: 3,
            origin: "demo",
            created_at: now.toISOString(),
            source_type: "OPERASIONAL",
            description: "Pembelian peralatan kebersihan",
            direction: "OUT",
            amount: 750000
          },
          {
            id: 4,
            origin: "demo",
            created_at: now.toISOString(),
            source_type: "KEGIATAN",
            description: "Konsumsi rapat warga",
            direction: "OUT",
            amount: 1250000
          }
        ];
        setSummary(demoSummary);
        setTransactions(demoTransactions);
        return;
      }
      const [summaryRes, transactionsRes, pendingRes] = await Promise.all([
        api.get("/rt/kas/summary"),
        api.get("/rt/kas/transactions"),
        api.get("/rt/kas/pending")
      ]);
      setSummary(summaryRes.data.data);
      setTransactions(transactionsRes.data.data.data);
      setPendingTransactions(pendingRes.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error("Failed to fetch finance data:", error);
        toast.error("Gagal memuat data keuangan");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (isDemo || isExpired) return;
    
    if (!confirm("Apakah Anda yakin ingin memverifikasi transaksi ini? Saldo akan bertambah.")) return;

    try {
      await api.post(`/transactions/${id}/verify`);
      toast.success("Transaksi berhasil diverifikasi");
      fetchData(); // Reload data
    } catch (error) {
      console.error("Failed to verify transaction:", error);
      toast.error("Gagal memverifikasi transaksi");
    }
  };

  const handleDownloadReport = async () => {
    if (isDemo || isExpired) {
        toast.error("Fitur Export Laporan tidak tersedia dalam mode Demo atau saat langganan berakhir.");
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
      account_id: accounts[0]?.id ? accounts[0].id.toString() : '',
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

      // Validation for Category
      if (modalType !== 'TRANSFER' && !formData.source_type.trim()) {
        toast.error("Mohon pilih atau isi Kategori transaksi");
        setIsSubmitting(false);
        return;
      }
      if (modalType !== 'TRANSFER' && !formData.account_id) {
        toast.error("Mohon pilih Akun kas (Kas & Bank)");
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
            description: formData.description,
            account_id: formData.account_id
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

  const formatPaymentMethod = (method?: string) => {
    if (!method) return 'Tidak Diketahui';
    const m = method.toUpperCase();
    if (m === 'CASH') return 'Tunai';
    if (m === 'TRANSFER') return 'Transfer';
    if (m === 'QRIS') return 'QRIS';
    if (m === 'OTHER') return 'Lainnya';
    return method;
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
        {/* Pending Transactions Section */}
        {pendingTransactions.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-xl border border-orange-200 dark:border-orange-900 mb-8">
            <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-400 mb-4 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Transaksi Perlu Verifikasi
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-orange-700 dark:text-orange-300 border-b border-orange-200 dark:border-orange-800">
                    <th className="pb-3 pl-4">Tanggal</th>
                    <th className="pb-3">Warga</th>
                    <th className="pb-3">Keterangan</th>
                    <th className="pb-3">Nominal</th>
                    <th className="pb-3">Bukti</th>
                    <th className="pb-3 pr-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-200 dark:divide-orange-800">
                  {pendingTransactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-colors">
                      <td className="py-4 pl-4 text-sm text-slate-600 dark:text-slate-300">
                        {format(new Date(trx.created_at || trx.date), 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {trx.user?.name || 'Warga'}
                        <div className="text-xs text-slate-500 font-normal">Blok {trx.user?.block || '-'}</div>
                      </td>
                      <td className="py-4 text-sm text-slate-600 dark:text-slate-300">
                        {trx.description}
                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">{trx.category}</div>
                      </td>
                      <td className="py-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(trx.amount)}
                      </td>
                      <td className="py-4 text-sm">
                         {trx.proof_url ? (
                           <a 
                             href={`${process.env.NEXT_PUBLIC_API_URL}/storage/${trx.proof_url}`} 
                             target="_blank" 
                             rel="noreferrer"
                             className="text-blue-600 hover:underline text-xs"
                           >
                             Lihat Foto
                           </a>
                         ) : (
                           <span className="text-slate-400 text-xs">-</span>
                         )}
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <Button 
                          size="sm" 
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => handleApprove(trx.id)}
                        >
                          Approve / Terima
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Riwayat Transaksi</h3>
            {/* <button className="text-sm text-emerald-600 font-medium hover:underline">Lihat Semua</button> */}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg font-semibold text-slate-700 dark:text-slate-200">Tanggal</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Nama & Blok</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Daftar Iuran</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Metode</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-right">Nominal</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Keterangan</th>
                  <th className="px-4 py-3 rounded-r-lg font-semibold text-slate-700 dark:text-slate-200 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {transactions.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                            Belum ada transaksi
                        </td>
                    </tr>
                ) : (
                    transactions.map((tx) => (
                      <tr key={`${tx.origin}-${tx.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                          {format(new Date(tx.created_at || tx.date), "dd MMM yyyy", { locale: id })}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 align-top">
                          {tx.user ? (
                              <div>
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{tx.user.name}</div>
                                  <div className="text-xs text-slate-500">
                                    Blok {tx.user.block || '-'}
                                  </div>
                              </div>
                          ) : (
                              <span className="text-slate-400 italic">Non-Warga</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 align-top">
                           {tx.items && tx.items.length > 0 ? (
                               <div className="flex flex-col gap-1">
                                   {tx.items.map((item: any, idx: number) => (
                                       <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                           {item.name}
                                       </span>
                                   ))}
                               </div>
                           ) : (
                               <span className="text-sm">{tx.source_type || tx.category || '-'}</span>
                           )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 align-top">
                            {formatPaymentMethod(tx.payment_method)}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap
                                ${tx.direction === 'IN' || tx.type === 'IN' 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                }`}>
                                {tx.direction === 'IN' || tx.type === 'IN' ? 'MASUK' : 'KELUAR'}
                            </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-right whitespace-nowrap align-top">
                             <span className={tx.direction === 'IN' || tx.type === 'IN' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                {formatCurrency(tx.amount)}
                             </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate align-top">
                          {tx.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleEditClick(tx)}
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Transaksi"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(tx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                title="Hapus Transaksi"
                              >
                                <Trash2 size={16} />
                              </button>
                          </div>
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
              <>
                <div className="space-y-2">
                  <Label htmlFor="account">Akun Kas</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(val) => setFormData({ ...formData, account_id: val })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Akun (Kas & Bank)" />
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
                  <Label htmlFor="source">Kategori</Label>
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
                          <optgroup label="Kegiatan RT">
                            {activities.map((act: any) => (
                              <option key={act.id} value={act.name}>{act.name}</option>
                            ))}
                          </optgroup>
                        </>
                      ) : (
                        <optgroup label="Kegiatan & Pengeluaran">
                          {activities.map((act: any) => (
                            <option key={act.id} value={act.name}>{act.name}</option>
                          ))}
                        </optgroup>
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
              </>
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

      {/* Edit Transaction Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
            <DialogDescription>
              Ubah detail transaksi yang sudah ada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Nominal (Rp)</Label>
              <Input
                id="edit-amount"
                type="number"
                placeholder="Contoh: 500000"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                required
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori / Iuran</Label>
              <div className="relative">
                <Input
                  id="edit-category"
                  placeholder="Kategori Transaksi"
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-payment-method">Metode Pembayaran</Label>
                <Select
                    value={editFormData.payment_method}
                    onValueChange={(val) => setEditFormData({ ...editFormData, payment_method: val })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Metode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CASH">Tunai / Cash</SelectItem>
                        <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
                        <SelectItem value="QRIS">QRIS / E-Wallet</SelectItem>
                        <SelectItem value="OTHER">Lainnya</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-account">Akun Kas</Label>
              <Select
                value={editFormData.account_id}
                onValueChange={(val) => setEditFormData({ ...editFormData, account_id: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Akun" />
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
              <Label htmlFor="edit-description">Keterangan Detail</Label>
              <Textarea
                id="edit-description"
                placeholder="Deskripsi lengkap transaksi..."
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                required
              />
            </div>
            
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                 Batal
               </Button>
               <Button 
                 type="submit" 
                 disabled={isUpdating}
                 className="bg-blue-600 hover:bg-blue-700"
               >
                 {isUpdating ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Menyimpan...
                   </>
                 ) : (
                   'Simpan Perubahan'
                 )}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 size={20} />
              Hapus Transaksi
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus transaksi ini? 
              <br />
              <span className="font-medium text-slate-700 dark:text-slate-300 mt-2 block">
                &quot;{transactionToDelete?.description}&quot; ({transactionToDelete?.amount ? formatCurrency(transactionToDelete.amount) : 'Rp 0'})
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Tindakan ini akan membatalkan perubahan saldo.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Ya, Hapus'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
