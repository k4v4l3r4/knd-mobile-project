'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  Users, 
  AlertCircle, 
  Search, 
  Filter, 
  MessageCircle, 
  ChevronDown,
  Calendar,
  Wallet,
  ArrowLeft,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useTenant } from "@/context/TenantContext";
import { DemoLabel } from "@/components/TenantStatusComponents";
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface UnpaidFee {
  fee_id: number;
  fee_name: string;
  amount: number;
  fine: number;
}

interface ArrearsData {
  user: {
    id: number;
    name: string;
    address: string;
    phone: string | null;
  };
  unpaid_fees: UnpaidFee[];
  total_arrears: number;
  total_fine: number;
}

export default function ArrearsPage() {
  const { isDemo, isExpired } = useTenant();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ArrearsData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/fees/arrears', {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching arrears:', error);
      toast.error('Gagal memuat data tunggakan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleWhatsApp = (phone: string | null, name: string, total: number) => {
    if (isDemo) {
        toast.error('Mode Demo: Fitur pengingat WhatsApp tidak tersedia');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!phone) {
      toast.error('Nomor WhatsApp tidak tersedia');
      return;
    }
    
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    const monthName = months.find(m => m.value === selectedMonth)?.label;
    const message = `Halo Bapak/Ibu ${name}, kami dari pengurus RT menginformasikan bahwa terdapat tagihan iuran bulan ${monthName} ${selectedYear} sebesar ${formatCurrency(total)} yang belum terbayar. Mohon segera melakukan pembayaran. Terima kasih.`;
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredData = data.filter(item => 
    item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalArrears = data.reduce((sum, item) => sum + item.total_arrears + item.total_fine, 0);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12 font-sans">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-rose-100 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={120} className="text-rose-600" />
         </div>
         <div className="relative z-10">
           <Link href="/dashboard/keuangan" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold mb-4 transition-colors">
              <ArrowLeft size={18} /> Kembali ke Keuangan
           </Link>
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
               <AlertCircle size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Monitoring Tunggakan</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 font-medium max-w-lg">
             Pantau warga yang belum membayar iuran wajib bulanan dan kelola denda keterlambatan.
           </p>
         </div>
      </div>

      {/* --- STATS & FILTER --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-rose-500 to-red-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-rose-500/20">
            <div className="absolute right-0 top-0 p-6 opacity-10">
                <Wallet size={100} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <p className="text-rose-100 font-bold uppercase tracking-wider text-xs mb-2">Total Tunggakan (Bulan Ini)</p>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">{formatCurrency(totalArrears)}</h2>
                    <div className="mt-4 flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                        <Users size={16} />
                        <span className="font-bold">{data.length} Warga Menunggak</span>
                    </div>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-3 text-sm font-medium">
                        <Calendar size={18} />
                        Periode: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                    </div>
                </div>
            </div>
        </div>

        {/* Filter Card */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-center gap-4">
             <div className="flex items-center gap-2 text-slate-800 font-bold pb-2 border-b border-slate-100">
                <Filter size={18} className="text-emerald-500" /> Filter Periode
             </div>
             
             <div className="space-y-3">
                <div className="relative group">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute left-4 top-2 z-10">Bulan</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full pl-4 pr-10 pt-6 pb-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                        {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 translate-y-1 pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                    </div>
                </div>

                <div className="relative group">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute left-4 top-2 z-10">Tahun</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full pl-4 pr-10 pt-6 pb-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                        {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 translate-y-1 pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                    </div>
                </div>
             </div>
        </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Users size={18} className="text-rose-500" />
                Daftar Warga Menunggak
            </h3>
            
            <div className="relative w-full md:w-72">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Cari nama warga..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Warga</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rincian Tagihan</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tunggakan</th>
                <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Loading Skeletons
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-5"><div className="h-10 bg-slate-200 rounded-full w-10 mb-2"></div><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="px-8 py-5"><div className="h-4 bg-slate-200 rounded w-48 mb-2"></div><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="px-8 py-5"><div className="h-6 bg-slate-200 rounded w-32"></div></td>
                    <td className="px-8 py-5"><div className="h-8 bg-slate-200 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="p-4 bg-emerald-50 text-emerald-500 rounded-full mb-3"><CheckCircle2 size={32} /></div>
                        <p className="font-bold text-slate-600 text-lg">Semua Lunas!</p>
                        <p className="text-sm">Tidak ada warga yang menunggak pada periode ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                {item.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-[15px] group-hover:text-rose-600 transition-colors">{item.user.name}</div>
                                <div className="text-xs text-slate-500">{item.user.address || 'Alamat tidak tersedia'}</div>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <div className="space-y-1">
                            {item.unpaid_fees.map((fee, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                                    <span className="font-medium">{fee.fee_name}</span>
                                    <span className="text-slate-400 text-xs">({formatCurrency(fee.amount)})</span>
                                </div>
                            ))}
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <div className="font-extrabold text-rose-600 bg-rose-50 w-fit px-3 py-1 rounded-lg border border-rose-100">
                            {formatCurrency(item.total_arrears)}
                        </div>
                        {item.total_fine > 0 && (
                            <div className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                                + Denda {formatCurrency(item.total_fine)}
                            </div>
                        )}
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                         onClick={() => handleWhatsApp(item.user.phone, item.user.name, item.total_arrears + item.total_fine)}
                         className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100 hover:border-emerald-500 hover:shadow-emerald-500/20"
                       >
                         <MessageCircle size={16} />
                         Ingatkan
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