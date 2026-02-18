'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  QrCode, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  ArrowLeft,
  Save,
  X,
  Download,
  Printer,
  MapPinned
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';

interface RondaLocation {
  id: number;
  rt_id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  qr_token: string;
  token_expires_at: string;
}

export default function RondaLokasiPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [locations, setLocations] = useState<RondaLocation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentLocation, setCurrentLocation] = useState<RondaLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meter: 50
  });

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrLocation, setSelectedQrLocation] = useState<RondaLocation | null>(null);

  useEffect(() => {
    if (!status) return;
    void fetchLocations();
  }, [status, fetchLocations]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const adminToken = Cookies.get('admin_token');
      if (isDemo || !adminToken) {
        const now = new Date();
        const isoNow = now.toISOString();
        const demoLocations: RondaLocation[] = [
          {
            id: 1,
            rt_id: 1,
            name: 'Pos Ronda Utama',
            latitude: -6.200000,
            longitude: 106.816666,
            radius_meter: 50,
            qr_token: 'DEMO_QR_TOKEN_POS_UTAMA',
            token_expires_at: isoNow,
          },
          {
            id: 2,
            rt_id: 1,
            name: 'Pos Ronda Blok C',
            latitude: -6.201000,
            longitude: 106.817500,
            radius_meter: 40,
            qr_token: 'DEMO_QR_TOKEN_BLOK_C',
            token_expires_at: isoNow,
          },
        ];
        setLocations(demoLocations);
        setLoading(false);
        return;
      }
      const response = await api.get('/ronda-locations');
      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching locations:', error);
        toast.error('Gagal memuat data lokasi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setForm({
      name: '',
      latitude: '',
      longitude: '',
      radius_meter: 50
    });
    setShowModal(true);
  };

  const handleOpenEdit = (loc: RondaLocation) => {
    setModalMode('edit');
    setCurrentLocation(loc);
    setForm({
      name: loc.name,
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      radius_meter: loc.radius_meter
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan lokasi');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!form.name || !form.latitude || !form.longitude) {
      toast.error('Mohon lengkapi semua field');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meter: form.radius_meter
      };

      if (modalMode === 'create') {
        const response = await api.post('/ronda-locations', payload);
        if (response.data.success) {
          toast.success('Lokasi berhasil ditambahkan');
        }
      } else {
        if (!currentLocation) return;
        const response = await api.put(`/ronda-locations/${currentLocation.id}`, payload);
        if (response.data.success) {
          toast.success('Lokasi berhasil diperbarui');
        }
      }
      setShowModal(false);
      fetchLocations();
    } catch (error: unknown) {
      console.error('Error saving location:', error);
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ) {
        toast.error(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menyimpan lokasi'
        );
      } else {
        toast.error('Gagal menyimpan lokasi');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus lokasi');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus lokasi ini?')) return;

    try {
      const response = await api.delete(`/ronda-locations/${id}`);
      if (response.data.success) {
        toast.success('Lokasi berhasil dihapus');
        fetchLocations();
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Gagal menghapus lokasi');
    }
  };

  const handleRefreshQr = async (id: number) => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat memperbarui QR');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    try {
      const response = await api.post(`/ronda-locations/${id}/refresh-qr`);
      if (response.data.success) {
        toast.success('QR Code berhasil diperbarui');
        // Update local state
        setLocations(prev => prev.map(loc => 
          loc.id === id ? { ...loc, qr_token: response.data.qr_token, token_expires_at: response.data.token_expires_at } : loc
        ));
        
        // If viewing QR for this location, update it
        if (selectedQrLocation?.id === id) {
          setSelectedQrLocation(prev => prev ? { ...prev, qr_token: response.data.qr_token } : null);
        }
      }
    } catch (error) {
      console.error('Error refreshing QR:', error);
      toast.error('Gagal memperbarui QR Code');
    }
  };

  const openQrModal = (loc: RondaLocation) => {
    setSelectedQrLocation(loc);
    setShowQrModal(true);
  };

  const downloadQR = () => {
    if (!selectedQrLocation) return;
    
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR-Ronda-${selectedQrLocation.name}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('QR Code berhasil diunduh');
    }
  };

  const printQR = () => {
    if (!selectedQrLocation) return;
    
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const windowContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print QR - ${selectedQrLocation.name}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .card {
                border: 2px solid #000;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                max-width: 400px;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              h1 {
                margin: 20px 0 10px;
                font-size: 24px;
              }
              p {
                margin: 0;
                color: #666;
              }
              .footer {
                margin-top: 20px;
                font-size: 12px;
                color: #999;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="${pngUrl}" alt="QR Code" />
              <h1>${selectedQrLocation.name}</h1>
              <p>Scan untuk Absensi Ronda</p>
              <div class="footer">
                RT Online SuperApp
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `;
      
      const printWindow = window.open('', '', 'width=600,height=600');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(windowContent);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <MapPin size={120} className="text-emerald-600 dark:text-emerald-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/jadwal-ronda" className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
              <ArrowLeft size={24} className="text-slate-600 dark:text-slate-300" />
            </Link>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <MapPin size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Lokasi Pos Ronda</h1>
            <DemoLabel />
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg">
            Kelola titik lokasi pos ronda dan QR Code untuk absensi petugas.
          </p>
        </div>
        <div className="relative z-10 flex gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-600/20 font-medium"
          >
            <Plus size={18} />
            <span>Tambah Lokasi</span>
          </button>
        </div>
      </div>

      {/* Location List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))
        ) : locations.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            Belum ada lokasi ronda yang ditambahkan.
          </div>
        ) : (
          locations.map((loc) => (
            <div key={loc.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                  <MapPin size={24} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openQrModal(loc)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                    title="Lihat QR Code"
                  >
                    <QrCode size={18} />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(loc)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(loc.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{loc.name}</h3>
              <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1 mb-4">
                <p>Lat: {loc.latitude}</p>
                <p>Long: {loc.longitude}</p>
                <p>Radius: {loc.radius_meter} meter</p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <MapPinned size={14} />
                  <span>Lihat di Google Maps</span>
                </button>

                <div className="flex justify-between items-center text-xs">
                  <div className="text-slate-400">
                    QR Expired: {new Date(loc.token_expires_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleRefreshQr(loc.id)}
                    className="flex items-center gap-1.5 font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <RefreshCw size={14} />
                    Refresh Token
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {modalMode === 'create' ? 'Tambah Lokasi' : 'Edit Lokasi'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lokasi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Contoh: Pos Ronda Utama"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={e => setForm({...form, latitude: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="-6.123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={e => setForm({...form, longitude: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="106.123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Radius (Meter)</label>
                <input
                  type="number"
                  value={form.radius_meter}
                  onChange={e => setForm({...form, radius_meter: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              
              <div className="pt-2 text-xs text-slate-500">
                <p>Tips: Gunakan Google Maps untuk mendapatkan koordinat Latitude dan Longitude yang akurat.</p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-600/20 font-medium disabled:opacity-50"
              >
                {saving ? (
                  <>Menyimpan...</>
                ) : (
                  <>
                    <Save size={18} />
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && selectedQrLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700 text-center">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
               <h3 className="font-bold text-lg text-slate-800 dark:text-white">QR Absensi</h3>
               <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600">
                 <X size={20} />
               </button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-inner mb-4">
                <QRCodeCanvas 
                  id="qr-code-canvas"
                  value={selectedQrLocation.qr_token} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white mb-1">{selectedQrLocation.name}</h4>
              <p className="text-sm text-slate-500 mb-6">Scan QR ini untuk melakukan absensi</p>
              
              <div className="grid grid-cols-2 gap-3 w-full mb-3">
                <button 
                  onClick={downloadQR}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium text-sm"
                >
                  <Download size={16} />
                  Download
                </button>
                <button 
                  onClick={printQR}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>

              <button 
                onClick={() => handleRefreshQr(selectedQrLocation.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-sm font-medium border border-emerald-100 dark:border-emerald-900"
              >
                <RefreshCw size={14} />
                Refresh QR Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
