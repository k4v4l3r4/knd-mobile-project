'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  Edit, 
  Plus, 
  Trash2, 
  UserPlus, 
  Shield, 
  X,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

// Interfaces
interface User {
  id: number;
  name: string;
  phone: string;
}

interface Participant {
  id: number;
  schedule_id: number;
  user_id: number;
  status: string;
  user: User;
}

interface Schedule {
  id: number;
  rt_id: number;
  day: string;
  shift_name: string | null;
  participants: Participant[];
}

interface Warga {
  id: number;
  name: string;
  nik: string;
  phone: string;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function RondaPage() {
  const { isDemo, isExpired } = useTenant();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [selectedWargaId, setSelectedWargaId] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, wargaRes] = await Promise.all([
        api.get('/ronda-schedules'),
        api.get('/warga') // Assuming this endpoint exists and returns all warga
      ]);

      if (schedRes.data.success) {
        setSchedules(schedRes.data.data);
      }
      if (wargaRes.data.success) {
        setWargaList(wargaRes.data.data.data || wargaRes.data.data); // Handle pagination structure if needed
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data jadwal ronda');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (day: string) => {
    setSelectedDay(day);
    const existingSchedule = schedules.find(s => s.day === day);
    
    if (existingSchedule) {
      setCurrentSchedule(existingSchedule);
      setIsModalOpen(true);
    } else {
      // Create schedule first if it doesn't exist
      setModalLoading(true);
      try {
        const response = await api.post('/ronda-schedules', {
          day: day,
          rt_id: 1, // Assuming RT ID 1 for now or handled by backend auth
          shift_name: 'Malam'
        });
        if (response.data.success) {
          const newSchedule = { ...response.data.data, participants: [] };
          setSchedules(prev => [...prev, newSchedule]);
          setCurrentSchedule(newSchedule);
          setIsModalOpen(true);
        }
      } catch (error) {
        console.error('Error creating schedule:', error);
        toast.error('Gagal membuat jadwal baru');
      } finally {
        setModalLoading(false);
      }
    }
  };

  const handleAddParticipant = async () => {
    if (!currentSchedule || !selectedWargaId) return;

    setModalLoading(true);
    try {
      const response = await api.post(`/ronda-schedules/${currentSchedule.id}/assign`, {
        user_id: selectedWargaId
      });

      if (response.data.success) {
        toast.success('Warga berhasil ditambahkan ke jadwal');
        // Refresh schedules to get updated list
        const schedRes = await api.get('/ronda-schedules');
        if (schedRes.data.success) {
          setSchedules(schedRes.data.data);
          // Update current schedule in modal
          const updatedSchedule = schedRes.data.data.find((s: Schedule) => s.id === currentSchedule.id);
          if (updatedSchedule) setCurrentSchedule(updatedSchedule);
        }
        setSelectedWargaId('');
      }
    } catch (error: any) {
      console.error('Error assigning warga:', error);
      toast.error(error.response?.data?.message || 'Gagal menambahkan warga');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmRemoveParticipant = (userId: number) => {
    setParticipantToDelete(userId);
    setDeleteModalOpen(true);
  };

  const handleRemoveParticipant = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus petugas');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!currentSchedule || !participantToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await api.delete(`/ronda-schedules/${currentSchedule.id}/remove/${participantToDelete}`);
      
      if (response.data.success) {
        toast.success('Petugas berhasil dihapus');
        // Refresh schedules
        const schedRes = await api.get('/ronda-schedules');
        if (schedRes.data.success) {
          setSchedules(schedRes.data.data);
          const updatedSchedule = schedRes.data.data.find((s: Schedule) => s.id === currentSchedule.id);
          if (updatedSchedule) setCurrentSchedule(updatedSchedule);
        }
        setDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Gagal menghapus petugas');
    } finally {
      setIsDeleting(false);
      setParticipantToDelete(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <Shield size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Jadwal Ronda</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola jadwal keamanan lingkungan mingguan dan penugasan warga.
           </p>
         </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-lg w-1/2"></div>
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl w-full"></div>
                <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl w-full"></div>
                <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DAYS.map((day) => {
            const schedule = schedules.find(s => s.day === day);
            const participants = schedule?.participants || [];

            return (
              <div key={day} className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-full hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 group">
                {/* Card Header */}
                <div className="bg-slate-50/50 dark:bg-slate-700/30 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    {day}
                  </h3>
                  <button 
                    onClick={() => handleEditClick(day)}
                    className="p-2 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all shadow-sm active:scale-95"
                    title="Kelola Petugas"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 bg-white dark:bg-slate-800">
                  {participants.length > 0 ? (
                    <ul className="space-y-3">
                      {participants.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 group-hover:border-emerald-100/50 dark:group-hover:border-emerald-900/30 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 font-bold text-sm">
                            {p.user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{p.user.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.user.phone}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-8 text-sm">
                      <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                      </div>
                      <p className="font-medium">Belum ada petugas</p>
                      <button 
                        onClick={() => handleEditClick(day)}
                        className="mt-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline text-xs"
                      >
                        + Tambah Petugas
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Card Footer Summary */}
                <div className="bg-slate-50 dark:bg-slate-700/30 px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <span>Total Petugas</span>
                  <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm text-slate-700 dark:text-slate-300">
                    {participants.length}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Kelola Petugas - {selectedDay}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Add Participant Form */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tambah Petugas Baru</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedWargaId}
                      onChange={(e) => setSelectedWargaId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm appearance-none transition-all text-slate-800 dark:text-white"
                      disabled={modalLoading}
                    >
                      <option value="">Pilih Warga...</option>
                      {wargaList.map(w => (
                        <option key={w.id} value={w.id}>{w.name} - {w.phone}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <UserPlus size={16} />
                    </div>
                  </div>
                  <button
                    onClick={handleAddParticipant}
                    disabled={!selectedWargaId || modalLoading}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                  >
                    {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Tambah
                  </button>
                </div>
              </div>

              {/* List of Current Participants */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Petugas Bertugas</h4>
                   <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                     {currentSchedule?.participants?.length || 0} Orang
                   </span>
                </div>
                
                {currentSchedule?.participants && currentSchedule.participants.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {currentSchedule.participants.map((p) => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                            {p.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.user.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{p.user.phone}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => confirmRemoveParticipant(p.user.id)}
                          disabled={modalLoading}
                          className="p-2 text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus Petugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Belum ada petugas terdaftar</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-white rounded-xl transition-all font-bold shadow-sm"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Hapus Petugas?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Apakah Anda yakin ingin menghapus petugas ini dari jadwal?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleRemoveParticipant}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
