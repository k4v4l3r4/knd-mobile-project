'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserPlus, Wallet, Megaphone, ArrowRight, Clock, Activity } from 'lucide-react';
import Link from 'next/link';

export default function ChartAndActions({ data }: { data: any }) {
  const chartData = data?.trend_chart || [
    { month: 'Jan', income: 5000000, expense: 2000000 },
    { month: 'Feb', income: 6000000, expense: 3500000 },
    { month: 'Mar', income: 4500000, expense: 1500000 },
    { month: 'Apr', income: 7000000, expense: 4000000 },
    { month: 'May', income: 5500000, expense: 2500000 },
    { month: 'Jun', income: 6500000, expense: 3000000 },
  ];

  const actions = [
    { 
      label: 'Tambah Warga', 
      icon: UserPlus, 
      href: '/dashboard/warga', 
      gradient: 'from-teal-500 to-teal-600',
      shadow: 'shadow-teal-200/50'
    },
    { 
      label: 'Catat Kas', 
      icon: Wallet, 
      href: '/dashboard/keuangan', 
      gradient: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-200/50'
    },
    { 
      label: 'Buat Pengumuman', 
      icon: Megaphone, 
      href: '/dashboard/pengumuman', 
      gradient: 'from-cyan-500 to-cyan-600',
      shadow: 'shadow-cyan-200/50'
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
          <p className="text-sm font-semibold text-slate-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-indigo-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Masuk: Rp {payload[0].value.toLocaleString('id-ID')}
            </p>
            <p className="text-xs font-medium text-pink-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              Keluar: Rp {payload[1].value.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Chart Section */}
      <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-emerald-500" />
              Arus Kas
            </h3>
            <p className="text-sm text-slate-500 mt-1">Statistik keuangan 6 bulan terakhir</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
              <span className="text-slate-600">Pemasukan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></span>
              <span className="text-slate-600">Pengeluaran</span>
            </div>
          </div>
        </div>
        
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }} 
                tickFormatter={(value) => `${value / 1000000}M`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
              <Bar dataKey="income" fill="#6366f1" radius={[6, 6, 6, 6]} barSize={12} animationDuration={1500}>
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill="#6366f1" />
                ))}
              </Bar>
              <Bar dataKey="expense" fill="#ec4899" radius={[6, 6, 6, 6]} barSize={12} animationDuration={1500}>
                 {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill="#ec4899" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions & Recent Activity Section */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-emerald-500"></span>
            Aksi Cepat
          </h3>
          <div className="space-y-3">
            {actions.map((action, idx) => (
              <Link 
                key={idx} 
                href={action.href}
                className={`group flex items-center justify-between p-4 rounded-2xl text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 bg-gradient-to-r ${action.gradient} ${action.shadow}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <action.icon size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold tracking-wide">{action.label}</span>
                </div>
                <div className="bg-white/10 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity Mini */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex-1">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              Aktivitas Terbaru
            </h4>
            <Link href="/dashboard/activity" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline">
              Lihat Semua
            </Link>
          </div>
          
          <div className="space-y-5 relative before:absolute before:left-[11px] before:top-2 before:h-[80%] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
             {/* Dummy Activity Items - in real app, fetch this */}
             {[
               { text: 'Budi Santoso membayar iuran', time: '20 min', color: 'bg-emerald-500', ring: 'ring-emerald-100 dark:ring-emerald-900/30' },
               { text: 'Pengajuan surat baru masuk', time: '1 jam', color: 'bg-blue-500', ring: 'ring-blue-100 dark:ring-blue-900/30' },
               { text: 'Ronda malam dimulai', time: '3 jam', color: 'bg-amber-500', ring: 'ring-amber-100 dark:ring-amber-900/30' }
             ].map((item, idx) => (
               <div key={idx} className="flex gap-4 relative z-10">
                  <div className={`w-6 h-6 rounded-full ${item.color} shrink-0 ring-4 ${item.ring} flex items-center justify-center`}>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">{item.text}</p>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{item.time} yang lalu</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
