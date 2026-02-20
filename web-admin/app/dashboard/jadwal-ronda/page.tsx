'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Users, Calendar, Edit, Save, X, Moon, Check, Copy, Trash2, MapPin, Settings, FileText } from 'lucide-react';
import Link from 'next/link';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';

interface User {
  id: number;
  name: string;
  phone: string;
}

interface Participant {
  id: number;
  user: User;
  status: 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED';
  attendance_at: string | null;
  is_fined: boolean;
  fine_amount: number;
  notes: string | null;
}

interface RondaSchedule {
  id: number;
  schedule_type: 'DAILY' | 'WEEKLY';
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  shift_name?: string;
  status: 'ACTIVE' | 'INACTIVE';
  participants: Participant[];
}

export default function JadwalRondaPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [schedule, setSchedule] = useState<RondaSchedule | null>(null);
  const [schedules, setSchedules] = useState<RondaSchedule[]>([]);
  const [wargaList, setWargaList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    schedule_type: 'WEEKLY' as 'DAILY' | 'WEEKLY',
    start_date: '',
    end_date: '',
    start_time: '22:00',
    end_time: '04:00',
    shift_name: 'Group A',
  });
  const [batchMode, setBatchMode] = useState(false);
  const [groups, setGroups] = useState<{ name: string; officers: number[] }[]>([{ name: 'Group A', officers: [] }]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  // Attendance Modal State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [attendanceForm, setAttendanceForm] = useState({
    status: 'PENDING' as 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED',
    notes: '',
    fine_amount: 0
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredWarga = wargaList.filter(warga => {
    const name = (warga.name || '').toLowerCase();
    const phone = warga.phone || '';

    if (!normalizedSearch) {
      return true;
    }

    return name.includes(normalizedSearch) || phone.includes(normalizedSearch);
  });

  useEffect(() => {
    if (!status) return;
    fetchData();
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoWarga: User[] = [
          { id: 1, name: 'Budi Santoso', phone: '081234567801' },
          { id: 2, name: 'Siti Aminah', phone: '081234567802' },
          { id: 3, name: 'Andi Wijaya', phone: '081234567803' },
          { id: 4, name: 'Rina Putri', phone: '081234567804' }
        ];
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const end = new Date(today);
        end.setDate(end.getDate() + 6);
        const endDate = end.toISOString().split('T')[0];
        const demoSchedule: RondaSchedule = {
          id: 1,
          schedule_type: 'WEEKLY',
          start_date: startDate,
          end_date: endDate,
          start_time: '22:00',
          end_time: '04:00',
          shift_name: 'Group A',
          status: 'ACTIVE',
          participants: [
            {
              id: 1,
              user: demoWarga[0],
              status: 'PRESENT',
              attendance_at: new Date().toISOString(),
              is_fined: false,
              fine_amount: 0,
              notes: null
            },
            {
              id: 2,
              user: demoWarga[1],
              status: 'PENDING',
              attendance_at: null,
              is_fined: false,
              fine_amount: 0,
              notes: null
            },
            {
              id: 3,
              user: demoWarga[2],
              status: 'ABSENT',
              attendance_at: null,
              is_fined: true,
              fine_amount: 50000,
              notes: 'Tidak hadir tanpa konfirmasi'
            },
            {
              id: 4,
              user: demoWarga[3],
              status: 'EXCUSED',
              attendance_at: null,
              is_fined: false,
              fine_amount: 0,
              notes: 'Izin karena dinas luar kota'
            }
          ]
        };
        setSchedule(demoSchedule);
        setSchedules([demoSchedule]);
        setWargaList(demoWarga);
        setLoading(false);
        return;
      }
      const [schedRes, wargaRes] = await Promise.all([
        api.get('/ronda-schedules'),
        api.get('/warga', { params: { all: true } })
      ]);

      if (schedRes.data.success) {
        setSchedule(schedRes.data.data);
        setSchedules(schedRes.data.all_schedules || (schedRes.data.data ? [schedRes.data.data] : []));
      }
      if (wargaRes.data.success) {
        const raw = wargaRes.data.data;
        const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setWargaList(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching data:', error);
        toast.error('Gagal memuat jadwal ronda');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDate = (startDate: string, type: 'DAILY' | 'WEEKLY') => {
    if (!startDate) return '';
    const date = new Date(startDate);
    if (type === 'WEEKLY') {
      date.setDate(date.getDate() + 6);
    }
    // For DAILY, start_date = end_date, so no change needed
    return date.toISOString().split('T')[0];
  };

  const handleTypeChange = (type: 'DAILY' | 'WEEKLY') => {
    const endDate = calculateEndDate(form.start_date, type);
    setForm(prev => ({
      ...prev,
      schedule_type: type,
      end_date: endDate
    }));
  };

  const handleStartDateChange = (date: string) => {
    if (!date) {
      setForm(prev => ({ ...prev, start_date: '', end_date: '' }));
      return;
    }
    
    const endDate = calculateEndDate(date, form.schedule_type);
    
    setForm(prev => ({
      ...prev,
      start_date: date,
      end_date: endDate
    }));
  };

  const openCreateModal = () => {
    if (isDemo) {
      toast.error('Mode Demo: Buat jadwal tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    setModalMode('create');
    setSelectedUserIds([]);
    setBatchMode(false);
    setGroups([{ name: 'Group A', officers: [] }]);
    setActiveGroupIndex(0);
    setForm({
      schedule_type: 'WEEKLY',
      start_date: '',
      end_date: '',
      start_time: '22:00',
      end_time: '04:00',
      shift_name: 'Group A',
    });
    setShowModal(true);
  };

  const openEditModal = (targetSchedule: RondaSchedule) => {
    setSchedule(targetSchedule);
    setModalMode('edit');
    setSelectedUserIds(targetSchedule.participants.map(p => p.user.id));
    setForm({
      schedule_type: targetSchedule.schedule_type,
      start_date: targetSchedule.start_date,
      end_date: targetSchedule.end_date,
      start_time: targetSchedule.start_time?.substring(0,5) || '22:00',
      end_time: targetSchedule.end_time?.substring(0,5) || '04:00',
      shift_name: targetSchedule.shift_name || '',
    });
    setShowModal(true);
  };

  const handleUserToggle = (userId: number) => {
    if (batchMode) {
      setGroups(prev => {
        const next = [...prev];
        const g = next[activeGroupIndex];
        if (!g) return prev;
        g.officers = g.officers.includes(userId)
          ? g.officers.filter(id => id !== userId)
          : [...g.officers, userId];
        return next;
      });
    } else {
      setSelectedUserIds(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleSave = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan jadwal');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    setSaving(true);
    try {
      if (modalMode === 'create') {
        if (!form.start_date) {
          toast.error('Tanggal mulai wajib diisi');
          return;
        }
        if (batchMode) {
          const payloads = groups.map(g => ({
            schedule_type: form.schedule_type,
            start_date: form.start_date,
            start_time: form.start_time,
            end_time: form.end_time,
            officers: g.officers,
            status: 'ACTIVE',
            shift_name: g.name
          }));
          const results = [];
          for (const p of payloads) {
            const res = await api.post('/ronda-schedules', p);
            results.push(res);
          }
          const successCount = results.filter(r => r.data?.success).length;
          if (successCount > 0) {
            toast.success(`Berhasil membuat ${successCount} jadwal (${form.schedule_type === 'DAILY' ? 'Harian' : 'Mingguan'})`);
          } else {
            toast.error('Gagal membuat jadwal');
          }
        } else {
          const res = await api.post('/ronda-schedules', {
            schedule_type: form.schedule_type,
            start_date: form.start_date,
            start_time: form.start_time,
            end_time: form.end_time,
            officers: selectedUserIds,
            status: 'ACTIVE',
            shift_name: form.shift_name
          });
          if (res.data.success) {
            toast.success(`Jadwal ${form.schedule_type === 'DAILY' ? 'Harian' : 'Mingguan'} berhasil dibuat`);
          } else {
            toast.error(res.data.message || 'Gagal membuat jadwal');
          }
        }
      } else {
        if (!schedule) return;
        const res = await api.patch(`/ronda-schedules/${schedule.id}`, {
          start_time: form.start_time,
          end_time: form.end_time,
          officers: selectedUserIds
        });
        if (res.data.success) {
          toast.success('Jadwal berhasil diperbarui');
        } else {
          toast.error(res.data.message || 'Gagal memperbarui jadwal');
        }
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      const msg = (error as any)?.response?.data?.message || 'Gagal menyimpan perubahan';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Jadwal tidak dapat disalin');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!form.start_date) {
      toast.error('Isi tanggal mulai');
      return;
    }
    try {
      const res = await api.post('/ronda-schedules/clone', {
        start_date: form.start_date
      });
      if (res.data.success) {
        toast.success('Berhasil menyalin jadwal sebelumnya');
        fetchData();
      } else {
        toast.error(res.data.message || 'Gagal menyalin jadwal');
      }
    } catch (error) {
      const msg = (error as any)?.response?.data?.message || 'Gagal menyalin jadwal';
      toast.error(msg);
    }
  };

  const handleDelete = async (scheduleId: number) => {
    if (isDemo) {
      toast.error('Mode Demo: Jadwal tidak dapat dihapus');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal ini? Data yang dihapus tidak dapat dikembalikan.')) return;

    try {
      const res = await api.delete(`/ronda-schedules/${scheduleId}`);
      if (res.data.success) {
        toast.success('Jadwal berhasil dihapus');
        if (schedule?.id === scheduleId) {
            setSchedule(null);
        }
        fetchData();
      } else {
        toast.error(res.data.message || 'Gagal menghapus jadwal');
      }
    } catch (error) {
      const msg = (error as any)?.response?.data?.message || 'Gagal menghapus jadwal';
      toast.error(msg);
    }
  };

  const openAttendanceModal = (participant: Participant, parentSchedule: RondaSchedule) => {
    setSchedule(parentSchedule);
    setSelectedParticipant(participant);
    setAttendanceForm({
      status: participant.status || 'PENDING',
      notes: participant.notes || '',
      fine_amount: participant.fine_amount || 0
    });
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Absensi tidak dapat diubah');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!schedule || !selectedParticipant) return;
    setSaving(true);
    try {
      const res = await api.put(`/ronda-schedules/${schedule.id}/attendance/${selectedParticipant.user.id}`, {
        status: attendanceForm.status,
        notes: attendanceForm.notes,
        fine_amount: attendanceForm.fine_amount
      });

      if (res.data.success) {
        toast.success('Status kehadiran berhasil diperbarui');
        setShowAttendanceModal(false);
        fetchData(); // Refresh data to show new status
      } else {
        toast.error(res.data.message || 'Gagal memperbarui status');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      const msg = (error as any)?.response?.data?.message || 'Gagal menyimpan perubahan';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const infoRow = (label: string, value: string) => (
    <div className="flex items-center gap-3 text-sm font-medium p-2.5 rounded-xl w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-300">
      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
        <Moon size={14} />
      </div>
      <span className="font-bold text-emerald-800 dark:text-emerald-300">{label}:</span>
      <span>{value}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-emerald-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Jadwal Ronda</h1>
            <DemoLabel />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Atur jadwal jaga malam warga (7 Hari)</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link 
            href="/dashboard/jadwal-ronda/pengaturan-denda"
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Settings size={16} /> Atur Denda
          </Link>
          <Link 
            href="/dashboard/jadwal-ronda/denda"
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <FileText size={16} /> Laporan Denda
          </Link>
          <Link 
            href="/dashboard/jadwal-ronda/lokasi"
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <MapPin size={16} /> Lokasi & QR Code
          </Link>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
          >
            Buat Jadwal
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select 
            value={form.schedule_type}
            onChange={(e) => handleTypeChange(e.target.value as 'DAILY' | 'WEEKLY')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="WEEKLY">Mingguan</option>
            <option value="DAILY">Harian</option>
          </select>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          />
          <input
            type="date"
            value={form.end_date}
            readOnly
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
          />
          <button
            onClick={handleClone}
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 flex items-center gap-2"
          >
            <Copy size={16} /> Salin Jadwal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {schedules.length === 0 ? (
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">Belum Ada Jadwal</p>
          </div>
        ) : (
          schedules.map(schedule => (
            <div key={schedule.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <div className="p-4 border-b border-emerald-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-xs uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/50">
                    {schedule.schedule_type === 'DAILY' ? 'Harian' : 'Mingguan'}
                  </span>
                  <span>
                    {schedule.shift_name ? `${schedule.shift_name} - ` : ''}
                    {new Date(schedule.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                    {schedule.schedule_type === 'WEEKLY' && ` - ${new Date(schedule.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    {schedule.schedule_type === 'DAILY' && `, ${new Date(schedule.start_date).getFullYear()}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDelete(schedule.id)}
                    className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                    title="Hapus Jadwal"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => openEditModal(schedule)}
                    className="p-2.5 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors text-emerald-700 dark:text-emerald-400"
                    title="Edit Jadwal"
                  >
                    <Edit size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {infoRow('Jam Ronda', `${schedule.start_time?.substring(0,5)} - ${schedule.end_time?.substring(0,5)}`)}
                <div className="mt-2">
                  {schedule.participants.length > 0 ? (
                    <ul className="space-y-2">
                      {schedule.participants.map((member) => (
                        <li 
                          key={member.id} 
                          onClick={() => openAttendanceModal(member, schedule)}
                          className="flex items-center justify-between gap-3 text-sm font-medium p-3 rounded-xl border transition-all bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
                              {member.user.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{member.user.name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{member.user.phone}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {member.is_fined && (
                              <div className="px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-center gap-1">
                                <span>Rp {member.fine_amount.toLocaleString('id-ID')}</span>
                              </div>
                            )}
                            
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                              member.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              member.status === 'ABSENT' ? 'bg-red-50 text-red-700 border-red-200' :
                              member.status === 'EXCUSED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {member.status === 'PRESENT' && <Check size={14} />}
                              {member.status === 'ABSENT' && <X size={14} />}
                              {member.status === 'PENDING' && <Moon size={14} />}
                              <span>
                                {member.status === 'PRESENT' ? 'Hadir' :
                                 member.status === 'ABSENT' ? 'Absen' :
                                 member.status === 'EXCUSED' ? 'Izin' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                      <Users size={24} className="mb-2 opacity-30" />
                      <span>Belum ada petugas</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-[2.5rem]">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-emerald-600 dark:text-emerald-500" />
                {modalMode === 'create' ? 'Buat Jadwal' : 'Edit Jadwal'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {modalMode === 'create' && (
                <div className="mb-4">
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Tipe Jadwal</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="schedule_type"
                        value="WEEKLY"
                        checked={form.schedule_type === 'WEEKLY'}
                        onChange={() => handleTypeChange('WEEKLY')}
                        className="w-4 h-4 text-emerald-600 accent-emerald-600"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Mingguan</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="schedule_type"
                        value="DAILY"
                        checked={form.schedule_type === 'DAILY'}
                        onChange={() => handleTypeChange('DAILY')}
                        className="w-4 h-4 text-emerald-600 accent-emerald-600"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Harian</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Mode Pembuatan</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBatchMode(false)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${!batchMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                  >
                    Satu Jadwal
                  </button>
                  <button
                    onClick={() => setBatchMode(true)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${batchMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                  >
                    Beberapa Jadwal (Grup)
                  </button>
                </div>
              </div>

              {!batchMode ? (
                <div className="mb-4">
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Nama Grup</label>
                  <input
                    type="text"
                    value={form.shift_name}
                    onChange={(e) => setForm({ ...form, shift_name: e.target.value })}
                    placeholder="Contoh: Group A"
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              ) : (
                <div className="mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">Daftar Grup</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const nextName = `Group ${String.fromCharCode(65 + groups.length)}`;
                          setGroups([...groups, { name: nextName, officers: [] }]);
                          setActiveGroupIndex(groups.length);
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Tambah Grup
                      </button>
                      {groups.length > 1 && (
                        <button
                          onClick={() => {
                            const next = [...groups];
                            next.splice(activeGroupIndex, 1);
                            setGroups(next);
                            setActiveGroupIndex(0);
                          }}
                          className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700"
                        >
                          Hapus Grup
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveGroupIndex(idx)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${activeGroupIndex === idx ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Nama Grup Aktif</label>
                    <input
                      type="text"
                      value={groups[activeGroupIndex]?.name || ''}
                      onChange={(e) => {
                        const next = [...groups];
                        next[activeGroupIndex] = { ...next[activeGroupIndex], name: e.target.value };
                        setGroups(next);
                      }}
                      className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">Tanggal Mulai</label>
                  <input 
                    type="date" 
                    value={form.start_date}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {form.schedule_type === 'DAILY' ? 'Tanggal Akhir' : 'Tanggal Akhir (+6 Hari)'}
                  </label>
                  <input 
                    type="date" 
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">Jam Mulai</label>
                  <input 
                    type="time" 
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">Jam Selesai</label>
                  <input 
                    type="time" 
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mb-4">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari petugas..." 
                  className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {filteredWarga.map((warga) => (
                  <label 
                    key={warga.id} 
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      (batchMode ? groups[activeGroupIndex]?.officers.includes(warga.id) : selectedUserIds.includes(warga.id)) 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        (batchMode ? groups[activeGroupIndex]?.officers.includes(warga.id) : selectedUserIds.includes(warga.id)) ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {warga.name.charAt(0)}
                      </div>
                      <div>
                        <div className={`font-medium ${(batchMode ? groups[activeGroupIndex]?.officers.includes(warga.id) : selectedUserIds.includes(warga.id)) ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}`}>
                          {warga.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{warga.phone}</div>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      (batchMode ? groups[activeGroupIndex]?.officers.includes(warga.id) : selectedUserIds.includes(warga.id)) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {(batchMode ? groups[activeGroupIndex]?.officers.includes(warga.id) : selectedUserIds.includes(warga.id)) && <Check size={14} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={batchMode ? groups[activeGroupIndex]?.officers.includes(warga.id) : selectedUserIds.includes(warga.id)}
                      onChange={() => handleUserToggle(warga.id)}
                    />
                  </label>
                ))}
                
                {filteredWarga.length === 0 && (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 flex flex-col items-center">
                    <Users size={32} className="mb-2 opacity-50" />
                    <p>Tidak ada petugas ditemukan</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-[2.5rem] flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                {saving ? 'Menyimpan...' : (
                  <>
                    <Save size={18} /> Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedParticipant && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-[2.5rem]">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Users size={20} className="text-emerald-600 dark:text-emerald-500" />
                Update Kehadiran
              </h3>
              <button onClick={() => setShowAttendanceModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
                  {selectedParticipant.user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{selectedParticipant.user.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{selectedParticipant.user.phone}</div>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Status Kehadiran</label>
                <div className="grid grid-cols-2 gap-2">
                  {['PRESENT', 'ABSENT', 'EXCUSED', 'PENDING'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setAttendanceForm(prev => ({ ...prev, status: status as any }))}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        attendanceForm.status === status
                          ? status === 'PRESENT' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200' :
                            status === 'ABSENT' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-200' :
                            status === 'EXCUSED' ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200' :
                            'bg-slate-100 border-slate-200 text-slate-700 ring-1 ring-slate-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      {status === 'PRESENT' ? 'Hadir' : status === 'ABSENT' ? 'Absen' : status === 'EXCUSED' ? 'Izin' : 'Pending'}
                    </button>
                  ))}
                </div>
              </div>

              {attendanceForm.status === 'ABSENT' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Denda (Rp)</label>
                  <input
                    type="number"
                    value={attendanceForm.fine_amount}
                    onChange={(e) => setAttendanceForm(prev => ({ ...prev, fine_amount: parseInt(e.target.value) || 0 }))}
                    className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Default denda: Rp 50.000</p>
                </div>
              )}

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2 block">Catatan (Opsional)</label>
                <textarea
                  value={attendanceForm.notes}
                  onChange={(e) => setAttendanceForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Tambahkan catatan..."
                  className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[80px]"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-[2.5rem] flex justify-end gap-3">
              <button 
                onClick={() => setShowAttendanceModal(false)}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                {saving ? 'Menyimpan...' : (
                  <>
                    <Save size={18} /> Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CheckCircleIcon removed
