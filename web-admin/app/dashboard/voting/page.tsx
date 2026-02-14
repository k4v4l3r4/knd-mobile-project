'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  BarChart2, 
  Calendar, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  X,
  PieChart
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import api from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PollOption {
  id: number;
  name: string;
  description: string;
  image_url: string;
  vote_count: number;
  percentage: number;
}

interface Poll {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  total_votes: number;
  options: PollOption[];
}

export default function VotingPage() {
  const { isDemo, isExpired } = useTenant();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pollToDelete, setPollToDelete] = useState<{id: number, title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  const [options, setOptions] = useState<{name: string, description: string, image_url: string}[]>([
    { name: '', description: '', image_url: '' },
    { name: '', description: '', image_url: '' }
  ]);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const response = await api.get('/polls');
      setPolls(response.data.data);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Gagal memuat data voting');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, { name: '', description: '', image_url: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.error('Minimal 2 kandidat/opsi.');
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleOptionChange = (index: number, field: keyof typeof options[0], value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat membuat voting');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!formData.title || !formData.start_date || !formData.end_date || options.some(opt => !opt.name.trim())) {
      toast.error('Harap lengkapi judul, tanggal, dan nama kandidat.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/polls', {
        ...formData,
        status: 'OPEN', // Default to OPEN for now
        options
      });
      toast.success('Voting berhasil dibuat!');
      setIsCreating(false);
      resetForm();
      fetchPolls();
    } catch (error: any) {
      console.error('Create Poll Error:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat voting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: number, title: string) => {
    setPollToDelete({ id, title });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!pollToDelete) return;
    
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus voting');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/polls/${pollToDelete.id}`);
      setPolls(prev => prev.filter(p => p.id !== pollToDelete.id));
      toast.success('Voting berhasil dihapus');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error('Gagal menghapus voting');
    } finally {
      setIsDeleting(false);
      setPollToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
    });
    setOptions([
      { name: '', description: '', image_url: '' },
      { name: '', description: '', image_url: '' }
    ]);
  };

  const renderChart = (poll: Poll) => {
    const data = {
      labels: poll.options.map(opt => opt.name),
      datasets: [
        {
          label: 'Jumlah Suara',
          data: poll.options.map(opt => opt.vote_count),
          backgroundColor: [
            'rgba(5, 150, 105, 0.8)',  // Emerald 600 (Darker Green)
            'rgba(14, 165, 233, 0.6)',  // Sky
            'rgba(99, 102, 241, 0.6)',  // Indigo
            'rgba(245, 158, 11, 0.6)',  // Amber
            'rgba(239, 68, 68, 0.6)',   // Rose
            'rgba(139, 92, 246, 0.6)',  // Violet
          ],
          borderColor: [
            'rgba(4, 120, 87, 1)',      // Emerald 700 (Darker Border)
            'rgba(14, 165, 233, 1)',
            'rgba(99, 102, 241, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(139, 92, 246, 1)',
          ],
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 40,
        },
      ],
    };

    return (
      <div className="h-64 w-full flex items-center justify-center">
        <Bar 
          data={data} 
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
              y: { 
                beginAtZero: true, 
                ticks: { stepSize: 1, font: { family: 'inherit' } },
                grid: { display: true, color: '#f1f5f9' },
                border: { display: false }
              },
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { family: 'inherit', weight: 'bold' } }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                cornerRadius: 12,
                titleFont: { family: 'inherit', size: 14 },
                bodyFont: { family: 'inherit', size: 13 },
                displayColors: false,
              }
            }
          }} 
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
             <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
               <div className="space-y-3">
                 <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                 <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
               </div>
             </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-80 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Toaster position="top-right" />

      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <BarChart2 size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <BarChart2 size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Voting & Pemilihan</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola pemungutan suara warga dan monitor hasil secara real-time.
           </p>
         </div>
         <div className="relative z-10 w-full md:w-auto">
            <button 
              onClick={() => setIsCreating(!isCreating)} 
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 ${
                isCreating 
                  ? "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700" 
                  : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
              }`}
            >
              {isCreating ? (
                <>
                  <X className="w-5 h-5" />
                  Batal
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" /> 
                  Buat Voting Baru
                </>
              )}
            </button>
         </div>
      </div>

      {/* --- CREATE FORM --- */}
      {isCreating && (
        <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/20 shadow-xl shadow-emerald-100/50 dark:shadow-none rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20 px-8 py-6">
            <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">Buat Voting Baru</h2>
            <p className="text-emerald-600/80 dark:text-emerald-500/80 mt-1">Isi detail voting dan tambahkan kandidat/opsi.</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Judul Voting</label>
                  <input 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Contoh: Pemilihan Ketua RT 01"
                    required
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Deskripsi (Opsional)</label>
                  <input 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Keterangan singkat..."
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Mulai</label>
                  <input 
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Selesai</label>
                  <input 
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-lg font-bold text-slate-800 dark:text-white">Kandidat / Opsi Pilihan</label>
                  <button 
                    type="button" 
                    onClick={handleAddOption} 
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Tambah Kandidat
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {options.map((opt, index) => (
                    <div key={index} className="p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-700 relative group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                      <button 
                        type="button" 
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"
                        onClick={() => handleRemoveOption(index)}
                        disabled={options.length <= 2}
                        title="Hapus Opsi"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-12">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Kandidat / Opsi</label>
                          <input 
                            value={opt.name}
                            onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                            placeholder={`Kandidat ${index + 1}`}
                            required
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all placeholder-slate-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Visi Misi / Keterangan</label>
                          <input 
                            value={opt.description}
                            onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                            placeholder="Visi misi singkat..."
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all placeholder-slate-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">URL Foto (Opsional)</label>
                          <input 
                            value={opt.image_url}
                            onChange={(e) => handleOptionChange(index, 'image_url', e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all placeholder-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Publikasikan Voting'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POLL LIST --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {polls.map((poll) => (
          <div key={poll.id} className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col">
            <div className="px-8 pt-8 pb-4 bg-gradient-to-b from-slate-50/80 dark:from-slate-800/80 to-transparent border-b border-slate-50 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {poll.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>
                      {format(new Date(poll.start_date), 'dd MMM yyyy', { locale: idLocale })} - {format(new Date(poll.end_date), 'dd MMM yyyy', { locale: idLocale })}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  poll.status === 'OPEN' 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {poll.status === 'OPEN' ? 'Sedang Berjalan' : 'Selesai'}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2 leading-relaxed h-10">
                {poll.description || 'Tidak ada deskripsi tambahan.'}
              </p>
            </div>
            
            <div className="p-8">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 relative mb-6">
                 {renderChart(poll)}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800">
                    <Users className="w-4 h-4" />
                    {poll.total_votes} Suara
                  </div>
                </div>
                <button 
                  onClick={() => confirmDelete(poll.id, poll.title)}
                  className="flex items-center gap-2 px-4 py-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl font-bold text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {!loading && polls.length === 0 && !isCreating && (
          <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
              <PieChart className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Belum ada voting aktif</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
              Buat voting baru untuk memulai pemungutan suara warga secara digital dan transparan.
            </p>
            <button 
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              + Buat Voting Pertama
            </button>
          </div>
        )}
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && pollToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full mx-auto mb-6">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">Hapus Voting?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
              Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-800 dark:text-white">"{pollToDelete.title}"</span>? 
              <br/>Semua data suara akan hilang permanen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-5 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
