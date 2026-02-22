'use client';

import { useState, useEffect } from 'react';
import { SuperAdminService } from '@/services/super-admin-service';
import { TenantBilling } from '@/types/super-admin';
import { Search, Filter, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useTenant } from '@/context/TenantContext';

const demoTenants: TenantBilling[] = [
  {
    id: 1,
    tenant_name: 'RT 01 Demo',
    tenant_code: 'RT-1',
    rt_rw: 'RT 01 / RW 01',
    city: 'Demo City',
    billing_mode: 'RT',
    status: 'ACTIVE',
    plan_code: 'BASIC_RT_MONTHLY',
    subscription_type: 'MONTHLY',
    ends_at: null,
    trial_ends_at: null,
  },
  {
    id: 2,
    tenant_name: 'RT 05 Demo',
    tenant_code: 'RW-2',
    rt_rw: 'RT 05 / RW 02',
    city: 'Demo City',
    billing_mode: 'RW',
    status: 'TRIAL',
    plan_code: 'TRIAL_14_DAYS',
    subscription_type: 'MONTHLY',
    ends_at: null,
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function TenantBillingPage() {
  const [tenants, setTenants] = useState<TenantBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    billing_mode: '',
  });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const { isDemo } = useTenant();

  useEffect(() => {
    fetchTenants();
  }, [filters.status, filters.billing_mode, page]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      if (isDemo) {
        setTenants(demoTenants);
        setMeta(null);
        return;
      }
      const response = await SuperAdminService.getTenants({ ...filters, page });
      setTenants(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error('Gagal memuat data tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset page on search
    fetchTenants();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tenant Billing</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola status langganan dan billing tenant</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari tenant..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-64"
            />
          </div>
          <select 
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Tenant Name</th>
                <th className="px-6 py-4">Tenant Code</th>
                <th className="px-6 py-4">Wilayah</th>
                <th className="px-6 py-4">Kota</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Active Plan</th>
                <th className="px-6 py-4">Ends At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Tidak ada data ditemukan</td></tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{tenant.tenant_name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{tenant.tenant_code}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{tenant.rt_rw}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{tenant.city}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        tenant.billing_mode === 'RW' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {tenant.billing_mode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {tenant.plan_code !== '-' ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{tenant.plan_code}</span>
                          <span className="text-xs text-slate-500">{tenant.subscription_type}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {tenant.ends_at ? format(new Date(tenant.ends_at), 'dd MMM yyyy', { locale: id }) : (
                        tenant.status === 'TRIAL' && tenant.trial_ends_at ? (
                          <span className="text-amber-600 text-xs">Trial: {format(new Date(tenant.trial_ends_at), 'dd MMM', { locale: id })}</span>
                        ) : '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {meta && (
          <PaginationControls
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            onPageChange={handlePageChange}
            isLoading={loading}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    TRIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EXPIRED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    DEMO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };

  const icons: any = {
    ACTIVE: ShieldCheck,
    TRIAL: Clock,
    EXPIRED: XCircle,
    DEMO: ShieldCheck
  };

  const Icon = icons[status] || ShieldCheck;

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold w-fit ${styles[status] || styles.DEMO}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}
