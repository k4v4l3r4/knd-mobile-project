'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Trash2, 
  Plus,
  Siren,
  ShieldCheck,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';

interface Alert {
  id: number;
  user_id: number;
  type: string;
  status: 'OPEN' | 'RESOLVED';
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  user: {
    id: number;
    name: string;
    phone: string;
  };
}

interface Contact {
  id: number;
  name: string;
  number: string;
  type: string;
}

export default function EmergencyPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Contact Form
  const [newContact, setNewContact] = useState({ name: '', number: '', type: 'POLISI' });
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // Modal States
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [alertToResolve, setAlertToResolve] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!status) return;
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [status]);

  const fetchData = async () => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const now = new Date();
        const isoNow = now.toISOString();
        const demoAlerts: Alert[] = [
          {
            id: 1,
            user_id: 1,
            type: 'PANIC_BUTTON',
            status: 'OPEN',
            latitude: -6.200000,
            longitude: 106.816666,
            created_at: isoNow,
            user: {
              id: 1,
              name: 'Budi Santoso',
              phone: '081234567801'
            }
          },
          {
            id: 2,
            user_id: 2,
            type: 'KEBAKARAN',
            status: 'RESOLVED',
            latitude: -6.2005,
            longitude: 106.817,
            created_at: isoNow,
            user: {
              id: 2,
              name: 'Siti Aminah',
              phone: '081234567802'
            }
          }
        ];
        const demoContacts: Contact[] = [
          { id: 1, name: 'Ketua RT 01', number: '081234567800', type: 'PENGURUS' },
          { id: 2, name: 'Satpam Kompleks', number: '081234567899', type: 'SATPAM' },
          { id: 3, name: 'Polsek Setempat', number: '110', type: 'POLISI' }
        ];
        setAlerts(demoAlerts);
        setContacts(demoContacts);
        setLoading(false);
        return;
      }
      const [alertsRes, contactsRes] = await Promise.all([
        api.get('/emergency-alerts'),
        api.get('/emergency-contacts')
      ]);
      setAlerts(alertsRes.data.data);
      setContacts(contactsRes.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching data:', error);
        toast.error('Gagal memuat data darurat');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async () => {
    if (!alertToResolve) return;

    if (isDemo) {
      toast.error('Mode Demo: Update status darurat tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/emergency-alerts/${alertToResolve}/resolve`);
      toast.success('Situasi telah ditandai aman');
      fetchData();
      setShowResolveModal(false);
    } catch (error) {
      toast.error('Gagal update status');
    } finally {
      setProcessing(false);
      setAlertToResolve(null);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast.error('Mode Demo: Tambah kontak darurat tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setSavingContact(true);
    try {
      await api.post('/emergency-contacts', newContact);
      toast.success('Kontak berhasil ditambahkan');
      setNewContact({ name: '', number: '', type: 'POLISI' });
      setIsAddingContact(false);
      fetchData();
    } catch (error) {
      toast.error('Gagal menambah kontak');
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;

    if (isDemo) {
      toast.error('Mode Demo: Kontak tidak dapat dihapus');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setProcessing(true);
    try {
      await api.delete(`/emergency-contacts/${contactToDelete}`);
      fetchData();
      toast.success('Kontak telah dihapus');
      setShowDeleteModal(false);
    } catch (error) {
      toast.error('Gagal menghapus kontak');
    } finally {
      setProcessing(false);
      setContactToDelete(null);
    }
  };

  const openMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
              <Siren className="text-rose-600 dark:text-rose-400 w-7 h-7" />
            </div>
            Safety Suite & Emergency
            <DemoLabel />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Monitor sinyal bahaya real-time dan kelola kontak darurat.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium border border-emerald-100 dark:border-emerald-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          System Operational
        </div>
      </div>

      {/* ACTIVE ALERTS SECTION */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          Monitor Bahaya (Live)
        </h2>
        
        {alerts.filter(a => a.status === 'OPEN').length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {alerts.filter(a => a.status === 'OPEN').map(alert => (
              <div key={alert.id} className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl shadow-rose-100/50 dark:shadow-none border border-rose-100 dark:border-rose-900/30 overflow-hidden hover:shadow-2xl hover:shadow-rose-200/50 dark:hover:shadow-rose-900/10 transition-all duration-300">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50/50 dark:bg-rose-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex items-start gap-6 w-full md:w-auto">
                    <div className="p-4 bg-rose-100 dark:bg-rose-900/30 rounded-2xl animate-pulse">
                      <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Badge className="bg-rose-600 hover:bg-rose-700 text-white border-0 px-3 py-1 text-sm">
                          DARURAT
                        </Badge>
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tracking-wider uppercase">
                          {new Date(alert.created_at).toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Sinyal Bahaya: {alert.type}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-slate-600 dark:text-slate-300 flex items-center gap-2 font-medium">
                          <span className="w-20 text-slate-400 font-normal">Pelapor</span>
                          {alert.user.name}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 flex items-center gap-2 font-medium">
                          <span className="w-20 text-slate-400 font-normal">Kontak</span>
                          {alert.user.phone}
                        </p>
                      </div>
                      
                      {alert.latitude && (
                        <Button 
                          variant="outline" 
                          className="mt-4 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl"
                          onClick={() => openMap(alert.latitude!, alert.longitude!)}
                        >
                          <MapPin className="w-4 h-4 mr-2" /> 
                          Lihat Lokasi Kejadian
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto flex flex-col gap-3">
                    <Button 
                      size="lg"
                      className="bg-rose-600 hover:bg-rose-700 text-white w-full md:w-auto rounded-xl shadow-lg shadow-rose-600/20 border-0 h-12 px-8 font-bold"
                      onClick={() => {
                        setAlertToResolve(alert.id);
                        setShowResolveModal(true);
                      }}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Tandai Situasi Aman
                    </Button>
                    <p className="text-xs text-center text-slate-400">
                      Tandai aman setelah situasi terkendali
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-emerald-100/50 dark:border-slate-800 rounded-[2rem] p-12 text-center flex flex-col items-center shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/20 transition-all duration-500"></div>
            
            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-lg shadow-emerald-100 dark:shadow-none border border-emerald-50 dark:border-slate-700 z-10 relative group-hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-[1.5rem] scale-90 animate-ping opacity-20"></div>
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
            </div>
            
            <h3 className="font-bold text-3xl text-slate-800 dark:text-white mb-3 z-10 tracking-tight">Situasi Aman</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto z-10 text-lg leading-relaxed">
              Tidak ada sinyal bahaya aktif yang terdeteksi dari warga saat ini. 
              Sistem monitoring berjalan normal.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RIWAYAT ALERT */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600 text-slate-500 dark:text-slate-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              Riwayat Insiden
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-12">Log aktivitas bahaya yang telah diselesaikan</p>
          </div>
          
          <div className="p-6 flex-1 bg-white dark:bg-slate-900">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {alerts.filter(a => a.status === 'RESOLVED').map(alert => (
                <div key={alert.id} className="flex justify-between items-start p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group">
                  <div className="flex gap-4">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-emerald-500 transition-colors"></div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white text-lg">{alert.type}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-col gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{alert.user.name}</span>
                        <span className="text-slate-400 dark:text-slate-500">
                          {new Date(alert.created_at).toLocaleDateString('id-ID', { 
                            weekday: 'long',
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    Resolved
                  </Badge>
                </div>
              ))}
              {alerts.filter(a => a.status === 'RESOLVED').length === 0 && (
                <div className="text-center text-slate-400 dark:text-slate-600 py-16 flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="font-medium">Belum ada riwayat insiden.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KONTAK DARURAT MANAGEMENT */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-row items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600 text-slate-500 dark:text-slate-300">
                  <Phone className="w-5 h-5" />
                </div>
                Nomor Penting
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-12">Kontak darurat yang muncul di aplikasi warga</p>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsAddingContact(!isAddingContact)}
              className={isAddingContact 
                ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 rounded-xl px-4"}
            >
              {isAddingContact ? 'Batal' : <><Plus className="w-4 h-4 mr-2" /> Tambah Kontak</>}
            </Button>
          </div>

          <div className="p-6 flex-1 bg-white dark:bg-slate-900">
            {isAddingContact && (
              <form onSubmit={handleAddContact} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[1.5rem] mb-6 space-y-5 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200">Tambah Kontak Baru</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Nama Kontak</Label>
                    <Input 
                      value={newContact.name} 
                      onChange={e => setNewContact({...newContact, name: e.target.value})}
                      required 
                      placeholder="Contoh: Polsek Terdekat"
                      className="rounded-xl border-slate-200 dark:border-slate-700 focus:ring-emerald-500 bg-white dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Kategori</Label>
                    <select 
                      className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newContact.type}
                      onChange={e => setNewContact({...newContact, type: e.target.value})}
                    >
                      <option value="POLISI">POLISI</option>
                      <option value="RS">RUMAH SAKIT</option>
                      <option value="DAMKAR">DAMKAR</option>
                      <option value="SECURITY">KEAMANAN</option>
                      <option value="LAINNYA">LAINNYA</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Nomor Telepon</Label>
                  <Input 
                    value={newContact.number} 
                    onChange={e => setNewContact({...newContact, number: e.target.value})}
                    placeholder="08..."
                    required 
                    className="rounded-xl border-slate-200 dark:border-slate-700 focus:ring-emerald-500 bg-white dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold shadow-lg shadow-emerald-600/20" disabled={savingContact}>
                  {savingContact ? 'Menyimpan...' : 'Simpan Kontak'}
                </Button>
              </form>
            )}

            <div className="space-y-3">
              {contacts.map(contact => (
                <div key={contact.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group bg-white dark:bg-slate-800/30 shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                      contact.type === 'POLISI' ? 'bg-blue-600 shadow-blue-600/20' :
                      contact.type === 'RS' ? 'bg-emerald-500 shadow-emerald-500/20' :
                      contact.type === 'DAMKAR' ? 'bg-orange-500 shadow-orange-500/20' :
                      'bg-slate-500 shadow-slate-500/20'
                    }`}>
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white text-lg">{contact.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-slate-500 dark:text-slate-400 font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{contact.number}</span>
                         <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">{contact.type}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"
                    onClick={() => {
                      setContactToDelete(contact.id);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="text-center text-slate-400 dark:text-slate-600 py-16 flex flex-col items-center">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                     <Phone className="w-8 h-8 opacity-20" />
                   </div>
                   <p className="font-medium">Belum ada kontak tersimpan.</p>
                   <p className="text-sm mt-1">Tambahkan kontak darurat untuk warga.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl scale-100 animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Tandai Situasi Aman?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Pastikan kondisi lapangan sudah benar-benar terkendali. Status akan diubah menjadi "Resolved".
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowResolveModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button 
                onClick={handleResolveAlert}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition shadow-lg shadow-green-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {processing ? 'Memproses...' : 'Ya, Aman'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl scale-100 animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Kontak?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Kontak ini akan hilang dari aplikasi warga dan tidak dapat dikembalikan.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button 
                onClick={handleDeleteContact}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition shadow-lg shadow-red-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {processing ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
