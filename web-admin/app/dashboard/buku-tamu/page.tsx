'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import axios from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { 
  Users, Search, Filter, Plus, Calendar, 
  MapPin, Phone, User, LogOut, Camera,
  BookOpen, Loader2, CheckCircle2, AlertCircle, X, Clock
} from 'lucide-react';

interface Guest {
  id: number;
  guest_name: string;
  guest_phone: string;
  origin: string;
  purpose: string;
  visit_date: string;
  id_card_photo: string | null;
  status: 'CHECK_IN' | 'CHECK_OUT';
  host: {
    id: number;
    name: string;
    address: string;
  } | null;
}

interface Warga {
  id: number;
  name: string;
  address: string;
}

const formatVisitTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatVisitDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_API_URL}/storage/${path}`;
};

const renderGuestRows = (
  loading: boolean,
  guests: Guest[],
  confirmCheckout: (id: number) => void
) => {
  try {
    if (loading) {
      return [...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
          </td>
          <td className="px-6 py-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
          </td>
          <td className="px-6 py-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24 ml-auto" />
          </td>
        </tr>
      ));
    }

    if (!Array.isArray(guests) || guests.length === 0) {
      return (
        <tr>
          <td
            colSpan={5}
            className="px-6 py-16 text-center text-slate-500 dark:text-slate-400"
          >
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-300 dark:text-slate-600">
                <Users size={32} />
              </div>
              <p className="font-medium">Belum ada data tamu hari ini.</p>
            </div>
          </td>
        </tr>
      );
    }

    const safeGuests = guests.filter(Boolean);

    return safeGuests.map((guest) => (
      <tr
        key={guest.id}
        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {guest.id_card_photo ? (
              <img
                src={getImageUrl(guest.id_card_photo) || ''}
                alt="Foto"
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="font-bold text-slate-800 dark:text-white text-[15px]">
                {guest.guest_name}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin size={10} />
                {guest.origin || '-'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          {guest.host ? (
            <div>
              <div className="text-sm text-slate-700 dark:text-slate-300 font-bold">
                {guest.host.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-slate-200 dark:border-slate-700">
                {guest.host.address || '-'}
              </div>
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              Tamu Umum
            </span>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate max-w-[150px] flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            {guest.purpose}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock size={14} className="text-emerald-500" />
            {formatVisitTime(guest.visit_date)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 pl-5">
            {formatVisitDate(guest.visit_date)}
          </div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              guest.status === 'CHECK_IN'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {guest.status === 'CHECK_IN' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Berkunjung
              </>
            ) : (
              <>
                <CheckCircle2 size={12} />
                Selesai
              </>
            )}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          {guest.status === 'CHECK_IN' && (
            <button
              onClick={() => confirmCheckout(guest.id)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg transition-colors font-bold text-xs border border-rose-100 dark:border-rose-800 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Check Out
            </button>
          )}
        </td>
      </tr>
    ));
  } catch (error) {
    console.error('GuestBookPage render error', error, guests);
    return (
      <tr>
        <td
          colSpan={5}
          className="px-6 py-16 text-center text-slate-500 dark:text-slate-400"
        >
          Terjadi kesalahan saat menampilkan data tamu
        </td>
      </tr>
    );
  }
};

export default function GuestBookPage() {
  const { isDemo, isExpired } = useTenant();
  const { user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [wargas, setWargas] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    origin: '',
    purpose: '',
    host_user_id: '',
    id_card_photo: null as File | null
  });

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [guestToCheckout, setGuestToCheckout] = useState<number | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetchGuests();
    fetchWargas();
  }, []);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/guest-books');
      const raw = response?.data?.data;
      const list = Array.isArray(raw) ? raw : [];

      if (!Array.isArray(raw)) {
        console.error('Unexpected /guest-books payload', response?.data);
      }

      setGuests(list as Guest[]);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast.error('Gagal memuat data tamu');
    } finally {
      setLoading(false);
    }
  };

  const fetchWargas = async () => {
    try {
      const response = await axios.get('/warga?per_page=1000'); // Get all warga
      const raw = response?.data?.data;
      const list = Array.isArray(raw) ? raw : [];

      if (!Array.isArray(raw)) {
        console.error('Unexpected /warga payload', response?.data);
      }

      setWargas(list as Warga[]);
    } catch (error) {
      console.error('Error fetching warga:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
      toast.error('Mode Demo: Input tamu baru tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    
    if (!formData.guest_name || !formData.purpose) {
      toast.error('Nama dan Keperluan wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('guest_name', formData.guest_name);
      data.append('purpose', formData.purpose);
      data.append('visit_date', new Date().toISOString()); // Current time
      
      if (formData.guest_phone) data.append('guest_phone', formData.guest_phone);
      if (formData.origin) data.append('origin', formData.origin);
      if (formData.host_user_id) data.append('host_user_id', formData.host_user_id);
      if (formData.id_card_photo) data.append('id_card_photo', formData.id_card_photo);

      await axios.post('/guest-books', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Tamu berhasil dicatat');
      setFormData({
        guest_name: '',
        guest_phone: '',
        origin: '',
        purpose: '',
        host_user_id: '',
        id_card_photo: null
      });
      fetchGuests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCheckout = (id: number) => {
    setGuestToCheckout(id);
    setCheckoutModalOpen(true);
  };

  const handleCheckout = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Checkout tamu tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!guestToCheckout) return;
    setIsCheckingOut(true);
    try {
      await axios.post(`/guest-books/${guestToCheckout}/checkout`);
      toast.success('Tamu berhasil di-checkout');
      fetchGuests();
      setCheckoutModalOpen(false);
    } catch (error) {
      toast.error('Gagal memproses check out');
    } finally {
      setIsCheckingOut(false);
      setGuestToCheckout(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <BookOpen size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <BookOpen size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Buku Tamu Digital</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Catat dan pantau tamu yang berkunjung ke lingkungan RT secara real-time.
           </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form (Left Column) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden sticky top-8">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Input Tamu Baru
                </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Nama Tamu *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="Nama Lengkap"
                  value={formData.guest_name}
                  onChange={e => setFormData({...formData, guest_name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">No. HP / Telp</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="08..."
                  value={formData.guest_phone}
                  onChange={e => setFormData({...formData, guest_phone: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Asal / Alamat</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="Kota atau Instansi"
                  value={formData.origin}
                  onChange={e => setFormData({...formData, origin: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Tujuan (Warga)</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={formData.host_user_id}
                  onChange={e => setFormData({...formData, host_user_id: e.target.value})}
                >
                  <option value="">-- Tamu Umum / Pos Satpam --</option>
                  {(Array.isArray(wargas) ? wargas : []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.address || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Keperluan *</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 min-h-[80px]"
                  placeholder="Contoh: Mengantar Paket, Bertamu, dll"
                  value={formData.purpose}
                  onChange={e => setFormData({...formData, purpose: e.target.value})}
                  required
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Foto KTP / Wajah</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 group w-full justify-center border-dashed border-2">
                    <Camera className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Pilih Foto</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          setFormData({...formData, id_card_photo: e.target.files[0]});
                        }
                      }}
                    />
                  </label>
                </div>
                  {formData.id_card_photo && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-100 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-2">
                        <CheckCircle2 size={14} />
                        <span className="truncate">{formData.id_card_photo.name}</span>
                        <button 
                            type="button" 
                            onClick={() => setFormData({...formData, id_card_photo: null})}
                            className="ml-auto text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300"
                        >
                            <X size={14} />
                        </button>
                    </div>
                  )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
              >
                {submitting ? <Loader2 className="animate-spin" /> : 'Catat Masuk (Check In)'}
              </button>
            </form>
          </div>
        </div>

        {/* Guest List (Right Column) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Riwayat Kunjungan
              </h2>
              <div className="flex gap-2">
                 <div className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    Total: <span className="text-slate-800 dark:text-white font-bold">{Array.isArray(guests) ? guests.length : 0}</span>
                 </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tamu</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tujuan</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Waktu</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {renderGuestRows(loading, guests, confirmCheckout)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- CHECKOUT CONFIRMATION MODAL --- */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Konfirmasi Check Out</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Apakah tamu ini sudah meninggalkan lokasi?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? <Loader2 className="animate-spin w-5 h-5" /> : 'Ya, Check Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
