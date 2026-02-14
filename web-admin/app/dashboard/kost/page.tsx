'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Users, 
  MapPin, 
  BedDouble,
  Home,
  UserCircle,
  X,
  Phone,
  Briefcase,
  Calendar,
  Edit2,
  Trash2,
  Upload
} from 'lucide-react';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

export default function KostPage() {
  const { isDemo, isExpired } = useTenant();
  const [activeTab, setActiveTab] = useState('kost');
  const [boardingHouses, setBoardingHouses] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false); // Kost Modal
  const [isPenghuniModalOpen, setIsPenghuniModalOpen] = useState(false); // Penghuni Modal
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data States
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_rooms: ''
  });

  const [tenantFormData, setTenantFormData] = useState({
    name: '',
    nik: '',
    gender: 'L',
    marital_status: 'LAJANG',
    phone: '',
    occupation: '',
    boarding_house_id: '',
    room_number: '',
    start_date: new Date().toISOString().split('T')[0],
    ktp_image: null as File | null
  });

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('admin_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boarding-houses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setBoardingHouses(result.data);
        
        // Flatten tenants for Tab 2
        const tenants: any[] = [];
        result.data.forEach((house: any) => {
          house.tenants.forEach((tenant: any) => {
            if (tenant.status === 'ACTIVE') {
              tenants.push({
                ...tenant,
                boarding_house_name: house.name,
                owner_name: house.owner.name,
                boarding_house_id: house.id
              });
            }
          });
        });
        setAllTenants(tenants);
      }
    } catch (error) {
      console.error('Failed to fetch boarding houses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for Kost Form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menambahkan kost');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!formData.name || !formData.address || !formData.total_rooms) {
      alert('Mohon lengkapi semua field');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = Cookies.get('admin_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boarding-houses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          total_rooms: parseInt(formData.total_rooms)
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        setFormData({ name: '', address: '', total_rooms: '' });
        fetchData();
      } else {
        alert(result.message || 'Gagal menambahkan kost');
      }
    } catch (error) {
      console.error('Error adding kost:', error);
      alert('Terjadi kesalahan saat menambahkan kost');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers for Tenant Form
  const handleTenantInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTenantFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTenantFormData(prev => ({ ...prev, ktp_image: e.target.files![0] }));
    }
  };

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast.error('Mode Demo: Menambah penghuni tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!tenantFormData.boarding_house_id || !tenantFormData.name || !tenantFormData.nik) {
      alert('Mohon lengkapi data wajib (Kost, Nama, NIK)');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = Cookies.get('admin_token');
      const formDataToSend = new FormData();
      formDataToSend.append('name', tenantFormData.name);
      formDataToSend.append('nik', tenantFormData.nik);
      formDataToSend.append('gender', tenantFormData.gender);
      formDataToSend.append('marital_status', tenantFormData.marital_status);
      formDataToSend.append('phone', tenantFormData.phone);
      formDataToSend.append('occupation', tenantFormData.occupation);
      formDataToSend.append('room_number', tenantFormData.room_number);
      formDataToSend.append('start_date', tenantFormData.start_date);
      if (tenantFormData.ktp_image) {
        formDataToSend.append('ktp_image', tenantFormData.ktp_image);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boarding-houses/${tenantFormData.boarding_house_id}/tenants`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      const result = await response.json();
      if (result.success) {
        setIsPenghuniModalOpen(false);
        // Reset form
        setTenantFormData({
          name: '',
          nik: '',
          gender: 'L',
          marital_status: 'LAJANG',
          phone: '',
          occupation: '',
          boarding_house_id: '',
          room_number: '',
          start_date: new Date().toISOString().split('T')[0],
          ktp_image: null
        });
        fetchData();
      } else {
        alert(result.message || 'Gagal menambahkan penghuni');
      }
    } catch (error) {
      console.error('Error adding tenant:', error);
      alert('Terjadi kesalahan saat menambahkan penghuni');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (houseId: number, tenantId: number) => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus penghuni');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus penghuni ini?')) return;

    try {
      const token = Cookies.get('admin_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boarding-houses/${houseId}/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        fetchData();
      } else {
        alert(result.message || 'Gagal menghapus penghuni');
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Terjadi kesalahan saat menghapus penghuni');
    }
  };

  const handleDeleteKost = async (id: number) => {
    if (isDemo) {
      toast.error('Mode Demo: Menghapus kost tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus data kost ini? Data penghuni terkait juga mungkin akan terhapus.')) return;

    try {
      const token = Cookies.get('admin_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boarding-houses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        fetchData();
      } else {
        alert(result.message || 'Gagal menghapus kost');
      }
    } catch (error) {
      console.error('Error deleting kost:', error);
      alert('Terjadi kesalahan saat menghapus kost');
    }
  };

  const filteredHouses = boardingHouses.filter((house: any) => 
    house.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    house.owner.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTenants = allTenants.filter((tenant: any) => 
    tenant.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.boarding_house_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen Kost</h1>
            <DemoLabel />
          </div>
          <p className="text-slate-500 dark:text-slate-400">Data Hunian Sewa & Penghuni Kost</p>
        </div>
        
        {/* Dynamic Button - Removed as per access control requirements */}
        {/* Only Warga/Juragan Kost can add/edit via Mobile App */}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('kost')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'kost' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Data Kost
        </button>
        <button
          onClick={() => setActiveTab('penghuni')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'penghuni' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Data Penghuni
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
        <input
          type="text"
          placeholder={activeTab === 'kost' ? "Cari nama kost atau pemilik..." : "Cari nama penghuni..."}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">Loading data...</div>
      ) : activeTab === 'kost' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHouses.map((house: any) => (
            <div key={house.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition">
                  <Home className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-center gap-2">
                   <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-medium">
                     {house.total_rooms} Kamar
                   </span>
                   <button
                      onClick={() => handleDeleteKost(house.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Hapus Kost"
                   >
                      <Trash2 size={16} />
                   </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{house.name}</h3>
              <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mb-4">
                <MapPin className="w-4 h-4 mr-1" />
                {house.address}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Pemilik</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{house.owner?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Penghuni Aktif</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{house.tenants?.length || 0} Orang</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Tab Data Penghuni Table
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Info Penghuni</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kontak</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lokasi Kost</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tgl Masuk</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredTenants.length > 0 ? (
                  filteredTenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-200 dark:border-emerald-800 overflow-hidden relative">
                             {tenant.user.photo_url || tenant.user.avatar ? (
                                <Image src={`http://localhost:8000${tenant.user.photo_url || tenant.user.avatar}`} alt={tenant.user.name} fill className="object-cover" />
                             ) : (
                                tenant.user.name.charAt(0)
                             )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{tenant.user.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{tenant.user.nik}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Phone size={14} className="text-slate-400 dark:text-slate-500" /> {tenant.user.phone || '-'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {tenant.user.occupation || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{tenant.boarding_house_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full w-fit mt-1">
                          Kamar {tenant.room_number || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                           {new Date(tenant.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          tenant.status === 'ACTIVE' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                        }`}>
                          {tenant.status === 'ACTIVE' ? 'Aktif' : 'Keluar'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                         <Users size={48} className="text-slate-200 dark:text-slate-700 mb-3" />
                         <p className="text-base font-medium text-slate-600 dark:text-slate-400">Belum ada data penghuni</p>
                         <p className="text-sm">Silakan tambahkan penghuni baru melalui tombol di atas.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Kost */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-800 dark:text-white">Tambah Kost Baru</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Kost</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Kost Bahagia"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Jl. Mawar No. 123, RT 01/02"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah Kamar</label>
                <input
                  type="number"
                  name="total_rooms"
                  value={formData.total_rooms}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="1"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Kost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Penghuni */}
      {isPenghuniModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/20">
              <h3 className="font-semibold text-slate-800 dark:text-white">Tambah Penghuni Baru</h3>
              <button 
                onClick={() => setIsPenghuniModalOpen(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleTenantSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Kolom Kiri - Data Diri */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Data Diri</h4>
                  
                  {/* Upload Foto Placeholder */}
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center">
                       {tenantFormData.ktp_image ? (
                         <div className="text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center gap-2">
                            <UserCircle size={20} />
                            {tenantFormData.ktp_image.name}
                         </div>
                       ) : (
                         <>
                            <Upload className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Upload Foto Profil / KTP</span>
                         </>
                       )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      name="name"
                      value={tenantFormData.name}
                      onChange={handleTenantInputChange}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NIK (Nomor Induk Kependudukan)</label>
                    <input
                      type="text"
                      name="nik"
                      value={tenantFormData.nik}
                      onChange={handleTenantInputChange}
                      maxLength={16}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
                        <select 
                          name="gender"
                          value={tenantFormData.gender}
                          onChange={handleTenantInputChange}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                        >
                           <option value="L">Laki-laki</option>
                           <option value="P">Perempuan</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status Pernikahan</label>
                        <select 
                          name="marital_status"
                          value={tenantFormData.marital_status}
                          onChange={handleTenantInputChange}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                        >
                           <option value="LAJANG">Lajang</option>
                           <option value="MENIKAH">Menikah</option>
                           <option value="CERAI">Cerai</option>
                        </select>
                     </div>
                  </div>
                </div>

                {/* Kolom Kanan - Kontak & Penempatan */}
                <div className="space-y-4">
                   <h4 className="font-medium text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Kontak & Penempatan</h4>
                   
                   <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor HP (WhatsApp)</label>
                    <input
                      type="tel"
                      name="phone"
                      value={tenantFormData.phone}
                      onChange={handleTenantInputChange}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                      placeholder="08..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pekerjaan</label>
                    <input
                      type="text"
                      name="occupation"
                      value={tenantFormData.occupation}
                      onChange={handleTenantInputChange}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Kost</label>
                    <select
                      name="boarding_house_id"
                      value={tenantFormData.boarding_house_id}
                      onChange={handleTenantInputChange}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                      required
                    >
                      <option value="">-- Pilih Kost --</option>
                      {boardingHouses.map((house: any) => (
                        <option key={house.id} value={house.id}>{house.name} ({house.total_rooms} Kamar)</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor Kamar</label>
                        <input
                          type="text"
                          name="room_number"
                          value={tenantFormData.room_number}
                          onChange={handleTenantInputChange}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                          placeholder="A1"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tgl Mulai Sewa</label>
                        <input
                          type="date"
                          name="start_date"
                          value={tenantFormData.start_date}
                          onChange={handleTenantInputChange}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                          required
                        />
                     </div>
                  </div>
                </div>

              </div>

              <div className="pt-6 mt-2 border-t border-slate-50 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-md shadow-emerald-200 dark:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Menyimpan Data Penghuni...
                    </>
                  ) : (
                    'Simpan Data Penghuni'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
