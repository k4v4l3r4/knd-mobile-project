'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import HeaderSection from './sections/HeaderSection';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Plus,
  LayoutGrid,
  CreditCard,
  Target,
  PiggyBank,
  ArrowRight,
  ShoppingBag,
  Coffee,
  Smartphone,
  Youtube,
  UserPlus,
  Megaphone,
  FileText,
  Settings2,
  Pencil,
  Trash2,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { toast } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import Cookies from 'js-cookie';

interface User {
  id: number;
  name: string;
  photo_url?: string;
}

interface Member {
  id: number;
  user: User;
}

interface Schedule {
  id: number;
  day_of_week: string;
  week_number?: number;
  start_time: string;
  end_time: string;
  members: Member[];
  shift_name?: string;
}

type QuickActionColor = 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'indigo';

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  iconName: string;
  color: QuickActionColor;
}

const AVAILABLE_ICONS: Record<string, any> = {
  UserPlus, Wallet, Megaphone, FileText, ShoppingBag, Coffee, Smartphone, Youtube, Target, PiggyBank, LayoutGrid, CreditCard
};

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: '1', title: 'Tambah Warga', subtitle: 'Input data penduduk baru', href: '/dashboard/warga', iconName: 'UserPlus', color: 'emerald' },
  { id: '2', title: 'Catat Kas', subtitle: 'Pemasukan & pengeluaran', href: '/dashboard/keuangan', iconName: 'Wallet', color: 'blue' },
  { id: '3', title: 'Buat Pengumuman', subtitle: 'Broadcast info ke warga', href: '/dashboard/pengumuman', iconName: 'Megaphone', color: 'amber' },
  { id: '4', title: 'Layanan Surat', subtitle: 'Persuratan & administrasi', href: '/dashboard/surat', iconName: 'FileText', color: 'purple' },
];

// --- MOCK DATA ---
const MONEY_FLOW_DATA = [
  { month: 'Jan', income: 10000, expense: 8500 },
  { month: 'Feb', income: 12500, expense: 9000 },
  { month: 'Mar', income: 11000, expense: 9500 },
  { month: 'Apr', income: 15000, expense: 12000 },
  { month: 'May', income: 13000, expense: 11500 },
  { month: 'Jun', income: 9000, expense: 6000 },
  { month: 'Jul', income: 10500, expense: 8000 },
];

const BUDGET_DATA = [
  { name: 'Kebersihan', value: 4500, color: '#10b981' }, // emerald-500
  { name: 'Keamanan', value: 3000, color: '#6366f1' },   // indigo-500
  { name: 'Sosial', value: 1500, color: '#f59e0b' },     // amber-500
  { name: 'Pembangunan', value: 1000, color: '#ec4899' }, // pink-500
];

const RECENT_TRANSACTIONS = [
  { id: 1, date: '25 Jul 12:30', amount: -50000, name: 'Iuran Kebersihan', method: 'Transfer BCA', category: 'Wajib', icon: Coffee, iconColor: 'text-amber-500', iconBg: 'bg-amber-100' },
  { id: 2, date: '26 Jul 15:00', amount: -150000, name: 'Sumbangan 17an', method: 'Tunai', category: 'Donasi', icon: ShoppingBag, iconColor: 'text-rose-500', iconBg: 'bg-rose-100' },
  { id: 3, date: '27 Jul 09:00', amount: -80000, name: 'Kas Bulanan', method: 'QRIS', category: 'Wajib', icon: Smartphone, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { id: 4, date: '28 Jul 19:45', amount: 2500000, name: 'Donasi Donatur', method: 'Transfer Mandiri', category: 'Pemasukan', icon: Youtube, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
];

const SAVING_GOALS = [
  { name: 'Renovasi Pos Kamling', target: 5000000, current: 1650000, color: 'bg-blue-500' },
  { name: 'Mobil Siaga', target: 150000000, current: 60000000, color: 'bg-emerald-500' },
  { name: 'Tenda Terop', target: 8000000, current: 250000, color: 'bg-indigo-500' },
];

import CctvPlayer from '@/components/CctvPlayer';

export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const { isDemo, status } = useTenant();
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // Quick Actions State
  const [quickActions, setQuickActions] = useState<QuickAction[]>(DEFAULT_QUICK_ACTIONS);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickAction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<QuickAction>>({});

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Masuk: Rp {payload[0].value.toLocaleString('id-ID')}
            </p>
            <p className="text-xs font-medium text-pink-500 dark:text-pink-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              Keluar: Rp {payload[1].value.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{payload[0].name}</p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Rp {payload[0].value.toLocaleString('id-ID')}
          </p>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (!status) return;
    fetchTodaySchedule();
  }, [status]);

  const handleEditClick = (action: QuickAction) => {
    setEditingAction(action);
    setFormData(action);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingAction(null);
    setFormData({
      title: '',
      subtitle: '',
      href: '/dashboard',
      iconName: 'LayoutGrid',
      color: 'blue'
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat mengubah shortcut dashboard');
      return;
    }
    if (!formData.title || !formData.href) return;
    
    if (editingAction) {
      setQuickActions(prev => prev.map(a => a.id === editingAction.id ? { ...a, ...formData } as QuickAction : a));
    } else {
      const newAction = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as QuickAction;
      setQuickActions(prev => [...prev, newAction]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setQuickActions(prev => prev.filter(a => a.id !== id));
  };

  const fetchTodaySchedule = async () => {
    const token = Cookies.get('admin_token');
    if (isDemo || !token) {
      const todayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
      setTodaySchedules([
        {
          id: 1,
          day_of_week: todayName,
          start_time: '22:00',
          end_time: '04:00',
          members: [
            { id: 1, user: { id: 1, name: 'Petugas 1' } },
            { id: 2, user: { id: 2, name: 'Petugas 2' } },
            { id: 3, user: { id: 3, name: 'Petugas 3' } }
          ],
          shift_name: 'Malam'
        }
      ]);
      setLoadingSchedule(false);
      return;
    }
    try {
      const response = await api.get('/patrols/today');
      if (response.data.success) {
        const data = response.data.data;
        setTodaySchedules(Array.isArray(data) ? data : (data ? [data] : []));
      }
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to fetch today schedule:', error);
      }
    } finally {
      setLoadingSchedule(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 min-h-screen bg-slate-50/50 dark:bg-[#11141D]">
      {/* HEADER SECTION */}
      <HeaderSection />

      {/* QUICK ACTIONS PREMIUM SAAS */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Aksi Cepat</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)}
            className={`${isEditing ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {isEditing ? <Check size={16} className="mr-2" /> : <Settings2 size={16} className="mr-2" />}
            {isEditing ? 'Selesai' : 'Atur Shortcut'}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = AVAILABLE_ICONS[action.iconName] || LayoutGrid;
            const colorClasses: any = {
              emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', groupHoverBg: 'group-hover:bg-emerald-500', ring: 'ring-emerald-100', groupHoverRing: 'group-hover:ring-emerald-500', titleHover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-400', arrow: 'text-emerald-500', shadow: 'hover:shadow-emerald-500/10', gradient: 'from-emerald-50/50' },
              blue: { bg: 'bg-blue-50', text: 'text-blue-600', groupHoverBg: 'group-hover:bg-blue-500', ring: 'ring-blue-100', groupHoverRing: 'group-hover:ring-blue-500', titleHover: 'group-hover:text-blue-700 dark:group-hover:text-blue-400', arrow: 'text-blue-500', shadow: 'hover:shadow-blue-500/10', gradient: 'from-blue-50/50' },
              amber: { bg: 'bg-amber-50', text: 'text-amber-600', groupHoverBg: 'group-hover:bg-amber-500', ring: 'ring-amber-100', groupHoverRing: 'group-hover:ring-amber-500', titleHover: 'group-hover:text-amber-700 dark:group-hover:text-amber-400', arrow: 'text-amber-500', shadow: 'hover:shadow-amber-500/10', gradient: 'from-amber-50/50' },
              purple: { bg: 'bg-purple-50', text: 'text-purple-600', groupHoverBg: 'group-hover:bg-purple-500', ring: 'ring-purple-100', groupHoverRing: 'group-hover:ring-purple-500', titleHover: 'group-hover:text-purple-700 dark:group-hover:text-purple-400', arrow: 'text-purple-500', shadow: 'hover:shadow-purple-500/10', gradient: 'from-purple-50/50' },
              rose: { bg: 'bg-rose-50', text: 'text-rose-600', groupHoverBg: 'group-hover:bg-rose-500', ring: 'ring-rose-100', groupHoverRing: 'group-hover:ring-rose-500', titleHover: 'group-hover:text-rose-700 dark:group-hover:text-rose-400', arrow: 'text-rose-500', shadow: 'hover:shadow-rose-500/10', gradient: 'from-rose-50/50' },
              indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', groupHoverBg: 'group-hover:bg-indigo-500', ring: 'ring-indigo-100', groupHoverRing: 'group-hover:ring-indigo-500', titleHover: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-400', arrow: 'text-indigo-500', shadow: 'hover:shadow-indigo-500/10', gradient: 'from-indigo-50/50' },
            }[action.color] || { bg: 'bg-emerald-50', text: 'text-emerald-600', groupHoverBg: 'group-hover:bg-emerald-500', ring: 'ring-emerald-100', groupHoverRing: 'group-hover:ring-emerald-500', titleHover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-400', arrow: 'text-emerald-500', shadow: 'hover:shadow-emerald-500/10', gradient: 'from-emerald-50/50' };

            return (
              <div key={action.id} className="relative group">
                <Link 
                  href={isEditing ? '#' : action.href} 
                  onClick={(e) => isEditing && e.preventDefault()}
                  className={`block relative bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl ${colorClasses.shadow} transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className={`p-3.5 rounded-xl ${colorClasses.bg} ${colorClasses.text} ${colorClasses.groupHoverBg} group-hover:text-white transition-all duration-300 shadow-sm ring-1 ${colorClasses.ring} ${colorClasses.groupHoverRing}`}>
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-slate-800 dark:text-white text-base mb-1 ${colorClasses.titleHover} transition-colors`}>{action.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{action.subtitle}</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                      <ArrowRight size={20} className={colorClasses.arrow} />
                    </div>
                  )}
                </Link>

                {isEditing && (
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                    <button 
                      onClick={() => handleEditClick(action)}
                      className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors border border-slate-100 dark:border-slate-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(action.id)}
                      className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-md hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 transition-colors border border-slate-100 dark:border-slate-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {isEditing && (
            <button 
              onClick={handleAddClick}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-300 group min-h-[160px]"
            >
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 group-hover:text-emerald-600 transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">Tambah Shortcut</span>
            </button>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAction ? 'Edit Shortcut' : 'Tambah Shortcut Baru'}</DialogTitle>
            <DialogDescription>
              Sesuaikan tampilan tombol akses cepat dashboard Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Judul</Label>
              <Input id="title" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} className="col-span-3 bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subtitle" className="text-right">Deskripsi</Label>
              <Input id="subtitle" value={formData.subtitle || ''} onChange={(e) => setFormData({...formData, subtitle: e.target.value})} className="col-span-3 bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="href" className="text-right">Link</Label>
              <Input id="href" value={formData.href || ''} onChange={(e) => setFormData({...formData, href: e.target.value})} className="col-span-3 bg-white dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Warna</Label>
              <div className="col-span-3 flex gap-2">
                {['emerald', 'blue', 'amber', 'purple', 'rose', 'indigo'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setFormData({...formData, color: c as QuickActionColor})}
                    className={`w-6 h-6 rounded-full border-2 ${formData.color === c ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c === 'emerald' ? '#10b981' : c === 'blue' ? '#3b82f6' : c === 'amber' ? '#f59e0b' : c === 'purple' ? '#a855f7' : c === 'rose' ? '#f43f5e' : '#6366f1' }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Icon</Label>
              <div className="col-span-3 grid grid-cols-6 gap-2">
                {Object.keys(AVAILABLE_ICONS).map((iconName) => {
                  const Icon = AVAILABLE_ICONS[iconName];
                  return (
                    <button
                      key={iconName}
                      onClick={() => setFormData({...formData, iconName})}
                      className={`p-1.5 rounded-lg border ${formData.iconName === iconName ? 'bg-slate-100 dark:bg-slate-800 border-slate-800 dark:border-slate-600 text-slate-900 dark:text-white' : 'border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSave}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DASHBOARD CONTROLS REMOVED */}

      {/* 1. STATS CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1: Total Balance */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-start mb-6">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide">Total Saldo Kas</span>
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-800">
              <ArrowUpRight size={18} className="text-slate-400 dark:text-slate-500" />
            </button>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">Rp 15.7jt</h3>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <ArrowUpRight size={12} strokeWidth={3} />
              12.1%
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">vs bulan lalu</span>
          </div>
        </div>

        {/* Card 2: Income */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-start mb-6">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide">Pemasukan</span>
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-800">
              <ArrowUpRight size={18} className="text-slate-400 dark:text-slate-500" />
            </button>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">Rp 8.5jt</h3>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <ArrowUpRight size={12} strokeWidth={3} />
              6.3%
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">vs bulan lalu</span>
          </div>
        </div>

        {/* Card 3: Expense */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-start mb-6">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide">Pengeluaran</span>
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-800">
              <ArrowUpRight size={18} className="text-slate-400 dark:text-slate-500" />
            </button>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">Rp 6.2jt</h3>
          <div className="flex items-center gap-2">
            <span className="bg-rose-50 text-rose-600 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <ArrowDownRight size={12} strokeWidth={3} />
              2.4%
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">vs bulan lalu</span>
          </div>
        </div>

        {/* Card 4: Total Savings / Warga */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-start mb-6">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide">Dana Darurat</span>
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-800">
              <ArrowUpRight size={18} className="text-slate-400 dark:text-slate-500" />
            </button>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">Rp 32.9jt</h3>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <ArrowUpRight size={12} strokeWidth={3} />
              12.1%
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">vs bulan lalu</span>
          </div>
        </div>

      </div>

      {/* 2. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Money Flow Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Arus Kas Bulanan</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Pemasukan
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Pengeluaran
              </div>
              <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900">
                <option>This year</option>
              </select>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONEY_FLOW_DATA} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={resolvedTheme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                  tickFormatter={(value) => `${value/1000}k`}
                />
                <Tooltip 
                  cursor={{fill: resolvedTheme === 'dark' ? '#1e293b' : '#f8fafc'}}
                  content={<CustomBarTooltip />}
                />
                <Bar dataKey="income" fill="#6366f1" radius={[6, 6, 6, 6]} barSize={16} />
                <Bar dataKey="expense" fill="#ec4899" radius={[6, 6, 6, 6]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Alokasi Dana</h3>
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-800">
              <ArrowUpRight size={18} className="text-slate-400 dark:text-slate-500" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <div className="h-[220px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={BUDGET_DATA}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {BUDGET_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">Total</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white">Rp 10jt</span>
              </div>
            </div>
            
            <div className="w-full mt-6 space-y-3">
              {BUDGET_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{Math.round((item.value / 10000) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 3. BOTTOM ROW: TRANSACTIONS & GOALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Transaksi Terakhir</h3>
            <div className="flex gap-2">
               <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900">
                <option>All accounts</option>
              </select>
              <button className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                See all
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-4 pl-2">Date</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4">Description</th>
                  <th className="pb-4">Method</th>
                  <th className="pb-4 pr-2">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {RECENT_TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 pl-2 text-sm font-bold text-slate-500 dark:text-slate-400">{tx.date}</td>
                    <td className={`py-4 text-sm font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                      {tx.amount > 0 ? '+' : ''}{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(tx.amount)}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${tx.iconBg} ${tx.iconColor}`}>
                          <tx.icon size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tx.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm font-medium text-slate-500 dark:text-slate-400">{tx.method}</td>
                    <td className="py-4 pr-2">
                      <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                        {tx.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* CCTV Widget */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Pantau CCTV</h3>
                <Link href="/dashboard/cctv" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-800">
                  <ArrowUpRight size={16} className="text-slate-400 dark:text-slate-500" />
                </Link>
             </div>
             <div className="rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-100/10">
                <CctvPlayer 
                  label="Gerbang Utama" 
                  isMini={true} 
                  src={isDemo ? 'https://placehold.co/800x600?text=Gerbang+Utama' : 'https://source.unsplash.com/random/800x600?gate'} 
                />
             </div>
          </div>

          {/* Jadwal Ronda Hari Ini */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col relative overflow-hidden group flex-1">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Coffee size={100} className="text-emerald-500 transform rotate-12" />
            </div>
            
             <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Jadwal Ronda</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Malam Ini ({todaySchedules.length > 0 ? todaySchedules[0].day_of_week : '...'})</p>
            </div>
            <Link href="/dashboard/jadwal-ronda" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-100 dark:border-slate-800 z-10">
              <ArrowUpRight size={18} className="text-slate-400 dark:text-slate-500" />
            </Link>
          </div>

          <div className="flex-1 relative z-10">
            {loadingSchedule ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : todaySchedules.length > 0 ? (
              <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {todaySchedules.map((schedule, idx) => (
                  <div key={schedule.id || idx} className="space-y-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                       <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-emerald-600 dark:text-emerald-400">
                         <Coffee size={20} />
                       </div>
                       <div>
                         <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                           {schedule.shift_name || 'Shift Malam'}
                         </p>
                         <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                           {(schedule.start_time || '').substring(0, 5)} - {(schedule.end_time || '').substring(0, 5)} WIB
                         </p>
                       </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Petugas ({schedule.members.length})</p>
                      {schedule.members.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {schedule.members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 rounded-xl transition-all shadow-sm hover:shadow-md">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                {member.user.name.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{member.user.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                         <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                            <p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada petugas</p>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                 <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                   <Coffee size={24} className="text-slate-300 dark:text-slate-600" />
                 </div>
                 <p className="text-slate-500 dark:text-slate-400 font-medium">Tidak ada jadwal ronda malam ini.</p>
              </div>
            )}
          </div>
          
          <Link href="/dashboard/jadwal-ronda" className="w-full mt-6 py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-sm font-bold hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 relative z-10 shadow-lg shadow-slate-900/10 dark:shadow-emerald-900/20">
             Lihat Semua Jadwal <ArrowRight size={16} />
          </Link>
        </div>
        </div>

      </div>
    </div>
  );
}
