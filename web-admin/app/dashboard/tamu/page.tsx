'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  User,
  X,
  ZoomIn,
  Check,
  Loader2,
  Filter
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

interface Guest {
  id: number;
  guest_name: string;
  guest_nik: string;
  relation: string;
  visit_date: string;
  duration_days: number;
  photo_url: string;
  status: 'REPORTED' | 'CHECKED' | 'CHECK_IN' | 'CHECK_OUT';
  created_at: string;
  host: {
    id: number;
    name: string;
  };
}

export default function GuestBookPage() {
  const { isDemo, isExpired } = useTenant();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const response = await api.get('/guest-books');
      setGuests(response.data.data);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast.error('Gagal memuat data buku tamu');
    } finally {
      setLoading(false);
    }
  };

  const confirmCheck = async () => {
    if (!selectedGuestId) return;

    if (isDemo) {
        toast.error('Mode Demo: Konfirmasi tamu tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }
    
    setProcessing(true);
    try {
      await api.put(`/guest-books/${selectedGuestId}`, { status: 'CHECKED' });
      
      // Optimistic update
      setGuests(guests.map(g => 
        g.id === selectedGuestId ? { ...g, status: 'CHECKED' } : g
      ));
      
      toast.success('Status tamu diperbarui');
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal memperbarui status');
    } finally {
      setProcessing(false);
      setSelectedGuestId(null);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return 'https://placehold.co/100x100?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${path}`;
  };

  const filteredGuests = guests.filter(guest => 
    guest.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.host.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 p-4 md:p-8 font-sans pb-24 transition-colors duration-300">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                Buku Tamu Digital
              </h1>
              <DemoLabel />
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
              Monitoring warga yang melaporkan tamu menginap
            </p>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Cari nama tamu atau tuan rumah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none w-full md:w-80 transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden p-8 space-y-6">
             {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="flex gap-4 animate-pulse">
                 <div className="h-12 w-12 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
                 <div className="flex-1 space-y-2">
                    <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-1/4"></div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-1/3"></div>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-8 py-5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Tamu</th>
                    <th className="px-6 py-5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Tuan Rumah</th>
                    <th className="px-6 py-5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Waktu Menginap</th>
                    <th className="px-6 py-5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Foto</th>
                    <th className="px-6 py-5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-10 h-10 text-slate-300 dark:text-slate-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Tidak ada data tamu ditemukan</p>
                          <p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada warga yang melaporkan tamu</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-800 dark:text-white text-base">{guest.guest_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">NIK: {guest.guest_nik || '-'}</div>
                          <div className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            {guest.relation}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white dark:ring-slate-800">
                              {guest.host.name.charAt(0)}
                            </div>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{guest.host.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <span>{new Date(guest.visit_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{guest.duration_days || 1} Hari</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="relative group/img w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                            <img 
                              src={getImageUrl(guest.photo_url)} 
                              alt={guest.guest_name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                              onClick={() => setSelectedImage(getImageUrl(guest.photo_url))}
                            />
                            <div 
                              className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              onClick={() => setSelectedImage(getImageUrl(guest.photo_url))}
                            >
                              <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {(guest.status === 'CHECKED' || guest.status === 'CHECK_OUT') ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {guest.status === 'CHECK_OUT' ? 'Sudah Check-out' : 'Sudah Dicek'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800 shadow-sm animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Perlu Verifikasi
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          {(guest.status === 'REPORTED' || guest.status === 'CHECK_IN') && (
                            <button
                              onClick={() => {
                                setSelectedGuestId(guest.id);
                                setShowConfirmModal(true);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:shadow-emerald-300 dark:hover:shadow-emerald-900/40 transform hover:-translate-y-0.5"
                            >
                              <Check size={14} strokeWidth={3} />
                              Verifikasi
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
             {filteredGuests.length > 0 && (
                <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                   Menampilkan {filteredGuests.length} data tamu
                </div>
             )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={selectedImage} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400 shadow-sm ring-4 ring-emerald-50/50 dark:ring-emerald-900/20">
                <CheckCircle size={32} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Verifikasi Data Tamu?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Pastikan data tamu sudah sesuai. Status akan diubah menjadi <span className="font-bold text-emerald-600 dark:text-emerald-400">"Sudah Dicek"</span>.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmCheck}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:shadow-emerald-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Ya, Verifikasi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
