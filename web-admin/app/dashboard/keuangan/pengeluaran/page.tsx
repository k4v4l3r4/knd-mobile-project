'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Wallet, 
  Tag, 
  FileText,
  AlertCircle,
  X,
  TrendingDown,
  ArrowLeft,
  Loader2,
  Receipt,
  Download
} from 'lucide-react';
import { useTenant } from "@/context/TenantContext";
import { DemoLabel } from "@/components/TenantStatusComponents";
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface Wallet {
  id: number;
  name: string;
  balance: number;
  type: string;
}

interface Activity {
  id: number;
  name: string;
}

interface TransactionItem {
  name: string;
  amount: number;
}

interface ExpenseTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  wallet?: Wallet;
  items?: TransactionItem[]; // If returned from API
}

export default function ExpensePage() {
  const router = useRouter();
  const { isDemo, isExpired } = useTenant();
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    category: '', // Activity name
    description: '',
    items: [{ name: '', amount: 0 }] as TransactionItem[]
  });

  const fetchInitialData = async () => {
    try {
      const [resTrans, resWallets, resActivities] = await Promise.all([
        axios.get('/transactions?type=EXPENSE'),
        axios.get('/settings/wallets'),
        axios.get('/settings/activities')
      ]);

      setTransactions(resTrans.data.data.data);
      setWallets(resWallets.data);
      setActivities(resActivities.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', amount: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof TransactionItem, value: any) => {
    const newItems = [...formData.items];
    // @ts-ignore
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat mencatat pengeluaran');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setSubmitting(true);

    const totalAmount = calculateTotal();

    if (totalAmount <= 0) {
      toast.error('Total pengeluaran harus lebih dari 0');
      setSubmitting(false);
      return;
    }

    try {
      // Build description from items if needed, or backend stores items
      // For now, let's append items summary to description for backward compatibility
      // But we are sending `items` array to backend as well.
      
      const payload = {
        type: 'EXPENSE',
        account_id: formData.account_id,
        category: formData.category,
        description: formData.description,
        amount: totalAmount,
        date: formData.date,
        items: formData.items
      };

      await axios.post('/transactions', payload);
      toast.success('Pengeluaran berhasil dicatat');
      setIsModalOpen(false);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        account_id: '',
        category: '',
        description: '',
        items: [{ name: '', amount: 0 }]
      });

      fetchInitialData(); // Refresh list
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReport = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Download laporan tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading("Sedang membuat laporan PDF...");
    
    try {
      const response = await axios.get('/rt/kas/export/expense-pdf', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `Laporan-Pengeluaran-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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

  const handleDelete = async (id: number) => {
    if (isDemo) {
        toast.error('Mode Demo: Tidak dapat menghapus transaksi');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!confirm('Yakin ingin menghapus data ini? Saldo akan dikembalikan.')) return;
    
    try {
      await axios.delete(`/transactions/${id}`);
      toast.success('Transaksi dihapus');
      fetchInitialData();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus data');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans pb-24">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8 space-y-2">
        <button 
          onClick={() => router.push('/dashboard/keuangan')}
          className="flex items-center text-slate-500 hover:text-rose-600 transition-colors font-medium group mb-4"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 flex items-center justify-center mr-2 transition-colors">
              <ArrowLeft className="w-4 h-4" />
          </div>
          Kembali ke Keuangan
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              Pengeluaran Operasional
              <DemoLabel />
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Catat dan pantau semua pengeluaran RT
            </p>
          </div>
          
          <div className="flex gap-3">
             <button
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="inline-flex items-center px-6 py-3 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm border border-slate-200 font-bold group"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                )}
                Download Laporan
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 font-bold group"
              >
                <TrendingDown className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Catat Pengeluaran
              </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
             {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="h-16 bg-slate-50 rounded-xl w-full animate-pulse"></div>
             ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-wider text-xs">Tanggal</th>
                    <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-wider text-xs">Perihal</th>
                    <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-wider text-xs">Kegiatan</th>
                    <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-wider text-xs">Sumber Dana</th>
                    <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Total</th>
                    <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                            <Receipt className="w-10 h-10 text-rose-300" />
                          </div>
                          <p className="text-slate-500 font-medium text-lg">Belum ada data pengeluaran</p>
                          <p className="text-slate-400 text-sm">Silakan catat pengeluaran baru</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 text-slate-600 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                            {format(new Date(t.date), 'dd MMM yyyy', { locale: id })}
                          </div>
                        </td>
                        <td className="px-6 py-5 font-semibold text-slate-800">
                          {t.description}
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-slate-600">
                          <div className="flex items-center gap-2">
                             <Wallet className="w-3.5 h-3.5 text-slate-400" />
                             {t.wallet?.name || '-'}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-rose-600 text-base">
                          Rp {new Intl.NumberFormat('id-ID').format(t.amount)}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {transactions.length > 0 && (
               <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/30 text-xs text-slate-500 text-center font-medium">
                  Menampilkan {transactions.length} transaksi pengeluaran
               </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                 <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    Catat Pengeluaran Baru
                 </h3>
                 <p className="text-slate-500 text-sm mt-1 ml-11">Isi detail pengeluaran dengan lengkap</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Sumber Dana (Wallet)</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                    <select
                      required
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all appearance-none cursor-pointer font-medium"
                      value={formData.account_id}
                      onChange={e => setFormData({...formData, account_id: e.target.value})}
                    >
                      <option value="">-- Pilih Wallet --</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} (Rp {new Intl.NumberFormat('id-ID').format(w.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Kategori / Kegiatan</label>
                  <div className="relative">
                     <Tag className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                    <select
                      required
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all appearance-none cursor-pointer font-medium"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {activities.map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Perihal</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Beli Konsumsi Rapat"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium placeholder:text-slate-400"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              {/* Repeater Items */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Rincian Item
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> TAMBAH BARIS
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-200">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Nama Item / Keterangan"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                          value={item.name}
                          onChange={e => handleItemChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="w-40">
                        <input
                          type="number"
                          required
                          placeholder="0"
                          min="0"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-mono font-medium"
                          value={item.amount}
                          onChange={e => handleItemChange(index, 'amount', e.target.value)}
                        />
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                  <span className="font-bold text-slate-700">Total Pengeluaran</span>
                  <span className="font-extrabold text-xl text-rose-600">
                    Rp {new Intl.NumberFormat('id-ID').format(calculateTotal())}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-bold shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Simpan Pengeluaran
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}