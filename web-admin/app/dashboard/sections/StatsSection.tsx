'use client';

import { Users, Wallet, TrendingDown, CreditCard } from 'lucide-react';

export default function StatsSection({ data }: { data: any }) {
  const kpi = data?.kpi || {};

  const stats = [
    {
      label: 'Total Warga',
      value: kpi.total_warga || 0,
      sub: 'Warga Tetap & Kost',
      icon: Users,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
      shadow: 'shadow-teal-100',
    },
    {
      label: 'Saldo Kas',
      value: `Rp ${(kpi.saldo_akhir || 0).toLocaleString('id-ID')}`,
      sub: 'Update Realtime',
      icon: Wallet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      shadow: 'shadow-emerald-100',
    },
    {
      label: 'Pemasukan (Bulan Ini)',
      value: `Rp ${(kpi.kas_masuk || 0).toLocaleString('id-ID')}`,
      sub: '+12% dari bulan lalu',
      icon: CreditCard,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
      shadow: 'shadow-cyan-100',
    },
    {
      label: 'Pengeluaran (Bulan Ini)',
      value: `Rp ${(kpi.kas_keluar || 0).toLocaleString('id-ID')}`,
      sub: 'Operasional & Kegiatan',
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      shadow: 'shadow-rose-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, idx) => (
        <div 
          key={idx} 
          className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border ${stat.border} dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${stat.bg} dark:bg-opacity-20 ${stat.color} dark:text-opacity-90 group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stat.bg} dark:bg-opacity-20 ${stat.color} dark:text-opacity-90`}>
              {idx === 3 ? '-2.5%' : '+4.5%'}
            </span>
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{stat.value}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium flex items-center gap-1">
              {stat.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
