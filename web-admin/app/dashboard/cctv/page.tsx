'use client';

import React, { useState, useEffect } from 'react';
import CctvPlayer from '@/components/CctvPlayer';
import { Cctv, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';

interface CctvData {
  id: number;
  label: string;
  stream_url: string;
  location?: string;
  is_active: boolean;
}

export default function CctvPage() {
  const { isExpired, isDemo, status } = useTenant();
  const [cameras, setCameras] = useState<CctvData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!status) return;
    fetchCctvs();
  }, [status]);

  const fetchCctvs = async () => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoCameras: CctvData[] = [
          {
            id: 1,
            label: 'Pos Ronda Utama',
            stream_url: 'https://example.com/stream-cctv-1',
            location: 'Gerbang Utama RT 01',
            is_active: true
          },
          {
            id: 2,
            label: 'Gang Selatan',
            stream_url: 'https://example.com/stream-cctv-2',
            location: 'Gang Selatan Blok B',
            is_active: true
          },
          {
            id: 3,
            label: 'Taman Bermain',
            stream_url: 'https://example.com/stream-cctv-3',
            location: 'Taman Bermain Warga',
            is_active: false
          }
        ];
        const activeDemo = demoCameras.filter((c) => c.is_active);
        setCameras(activeDemo);
        setLoading(false);
        return;
      }
      const response = await axios.get('/cctvs');
      const activeCameras = response.data.data.filter((c: CctvData) => c.is_active);
      setCameras(activeCameras);
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching CCTVs:', error);
        toast.error('Gagal memuat data CCTV');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-rose-100 dark:bg-rose-900/30 p-6 rounded-full mb-6">
          <ShieldCheck size={48} className="text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Akses Terbatas
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
          Masa aktif layanan telah berakhir. Silakan perpanjang langganan Anda untuk kembali mengakses fitur monitoring CCTV.
        </p>
      </div>
    );
  }

  // REMOVED BLOCK: Allow viewing CCTV UI in DEMO mode (Read Only)
  // if (isDemo) {
  //   return (
  //     <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
  //        ...
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
            <Cctv size={28} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Monitoring Lingkungan</h1>
              <DemoLabel />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Pantau keamanan lingkungan RT secara real-time</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold text-sm flex items-center gap-2 border border-emerald-100 dark:border-emerald-800">
                <ShieldCheck size={18} />
                <span>System Normal</span>
            </div>
        </div>
      </div>

      {/* Grid Cameras */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : cameras.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {cameras.map((cam) => (
            <CctvPlayer 
              key={cam.id} 
              label={cam.label} 
              location={cam.location}
              status={'online'} 
              src={cam.stream_url}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cctv className="text-slate-400 dark:text-slate-500" size={32} />
          </div>
          <h3 className="text-slate-600 dark:text-slate-300 font-bold text-lg">Belum ada CCTV Aktif</h3>
          <p className="text-slate-400 dark:text-slate-500 max-w-md mx-auto mt-2">
            Silakan tambahkan data CCTV melalui menu Pengaturan &gt; CCTV untuk mulai memantau.
          </p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
        <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm">Pemberitahuan Privasi</h4>
            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                Akses CCTV ini hanya diperuntukkan bagi warga terverifikasi. Dilarang menyebarluaskan rekaman tanpa izin pengurus RT/RW setempat sesuai peraturan yang berlaku.
            </p>
        </div>
      </div>
    </div>
  );
}
