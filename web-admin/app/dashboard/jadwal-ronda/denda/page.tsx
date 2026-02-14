"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

interface Fine {
  id: number;
  user: {
    name: string;
    email: string;
  };
  schedule: {
    start_date: string;
    shift_name: string;
  };
  fine_type: string;
  amount: number;
  status: "UNPAID" | "PAID";
  generated_at: string;
  paid_at?: string;
}

export default function LaporanDendaPage() {
  const { isDemo, isExpired } = useTenant();
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    fetchFines();
  }, [filterStatus]);

  const fetchFines = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== "ALL") params.status = filterStatus;
      
      const response = await api.get("/rt/fines", { params });
      // Access nested data structure from pagination
      setFines(response.data.data.data || []);
    } catch (error) {
      console.error("Failed to fetch fines:", error);
      toast.error("Gagal memuat data denda");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: number) => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat memproses pembayaran');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menandai denda ini sebagai LUNAS? Data akan masuk ke Kas RT.")) return;
    
    setProcessingId(id);
    try {
      await api.post(`/rt/fines/${id}/mark-paid`);
      toast.success("Denda berhasil ditandai lunas");
      fetchFines(); // Refresh list
    } catch (error) {
      console.error("Failed to pay fine:", error);
      toast.error("Gagal memproses pembayaran");
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Laporan Denda Ronda
        </h1>
        <div className="flex gap-2">
           <select 
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
             className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
           >
             <option value="ALL">Semua Status</option>
             <option value="UNPAID">Belum Bayar</option>
             <option value="PAID">Sudah Bayar</option>
           </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Warga</th>
                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Jadwal</th>
                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Jenis Denda</th>
                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Nominal</th>
                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data denda
                  </td>
                </tr>
              ) : (
                fines.map((fine) => (
                  <tr key={fine.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex flex-col">
                        <span>{fine.user?.name || "Warga Tidak Dikenal"}</span>
                        <span className="text-xs text-slate-500">{fine.user?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {fine.schedule ? (
                         <div>
                            <div>{format(new Date(fine.schedule.start_date), "dd MMM yyyy", { locale: id })}</div>
                            <div className="text-xs text-slate-500">{fine.schedule.shift_name}</div>
                         </div>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${fine.fine_type === 'TIDAK_HADIR' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 
                          fine.fine_type === 'TELAT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                        {fine.fine_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(fine.amount)}
                    </td>
                    <td className="px-6 py-4">
                      {fine.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                          <CheckCircle size={14} /> LUNAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium text-xs">
                          <XCircle size={14} /> BELUM BAYAR
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {fine.status === 'UNPAID' && (
                        <button
                          onClick={() => handlePay(fine.id)}
                          disabled={processingId === fine.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {processingId === fine.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <DollarSign size={12} />
                          )}
                          Bayar
                        </button>
                      )}
                      {fine.status === 'PAID' && fine.paid_at && (
                        <div className="text-xs text-slate-500 flex flex-col items-end">
                          <span>{format(new Date(fine.paid_at), "dd/MM/yy", { locale: id })}</span>
                          <span>{format(new Date(fine.paid_at), "HH:mm", { locale: id })}</span>
                        </div>
                      )}
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
