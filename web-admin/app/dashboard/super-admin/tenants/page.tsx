'use client';

import { useState, useEffect } from 'react';
import { SuperAdminService } from '@/services/super-admin-service';
import { TenantBilling } from '@/types/super-admin';
import { Search, ShieldCheck, Clock, XCircle, Trash2 } from 'lucide-react';
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantBilling | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState<{
    search: string;
    status: string;
    billing_mode: string;
  }>({
    search: '',
    status: '',
    billing_mode: '',
  });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const { isDemo } = useTenant();

  const fetchTenants = async (): Promise<void> => {
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
    } catch (error: unknown) {
      console.error('Failed to fetch tenants:', error);
      toast.error('Gagal memuat data tenant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [filters.status, filters.billing_mode, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset page on search
    fetchTenants();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const confirmDelete = (tenant: TenantBilling) => {
    setTenantToDelete(tenant);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!tenantToDelete) return;

    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus tenant');
      return;
    }

    setIsDeleting(true);
    try {
      await SuperAdminService.deleteTenant(tenantToDelete.id);
      toast.success('Tenant berhasil dihapus');
      setTenants((prev) => prev.filter((t) => t.id !== tenantToDelete.id));
      setIsDeleteModalOpen(false);
    } catch (error: unknown) {
      console.error('Failed to delete tenant:', error);
      toast.error('Gagal menghapus tenant');
    } finally {
      setIsDeleting(false);
      setTenantToDelete(null);
    }
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
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Tidak ada data ditemukan</td></tr>
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
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => confirmDelete(tenant)}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </button>
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
      {isDeleteModalOpen && tenantToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full mx-auto mb-6">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">Hapus Tenant?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
              Apakah Anda yakin ingin menghapus tenant{' '}
              <span className="font-bold text-slate-800 dark:text-white">
                {tenantToDelete.tenant_name}
              </span>{' '}
              dengan kode{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {tenantToDelete.tenant_code}
              </span>
              ? Tindakan ini akan menonaktifkan tenant dan wilayah terkait.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setIsDeleteModalOpen(false); setTenantToDelete(null); }}
                className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? <Clock className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type TenantStatusVariant = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'DEMO';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<TenantStatusVariant, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    TRIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EXPIRED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    DEMO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };

  const icons: Record<TenantStatusVariant, typeof ShieldCheck | typeof Clock | typeof XCircle> = {
    ACTIVE: ShieldCheck,
    TRIAL: Clock,
    EXPIRED: XCircle,
    DEMO: ShieldCheck
  };

  const variant: TenantStatusVariant = (['ACTIVE', 'TRIAL', 'EXPIRED', 'DEMO'].includes(status)
    ? status
    : 'DEMO') as TenantStatusVariant;

  const Icon = icons[variant];

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold w-fit ${styles[variant]}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}
