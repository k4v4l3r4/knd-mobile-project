'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from '@/lib/axios';
import { 
  Printer, 
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Download,
  Share2,
  ArrowUpRight,
  Eye,
  Calendar,
  FileText
} from 'lucide-react';
import { useTenant } from "@/context/TenantContext";
import { DemoLabel } from '@/components/TenantStatusComponents';
import toast, { Toaster } from 'react-hot-toast';
import { format, subMonths, addMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Interfaces ---

interface Mutation {
  id: number;
  date: string;
  type: 'IN' | 'OUT' | 'EXPENSE';
  amount: number;
  description: string;
  category: string;
  user?: { name: string };
  wallet?: { id: number; name: string };
  account_id?: number;
}

interface CategoryTotal {
  category: string;
  total: number;
}

interface WalletBalance {
  id: number;
  name: string;
  balance: number;
}

interface ReportData {
  month: number;
  year: number;
  beginning_balances: WalletBalance[];
  total_beginning_balance: number;
  income_categories: CategoryTotal[];
  total_income: number;
  expense_categories: CategoryTotal[];
  total_expense: number;
  net_cash_flow: number;
  ending_balances: WalletBalance[];
  total_ending_balance: number;
  mutations: Mutation[];
}

interface DetailModalState {
  isOpen: boolean;
  type: 'WALLET' | 'CATEGORY' | null;
  title: string;
  id?: number | string; // Wallet ID or Category Name
  data?: any; // Extra data like beginning balance for wallet
}

export default function FinancialReportPage() {
  const { isDemo, isExpired } = useTenant();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  
  // State for Month/Year Selection
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal State
  const [modalState, setModalState] = useState<DetailModalState>({
    isOpen: false,
    type: null,
    title: '',
  });

  // Derived state for fetch params
  const selectedMonth = currentDate.getMonth() + 1;
  const selectedYear = currentDate.getFullYear();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/reports/summary', {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Gagal memuat laporan keuangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (isDemo) {
        toast.error('Mode Demo: Export Excel tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!data || !data.mutations.length) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const headers = ['Tanggal', 'Keterangan', 'Kategori', 'Tipe', 'Dompet', 'Nominal'];
    const rows = data.mutations.map(m => [
      format(new Date(m.date), 'yyyy-MM-dd'),
      `"${m.description.replace(/"/g, '""')}"`,
      m.category,
      m.type === 'IN' ? 'Pemasukan' : 'Pengeluaran',
      m.wallet?.name || '-',
      m.amount
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Keuangan_${format(currentDate, 'MMMM_yyyy', { locale: id })}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // --- Modal Logic ---

  const openWalletDetail = (wallet: WalletBalance) => {
    setModalState({
      isOpen: true,
      type: 'WALLET',
      title: wallet.name,
      id: wallet.id,
      data: wallet // Contains beginning balance
    });
  };

  const openCategoryDetail = (categoryName: string) => {
    setModalState({
      isOpen: true,
      type: 'CATEGORY',
      title: categoryName,
      id: categoryName
    });
  };

  // Filter mutations based on modal selection
  const modalMutations = useMemo(() => {
    if (!data || !modalState.isOpen) return [];

    if (modalState.type === 'WALLET') {
      return data.mutations.filter(m => m.wallet?.id === modalState.id || m.account_id === modalState.id);
    } else if (modalState.type === 'CATEGORY') {
      return data.mutations.filter(m => m.category === modalState.id);
    }
    return [];
  }, [data, modalState]);

  // Calculate modal summary
  const modalSummary = useMemo(() => {
    if (!data || !modalState.isOpen) return null;

    const mutations = modalMutations;
    const totalIn = mutations.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.amount, 0);
    const totalOut = mutations.filter(m => ['OUT', 'EXPENSE'].includes(m.type)).reduce((sum, m) => sum + m.amount, 0);

    if (modalState.type === 'WALLET') {
      const startBal = modalState.data?.balance || 0; // This is beginning balance from the main list
      const endBal = startBal + totalIn - totalOut;
      return { startBal, totalIn, totalOut, endBal };
    }
    
    return { totalIn, totalOut };
  }, [modalMutations, modalState, data]);


  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans print:bg-white print:pb-0">
      <Toaster position="top-center" />
      
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 10mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .print-break-inside-avoid { page-break-inside: avoid; }
        `}
      </style>

      {/* --- TOOLBAR (Controls) --- */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 mb-8 no-print shadow-sm">
         <div className="max-w-[900px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Left: Navigation */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="flex items-center bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 border-r border-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="px-4 py-1.5 font-semibold text-slate-700 min-w-[140px] text-center text-sm flex items-center justify-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {format(currentDate, 'MMMM yyyy', { locale: id })}
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 border-l border-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                 </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
               <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
               >
                  <Printer size={16} /> <span className="hidden sm:inline">Cetak</span>
               </button>
               <button 
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 border border-emerald-600 rounded-md text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Download size={16} /> <span className="hidden sm:inline">Download Excel</span>
               </button>
            </div>
         </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
            <p className="text-slate-500 text-sm font-medium">Memuat data laporan...</p>
        </div>
      ) : data ? (
        <div className="max-w-[900px] mx-auto bg-white rounded-sm shadow-xl min-h-[1123px] print:shadow-none print:w-full print:max-w-none print:min-h-0">
            
            {/* --- PAPER HEADER --- */}
            <div className="px-10 py-12 text-center border-b border-slate-100 print:px-0 print:py-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                     <div className="bg-slate-900 text-white w-10 h-10 flex items-center justify-center rounded-lg">
                        <FileText size={20} />
                     </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                  Laporan Keuangan
                  <div className="no-print"><DemoLabel /></div>
                </h1>
                <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">
                    Periode: {format(currentDate, 'MMMM yyyy', { locale: id })}
                </p>
                <div className="mt-6 flex justify-center gap-8 text-xs text-slate-400 font-mono">
                    <span>Dibuat: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                    <span>Oleh: Administrator</span>
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="p-10 print:p-0">
                <table className="w-full text-sm">
                    {/* SECTION 1: SALDO AWAL */}
                    <thead>
                        <tr>
                            <th colSpan={2} className="text-left pt-2 pb-3 font-bold text-slate-900 uppercase text-xs tracking-wider border-b-2 border-slate-900">
                                I. Saldo Awal
                            </th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        <tr><td colSpan={2} className="h-2"></td></tr>
                        {data.beginning_balances.map((wallet) => (
                            <tr 
                                key={wallet.id} 
                                onClick={() => openWalletDetail(wallet)}
                                className="group hover:bg-slate-50 cursor-pointer transition-colors border-b border-dashed border-slate-100 last:border-0"
                            >
                                <td className="py-2.5 pl-4 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                    {wallet.name}
                                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-blue-400" />
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono text-slate-600 group-hover:text-slate-900">
                                    {formatCurrency(wallet.balance)}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold text-slate-900">
                            <td className="py-3 pl-4 border-t border-slate-300">Total Saldo Awal</td>
                            <td className="py-3 pr-4 text-right border-t border-slate-300 font-mono text-base">
                                {formatCurrency(data.total_beginning_balance)}
                            </td>
                        </tr>
                    </tbody>

                    {/* SPACER */}
                    <tbody><tr><td colSpan={2} className="h-8"></td></tr></tbody>

                    {/* SECTION 2: PENERIMAAN */}
                    <thead>
                        <tr>
                            <th colSpan={2} className="text-left pt-2 pb-3 font-bold text-slate-900 uppercase text-xs tracking-wider border-b-2 border-slate-900">
                                II. Penerimaan (Income)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        <tr><td colSpan={2} className="h-2"></td></tr>
                        {data.income_categories.length > 0 ? (
                            data.income_categories.map((cat, idx) => (
                                <tr 
                                    key={idx} 
                                    onClick={() => openCategoryDetail(cat.category)}
                                    className="group hover:bg-emerald-50/30 cursor-pointer transition-colors border-b border-dashed border-slate-100 last:border-0"
                                >
                                    <td className="py-2.5 pl-4 flex items-center gap-2 group-hover:text-emerald-700 transition-colors">
                                        {cat.category || 'Lain-lain'}
                                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-emerald-500" />
                                    </td>
                                    <td className="py-2.5 pr-4 text-right font-mono text-slate-600 group-hover:text-slate-900">
                                        {formatCurrency(cat.total)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={2} className="py-4 text-center text-slate-400 italic text-xs">Tidak ada penerimaan pada periode ini</td>
                            </tr>
                        )}
                        <tr className="bg-emerald-50/50 font-bold text-emerald-800">
                            <td className="py-3 pl-4 border-t border-emerald-200">Total Penerimaan</td>
                            <td className="py-3 pr-4 text-right border-t border-emerald-200 font-mono text-base">
                                + {formatCurrency(data.total_income)}
                            </td>
                        </tr>
                    </tbody>

                    {/* SPACER */}
                    <tbody><tr><td colSpan={2} className="h-8"></td></tr></tbody>

                    {/* SECTION 3: PENGELUARAN */}
                    <thead>
                        <tr>
                            <th colSpan={2} className="text-left pt-2 pb-3 font-bold text-slate-900 uppercase text-xs tracking-wider border-b-2 border-slate-900">
                                III. Pengeluaran (Expense)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        <tr><td colSpan={2} className="h-2"></td></tr>
                        {data.expense_categories.length > 0 ? (
                            data.expense_categories.map((cat, idx) => (
                                <tr 
                                    key={idx} 
                                    onClick={() => openCategoryDetail(cat.category)}
                                    className="group hover:bg-rose-50/30 cursor-pointer transition-colors border-b border-dashed border-slate-100 last:border-0"
                                >
                                    <td className="py-2.5 pl-4 flex items-center gap-2 group-hover:text-rose-700 transition-colors">
                                        {cat.category || 'Lain-lain'}
                                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-rose-500" />
                                    </td>
                                    <td className="py-2.5 pr-4 text-right font-mono text-slate-600 group-hover:text-slate-900">
                                        {formatCurrency(cat.total)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={2} className="py-4 text-center text-slate-400 italic text-xs">Tidak ada pengeluaran pada periode ini</td>
                            </tr>
                        )}
                        <tr className="bg-rose-50/50 font-bold text-rose-800">
                            <td className="py-3 pl-4 border-t border-rose-200">Total Pengeluaran</td>
                            <td className="py-3 pr-4 text-right border-t border-rose-200 font-mono text-base">
                                - {formatCurrency(data.total_expense)}
                            </td>
                        </tr>
                    </tbody>

                    {/* SUMMARY ROW */}
                    <tbody>
                        <tr><td colSpan={2} className="h-4"></td></tr>
                        <tr className="bg-slate-100">
                            <td className="py-3 pl-4 font-bold text-slate-800 border-y border-slate-200">SURPLUS / DEFISIT (II - III)</td>
                            <td className={`py-3 pr-4 text-right font-bold border-y border-slate-200 font-mono text-base ${data.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {data.net_cash_flow >= 0 ? '+' : ''} {formatCurrency(data.net_cash_flow)}
                            </td>
                        </tr>
                    </tbody>

                    {/* SPACER */}
                    <tbody><tr><td colSpan={2} className="h-8"></td></tr></tbody>

                    {/* SECTION 4: SALDO AKHIR */}
                    <thead>
                        <tr>
                            <th colSpan={2} className="text-left pt-2 pb-3 font-bold text-slate-900 uppercase text-xs tracking-wider border-b-2 border-slate-900">
                                IV. Saldo Akhir (I + Surplus/Defisit)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        <tr><td colSpan={2} className="h-2"></td></tr>
                        {data.ending_balances.map((wallet) => (
                            <tr 
                                key={wallet.id} 
                                onClick={() => openWalletDetail(wallet)}
                                className="group hover:bg-slate-50 cursor-pointer transition-colors border-b border-dashed border-slate-100 last:border-0"
                            >
                                <td className="py-2.5 pl-4 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                    {wallet.name}
                                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-blue-400" />
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono text-slate-600 group-hover:text-slate-900">
                                    {formatCurrency(wallet.balance)}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-900 text-white font-bold">
                            <td className="py-4 pl-4 rounded-l-md">Total Saldo Kas Akhir</td>
                            <td className="py-4 pr-4 text-right rounded-r-md font-mono text-lg">
                                {formatCurrency(data.total_ending_balance)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {/* SIGNATURES PLACEHOLDER (For Print) */}
                <div className="hidden print:flex mt-20 justify-between px-10">
                     <div className="text-center">
                        <p className="mb-20 text-sm text-slate-600">Dibuat Oleh,</p>
                        <p className="font-bold text-slate-900 border-t border-slate-300 pt-2 w-48 mx-auto">Bendahara RT</p>
                     </div>
                     <div className="text-center">
                        <p className="mb-20 text-sm text-slate-600">Mengetahui,</p>
                        <p className="font-bold text-slate-900 border-t border-slate-300 pt-2 w-48 mx-auto">Ketua RT</p>
                     </div>
                </div>
            </div>
        </div>
      ) : null}

      {/* --- DETAIL MODAL --- */}
      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                         modalState.type === 'WALLET' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                     }`}>
                         {modalState.type === 'WALLET' ? <FileText size={20} /> : <Filter size={20} />}
                     </div>
                     <div>
                        <DialogTitle className="text-xl font-bold text-slate-900">{modalState.title}</DialogTitle>
                        <p className="text-sm text-slate-500 mt-1">Detail mutasi periode {format(currentDate, 'MMMM yyyy', { locale: id })}</p>
                     </div>
                </div>
            </DialogHeader>

            <div className="p-6">
                {/* Modal Summary (Wallet Only) */}
                {modalState.type === 'WALLET' && modalSummary && (
                    <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
                        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-200">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Saldo Awal</p>
                                <p className="font-mono font-bold text-slate-700 text-sm">{formatCurrency(modalSummary.startBal || 0)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Perubahan</p>
                                <p className={`font-mono font-bold text-sm ${
                                    (modalSummary.totalIn - modalSummary.totalOut) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                    {(modalSummary.totalIn - modalSummary.totalOut) >= 0 ? '+' : ''}
                                    {formatCurrency(modalSummary.totalIn - modalSummary.totalOut)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Saldo Akhir</p>
                                <p className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(modalSummary.endBal || 0)}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Modal Summary (Category Only) */}
                {modalState.type === 'CATEGORY' && modalSummary && (
                     <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Total Transaksi</span>
                            <span className="font-mono font-bold text-lg text-slate-900">{formatCurrency(modalSummary.totalIn + modalSummary.totalOut)}</span>
                        </div>
                     </div>
                )}

                {/* Transaction List */}
                <div>
                    <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Calendar size={14} /> Riwayat Transaksi
                    </h3>
                    <div className="border rounded-lg overflow-hidden border-slate-100">
                        {modalMutations.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {modalMutations.map((mutation) => (
                                    <div key={mutation.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-start group">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="font-mono">{format(new Date(mutation.date), 'dd MMM', { locale: id })}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>{mutation.user?.name || 'System'}</span>
                                            </div>
                                            <p className="font-medium text-slate-700 text-sm group-hover:text-blue-600 transition-colors">
                                                {mutation.description}
                                            </p>
                                            {modalState.type === 'CATEGORY' && mutation.wallet && (
                                                <p className="text-xs text-slate-400">Via: {mutation.wallet.name}</p>
                                            )}
                                        </div>
                                        <div className={`font-mono font-bold text-sm ${
                                            mutation.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>
                                            {mutation.type === 'IN' ? '+' : '-'} {formatCurrency(mutation.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 italic text-sm bg-slate-50/50">
                                Tidak ada riwayat transaksi pada periode ini
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
