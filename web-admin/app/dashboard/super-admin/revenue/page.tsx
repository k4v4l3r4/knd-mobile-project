'use client';

import { useState, useEffect } from 'react';
import { SuperAdminService } from '@/services/super-admin-service';
import { RevenueSummary, MonthlyRevenue } from '@/types/super-admin';
import { 
  BarChart3, TrendingUp, Users, FileCheck, AlertCircle, 
  Wallet, Building, CheckCircle2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function RevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryData, chartData] = await Promise.all([
        SuperAdminService.getRevenueSummary(),
        SuperAdminService.getMonthlyRevenue(year)
      ]);
      setSummary(summaryData);
      setMonthlyData(chartData);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      toast.error('Gagal memuat data revenue');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat data revenue...</div>;
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Revenue Overview</h1>
          <p className="text-slate-500 dark:text-slate-400">Monitor pendapatan platform secara real-time</p>
        </div>
        <div className="flex gap-2">
           <select 
             value={year}
             onChange={(e) => setYear(Number(e.target.value))}
             className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
           >
             {[0, 1, 2, 3, 4].map(i => {
               const y = new Date().getFullYear() - i;
               return <option key={y} value={y}>{y}</option>
             })}
           </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Revenue" 
          value={formatCurrency(summary.total_revenue)} 
          icon={Wallet} 
          color="emerald"
        />
        <SummaryCard 
          title="Subscription Rev" 
          value={formatCurrency(summary.subscription_revenue)} 
          icon={TrendingUp} 
          color="blue"
        />
        <SummaryCard 
          title="Lifetime Rev" 
          value={formatCurrency(summary.lifetime_revenue)} 
          icon={CheckCircle2} 
          color="purple"
        />
        <SummaryCard 
          title="Active Subs" 
          value={summary.active_subscriptions.toString()} 
          icon={Users} 
          color="amber"
          isCurrency={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Monthly Revenue Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="space-y-4">
           <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Invoice Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600">
                      <FileCheck size={20} />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Paid Invoices</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{summary.paid_invoices}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-600">
                      <AlertCircle size={20} />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Unpaid / Draft</span>
                  </div>
                  <span className="text-lg font-bold text-rose-600">{summary.unpaid_invoices}</span>
                </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Tenant Stats</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Lifetime Tenants</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{summary.lifetime_tenants}</span>
                 </div>
                 <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full" 
                      style={{ width: `${summary.active_subscriptions > 0 ? (summary.lifetime_tenants / summary.active_subscriptions) * 100 : 0}%` }}
                    ></div>
                 </div>
                 <p className="text-xs text-slate-500">
                   {summary.active_subscriptions > 0 
                     ? Math.round((summary.lifetime_tenants / summary.active_subscriptions) * 100) 
                     : 0}% of active subscriptions are Lifetime
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color, isCurrency = true }: any) {
  const colorStyles: any = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.emerald}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}
