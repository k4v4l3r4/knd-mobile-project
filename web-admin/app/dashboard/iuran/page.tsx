'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Search, 
  Filter,
  User,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

interface IuranDetail {
  id: number;
  date: string;
  amount: number;
  category: string;
  desc: string;
  status: string;
  proof_url?: string;
}

interface MonthData {
  paid: number;
  pending?: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  details: IuranDetail[];
}

interface UserIuran {
  id: number;
  name: string;
  block: string;
  photo_url: string | null;
  role: string;
  months: Record<string, MonthData>; // "01", "02", etc.
  total_year: number;
}

interface IuranResponse {
  users: UserIuran[];
  blocks: Record<string, number>;
  standard_fee: number;
}

export default function LaporanIuranPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IuranResponse | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [instructionJson, setInstructionJson] = useState('');
  const [instruction, setInstruction] = useState<any | null>(null);
  
  // Popover State
  const [hoveredCell, setHoveredCell] = useState<{userId: number, month: string} | null>(null);

  const handleApprove = async (trxId: number) => {
    if (isDemo || isExpired) return;
    if (!confirm("Verifikasi transaksi ini? Saldo akan bertambah.")) return;
    
    try {
      await api.post(`/transactions/${trxId}/verify`);
      toast.success("Transaksi berhasil diverifikasi");
      fetchData(); // Reload data
    } catch (error) {
      console.error("Verification failed:", error);
      toast.error("Gagal verifikasi");
    }
  };

  useEffect(() => {
    if (!status) return;
    fetchData();
  }, [status, year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoUsers: UserIuran[] = [
          {
            id: 1,
            name: 'Budi Santoso',
            block: 'A',
            photo_url: null,
            role: 'WARGA',
            months: {
              '01': {
                paid: 100000,
                status: 'PAID',
                details: [
                  {
                    id: 101,
                    date: `${year}-01-05`,
                    amount: 100000,
                    category: 'Iuran Rutin',
                    desc: 'Iuran bulan Januari',
                    status: 'PAID'
                  }
                ]
              },
              '02': {
                paid: 100000,
                status: 'PAID',
                details: [
                  {
                    id: 102,
                    date: `${year}-02-06`,
                    amount: 100000,
                    category: 'Iuran Rutin',
                    desc: 'Iuran bulan Februari',
                    status: 'PAID'
                  }
                ]
              },
              '03': {
                paid: 50000,
                status: 'PARTIAL',
                details: [
                  {
                    id: 103,
                    date: `${year}-03-10`,
                    amount: 50000,
                    category: 'Iuran Rutin',
                    desc: 'Cicilan iuran Maret',
                    status: 'PARTIAL'
                  }
                ]
              }
            },
            total_year: 250000
          },
          {
            id: 2,
            name: 'Siti Aminah',
            block: 'A',
            photo_url: null,
            role: 'WARGA',
            months: {
              '01': {
                paid: 0,
                status: 'UNPAID',
                details: []
              },
              '02': {
                paid: 100000,
                status: 'PAID',
                details: [
                  {
                    id: 104,
                    date: `${year}-02-15`,
                    amount: 100000,
                    category: 'Iuran Rutin',
                    desc: 'Iuran Februari',
                    status: 'PAID'
                  }
                ]
              }
            },
            total_year: 100000
          },
          {
            id: 3,
            name: 'Andi Wijaya',
            block: 'B',
            photo_url: null,
            role: 'WARGA',
            months: {
              '01': {
                paid: 100000,
                status: 'PAID',
                details: [
                  {
                    id: 105,
                    date: `${year}-01-03`,
                    amount: 100000,
                    category: 'Iuran Rutin',
                    desc: 'Iuran Januari',
                    status: 'PAID'
                  }
                ]
              },
              '02': {
                paid: 100000,
                status: 'PAID',
                details: [
                  {
                    id: 106,
                    date: `${year}-02-04`,
                    amount: 100000,
                    category: 'Iuran Rutin',
                    desc: 'Iuran Februari',
                    status: 'PAID'
                  }
                ]
              },
              '03': {
                paid: 100000,
                status: 'PAID',
                details: [
                  {
                    id: 107,
                    date: `${year}-03-07`,
                    amount: 100000,
                    category: 'Iuran Rutin',
                    desc: 'Iuran Maret',
                    status: 'PAID'
                  }
                ]
              }
            },
            total_year: 300000
          }
        ];

        const demoBlocks: Record<string, number> = demoUsers.reduce((acc, user) => {
          acc[user.block] = (acc[user.block] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const demoData: IuranResponse = {
          users: demoUsers,
          blocks: demoBlocks,
          standard_fee: 100000
        };

        setData(demoData);
        return;
      }
      const response = await api.get('/reports/dues', {
        params: { year }
      });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching dues:', error);
        toast.error('Gagal mengambil data iuran');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = (data?.users || []).filter(user => {
    const searchLower = search.toLowerCase();
    const matchName = user.name.toLowerCase().includes(searchLower);
    const matchBlock = (user.block || '').toLowerCase().includes(searchLower);
    return matchName || matchBlock;
  }).sort((a, b) => {
    // Sort by Block first
    const blockA = a.block || '';
    const blockB = b.block || '';
    const blockCompare = blockA.localeCompare(blockB, undefined, { numeric: true, sensitivity: 'base' });
    if (blockCompare !== 0) return blockCompare;
    
    // Then by Name
    return a.name.localeCompare(b.name);
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const months = [
    { key: '01', label: 'Jan' },
    { key: '02', label: 'Feb' },
    { key: '03', label: 'Mar' },
    { key: '04', label: 'Apr' },
    { key: '05', label: 'Mei' },
    { key: '06', label: 'Jun' },
    { key: '07', label: 'Jul' },
    { key: '08', label: 'Agu' },
    { key: '09', label: 'Sep' },
    { key: '10', label: 'Okt' },
    { key: '11', label: 'Nov' },
    { key: '12', label: 'Des' },
  ];

  // Calculate totals
  const monthlyTotals = months.reduce((acc, m) => {
    acc[m.key] = filteredUsers.reduce((sum, user) => {
      return sum + (user.months[m.key]?.paid || 0);
    }, 0);
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = filteredUsers.reduce((sum, user) => sum + user.total_year, 0);

  const handleLoadInstruction = () => {
    if (!instructionJson.trim()) {
      setInstruction(null);
      return;
    }
    try {
      const parsed = JSON.parse(instructionJson);
      setInstruction(parsed);
      if (process.env.NODE_ENV === 'development') {
        console.log('Dev Iuran instruction (web-admin)', parsed);
      }
      toast.success('Instruction loaded (dev only)');
    } catch (e) {
      toast.error('JSON tidak valid');
    }
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          Laporan Iuran Warga
          <DemoLabel />
        </h1>
        <p className="text-slate-500 dark:text-slate-400">Rekapitulasi pembayaran iuran warga per tahun</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300">
        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 transition-colors duration-300">
            <button 
              onClick={() => setYear(y => y - 1)}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 font-semibold text-slate-700 dark:text-slate-200 select-none">{year}</span>
            <button 
              onClick={() => setYear(y => y + 1)}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari nama atau blok..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-emerald-500 w-64 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 transition-colors duration-300"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            if (isDemo) {
              toast.error('Mode Demo: Export laporan tidak diizinkan');
              return;
            }
            if (isExpired) {
              toast.error('Akses Terbatas: Silakan perpanjang langganan');
              return;
            }
            const token = Cookies.get('admin_token');
            
            let baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
            // Hapus trailing slash jika ada untuk standardisasi
            baseUrl = baseUrl.replace(/\/$/, '');

            // Jika URL belum memiliki suffix /api, tambahkan secara manual
            // Ini menangani kasus dimana env var hanya berisi domain (misal: https://api.afnet.my.id)
            if (!baseUrl.endsWith('/api')) {
              baseUrl += '/api';
            }

            const finalUrl = `${baseUrl}/reports/dues/pdf?year=${year}&block=ALL&token=${token}`;
            
            console.log("URL PDF:", finalUrl);
            window.open(finalUrl, '_blank');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors duration-300"
        >
          <Download size={18} />
          Download PDF
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        
        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-4 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 w-64 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Warga</th>
                {months.map(m => (
                  <th key={m.key} className="px-4 py-4 text-center min-w-[100px]">{m.label}</th>
                ))}
                <th className="px-4 py-4 text-right min-w-[120px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    Loading data...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data warga ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* User Info Column */}
                    <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                          {user.photo_url ? (
                            <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.block !== 'Unassigned' ? `Blok ${user.block}` : 'No Block'}</p>
                        </div>
                      </div>
                    </td>

                    {months.map((m) => {
                      const mData: MonthData = user.months[m.key] || {
                        paid: 0,
                        pending: 0,
                        status: 'UNPAID',
                        details: []
                      };
                      const isPaid = mData.status === 'PAID';
                      const isPartial = mData.status === 'PARTIAL';
                      const isUnpaid = mData.status === 'UNPAID';
                      const hasPending = (mData.pending || 0) > 0;
                      
                      return (
                        <td 
                          key={m.key} 
                          className="px-2 py-3 text-center relative group"
                          onMouseEnter={() => setHoveredCell({ userId: user.id, month: m.key })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <span className={`
                            font-medium text-xs px-2 py-1 rounded-full relative
                            ${isPaid ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                            ${isPartial ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                            ${isUnpaid ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                            ${hasPending && !isPaid ? 'ring-2 ring-orange-400' : ''}
                          `}>
                            {mData.paid > 0 ? formatCurrency(mData.paid) : '-'}
                            {hasPending && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                              </span>
                            )}
                          </span>

                          {/* Hover Popover */}
                          {hoveredCell?.userId === user.id && hoveredCell?.month === m.key && (
                            <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 text-left animate-in fade-in zoom-in-95 duration-200">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1">
                                {m.label} - Detail Pembayaran
                              </div>
                              {mData.details.length > 0 ? (
                                <div className="space-y-2">
                                  {mData.details.map((d, i) => (
                                    <div key={i} className={`text-xs p-2 rounded-md ${d.status === 'PENDING' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{d.category || 'Pembayaran'}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(d.amount)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                          d.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                          d.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                          'bg-slate-200 text-slate-600'
                                        }`}>
                                          {d.status}
                                        </span>
                                        {d.status === 'PENDING' && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleApprove(d.id);
                                            }}
                                            className="ml-2 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded shadow-sm transition-colors"
                                          >
                                            Approve
                                          </button>
                                        )}
                                      </div>
                                      {d.proof_url && (
                                         <a 
                                           href={`${process.env.NEXT_PUBLIC_API_URL}/storage/${d.proof_url}`} 
                                           target="_blank" 
                                           rel="noreferrer"
                                           className="block mt-1 text-[10px] text-blue-600 hover:underline"
                                           onClick={(e) => e.stopPropagation()}
                                         >
                                           Lihat Bukti
                                         </a>
                                      )}
                                    </div>
                                  ))}
                                  <div className="border-t border-slate-100 dark:border-slate-700 mt-2 pt-1 flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span>Total Masuk</span>
                                    <span>{formatCurrency(mData.paid)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic text-center">Belum ada pembayaran</p>
                              )}
                              {/* Arrow */}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white dark:border-t-slate-800 drop-shadow-sm"></div>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Column */}
                    <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
                      {formatCurrency(user.total_year)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 max-w-lg transition-colors duration-300">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Arti warna pada nominal</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Hijau</span> -&gt; Iuran di bulan tersebut sudah dibayar lunas
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Kuning</span> -&gt; Iuran di bulan tersebut sudah dibayar sebagian tapi belum lunas
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-rose-600 dark:text-rose-400">Merah (Rp 0)</span> -&gt; Iuran di bulan tersebut belum dibayar
            </p>
          </div>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 max-w-2xl space-y-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Dev Only: Iuran Gateway Instruction Debug (Web Admin)
            </span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Tempel JSON instruction dari API iuran di bawah untuk melihat preview channel, amount, dan meta.
          </p>
          <textarea
            value={instructionJson}
            onChange={(e) => setInstructionJson(e.target.value)}
            rows={4}
            className="w-full text-xs font-mono rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 p-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder='{"channel":"MANUAL","amount_total":75000,"meta":{"example":"data"}}'
          />
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleLoadInstruction}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              Load Instruction (Dev)
            </button>
            {instruction && (
              <span className="text-[11px] text-amber-800 dark:text-amber-200">
                Instruction aktif ditampilkan di bawah
              </span>
            )}
          </div>
          {instruction && (
            <div className="mt-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs space-y-1">
              <div className="font-semibold text-amber-900 dark:text-amber-100">
                Preview Instruction
              </div>
              <div className="text-amber-900 dark:text-amber-100">
                Channel:{' '}
                <span className="font-mono">
                  {instruction.channel || 'MANUAL'}
                </span>
              </div>
              <div className="text-amber-900 dark:text-amber-100">
                Amount:{' '}
                <span className="font-mono">
                  {typeof instruction.amount_total === 'number'
                    ? formatCurrency(instruction.amount_total)
                    : '-'}
                </span>
              </div>
              <div className="text-amber-900 dark:text-amber-100 truncate">
                Meta:{' '}
                <span className="font-mono">
                  {JSON.stringify(instruction.meta || {})}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
