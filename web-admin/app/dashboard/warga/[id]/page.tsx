'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Phone, 
  CreditCard, 
  Calendar, 
  Briefcase, 
  Home, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Save, 
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Warga {
  id: number;
  name: string;
  nik: string;
  phone: string;
  address: string | null;
  role: string;
  rt_id: number | null;
  rw_id: number | null;
  kk_number: string | null;
  gender: 'L' | 'P' | null;
  place_of_birth: string | null;
  date_of_birth: string | null;
  religion: string | null;
  marital_status: string | null;
  occupation: string | null;
  status_in_family: string | null;
  address_ktp: string | null;
  ktp_image_path: string | null;
  kk_image_path: string | null;
  family?: Warga[];
}

const formatBirthDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const calculateAge = (value: string | null) => {
  if (!value) return '-';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 0) return '0 Tahun';
  return `${age} Tahun`;
};

export default function WargaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [warga, setWarga] = useState<Warga | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingMember, setEditingMember] = useState<Warga | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form State for Adding Family Member
  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    kk_number: '',
    phone: '',
    address: '',
    address_ktp: '',
    gender: 'L',
    place_of_birth: '',
    date_of_birth: '',
    religion: 'ISLAM',
    marital_status: 'BELUM_KAWIN',
    occupation: '',
    status_in_family: '', // Intentionally empty to force selection
  });
  
  const [addressSame, setAddressSame] = useState(true);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [kkFile, setKkFile] = useState<File | null>(null);

  useEffect(() => {
    if (id) {
      fetchWargaDetail();
    }
  }, [id]);

  const fetchWargaDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/warga/${id}`);
      if (response.data.success) {
        setWarga(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching warga detail:', err);
      toast.error('Gagal memuat detail warga');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFamilyMember = () => {
    if (!warga) return;

    setModalMode('add');
    setEditingMember(null);

    // PRE-FILL DATA from Head of Family
    setFormData({
      name: '',
      nik: '',
      kk_number: warga.kk_number || '', // Auto-fill KK
      phone: '', // Empty for family member
      address: warga.address || '', // Auto-fill Address
      address_ktp: warga.address_ktp || '',
      gender: 'L',
      place_of_birth: '',
      date_of_birth: '',
      religion: warga.religion || 'ISLAM', // Likely same religion
      marital_status: 'BELUM_KAWIN',
      occupation: '',
      status_in_family: 'ANAK', // Default suggestion
    });
    
    // Address logic
    if (warga.address === warga.address_ktp) {
        setAddressSame(true);
    } else {
        setAddressSame(false);
    }
    
    setIsModalOpen(true);
  };

  const handleEditFamilyMember = (member: Warga) => {
    setEditingMember(member);
    setModalMode('edit');

    setFormData({
      name: member.name || '',
      nik: member.nik || '',
      kk_number: member.kk_number || warga?.kk_number || '',
      phone: member.phone || '',
      address: member.address || warga?.address || '',
      address_ktp: member.address_ktp || member.address || '',
      gender: member.gender || 'L',
      place_of_birth: member.place_of_birth || '',
      date_of_birth: member.date_of_birth || '',
      religion: member.religion || 'ISLAM',
      marital_status: member.marital_status || 'BELUM_KAWIN',
      occupation: member.occupation || '',
      status_in_family: member.status_in_family || '',
    });

    if (member.address && member.address_ktp && member.address === member.address_ktp) {
      setAddressSame(true);
    } else {
      setAddressSame(false);
    }

    setKtpFile(null);
    setKkFile(null);
    setIsModalOpen(true);
  };

  const handleDeleteFamilyMember = async (member: Warga) => {
    if (!window.confirm(`Hapus anggota keluarga "${member.name}"?`)) return;

    try {
      await api.delete(`/warga/${member.id}`);
      toast.success('Anggota keluarga berhasil dihapus');
      fetchWargaDetail();
    } catch (err) {
      console.error('Error deleting family member:', err);
      toast.error('Gagal menghapus anggota keluarga');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'address_ktp') { 
          data.append(key, value);
        }
      });
      
      if (addressSame) {
        data.append('address_ktp', formData.address);
      } else {
        data.append('address_ktp', formData.address_ktp);
      }
      
      if (ktpFile) data.append('ktp_image', ktpFile);
      if (kkFile) data.append('kk_image', kkFile);
      
      if (warga?.rt_id) data.append('rt_id', String(warga.rt_id));
      if (warga?.rw_id) data.append('rw_id', String(warga.rw_id));

      if (modalMode === 'add') {
        await api.post('/warga', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Anggota keluarga berhasil ditambahkan');
      } else if (editingMember) {
        data.append('_method', 'PUT');
        await api.post(`/warga/${editingMember.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Data anggota keluarga berhasil diperbarui');
      }
      
      setIsModalOpen(false);
      fetchWargaDetail();
    } catch (err: any) {
      console.error('Error saving family member:', err);
      const msg = err.response?.data?.message || 'Gagal menyimpan data anggota keluarga.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!warga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Data Warga Tidak Ditemukan</h3>
        <p className="text-slate-500 mb-6">Data yang Anda cari mungkin telah dihapus atau tidak tersedia.</p>
        <button 
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors flex items-center"
        >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button 
        onClick={() => router.push('/dashboard/warga')}
        className="flex items-center text-slate-500 hover:text-emerald-600 transition-colors font-medium group"
      >
        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center mr-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
        </div>
        Kembali ke Data Warga
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Detail Warga</h1>
            <p className="text-slate-500 mt-1">Informasi lengkap dan kartu keluarga</p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => router.push(`/dashboard/warga?edit=${warga.id}`)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center shadow-sm"
            >
                <Edit className="w-4 h-4 mr-2" />
                Edit Data
            </button>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Photo */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-40 h-40 bg-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0 border-4 border-white shadow-lg overflow-hidden relative group">
                        {warga.ktp_image_path ? (
                            <img 
                                src={`${process.env.NEXT_PUBLIC_API_URL}/storage/${warga.ktp_image_path}`} 
                                alt="Foto Warga" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-16 h-16 text-slate-300" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <div className="text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            warga.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                            {warga.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                        </span>
                    </div>
                </div>
                
                {/* Details */}
                <div className="flex-1">
                    <div className="mb-6 pb-6 border-b border-slate-100">
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">{warga.name}</h2>
                        <div className="flex items-center text-slate-500 font-mono">
                            <CreditCard className="w-4 h-4 mr-2 text-emerald-500" />
                            {warga.nik}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-500 mb-1">
                                <Phone className="w-4 h-4 mr-2 text-emerald-500" />
                                Nomor HP
                            </div>
                            <p className="text-base font-medium text-slate-900 pl-6">{warga.phone || '-'}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-500 mb-1">
                                <MapPin className="w-4 h-4 mr-2 text-emerald-500" />
                                Alamat Domisili
                            </div>
                            <p className="text-base font-medium text-slate-900 pl-6">{warga.address || '-'}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-500 mb-1">
                                <Users className="w-4 h-4 mr-2 text-emerald-500" />
                                Nomor KK
                            </div>
                            <p className="text-base font-medium text-slate-900 pl-6">{warga.kk_number || '-'}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-500 mb-1">
                                <Calendar className="w-4 h-4 mr-2 text-emerald-500" />
                                Tempat, Tanggal Lahir & Umur
                            </div>
                            <p className="text-base font-medium text-slate-900 pl-6">
                                {warga.place_of_birth}, {formatBirthDate(warga.date_of_birth)}{' '}
                                <span className="text-sm text-slate-500">
                                    ({calculateAge(warga.date_of_birth)})
                                </span>
                            </p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-500 mb-1">
                                <Briefcase className="w-4 h-4 mr-2 text-emerald-500" />
                                Pekerjaan
                            </div>
                            <p className="text-base font-medium text-slate-900 pl-6">{warga.occupation || '-'}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-500 mb-1">
                                <Home className="w-4 h-4 mr-2 text-emerald-500" />
                                Status Keluarga
                            </div>
                            <p className="text-base font-medium text-slate-900 pl-6">{warga.status_in_family?.replace('_', ' ') || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Family Card Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Anggota Keluarga</h3>
                    <p className="text-sm text-slate-500 font-mono">No. KK: {warga.kk_number}</p>
                </div>
            </div>
            <button 
                onClick={handleAddFamilyMember}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center"
            >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Anggota
            </button>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-slate-700">Nama Lengkap</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">NIK</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">L/P</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">Tanggal Lahir / Umur</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {warga.family && warga.family.length > 0 ? (
                        warga.family.map((member) => (
                            <tr key={member.id} className={`hover:bg-slate-50/50 transition-colors ${member.id === warga.id ? "bg-emerald-50/30" : ""}`}>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{member.name}</div>
                                    {member.id === warga.id && (
                                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                                            Kepala Keluarga
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-mono">{member.nik}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        member.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                                    }`}>
                                        {member.gender === 'L'
                                          ? 'Laki-Laki'
                                          : member.gender === 'P'
                                            ? 'Perempuan'
                                            : '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <span className="capitalize">{member.status_in_family?.toLowerCase().replace('_', ' ')}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div>{formatBirthDate(member.date_of_birth)}</div>
                                    <div className="text-xs text-slate-500">
                                        {calculateAge(member.date_of_birth)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {member.id === warga.id ? (
                                    <span className="text-xs text-slate-400 italic">
                                      Kelola dari menu atas
                                    </span>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleEditFamilyMember(member)}
                                        className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-100 shadow-sm"
                                        title="Edit Anggota"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFamilyMember(member)}
                                        className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100 shadow-sm"
                                        title="Hapus Anggota"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                    <Users className="w-12 h-12 text-slate-200 mb-3" />
                                    <p>Belum ada anggota keluarga lain.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Add Family Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
              <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {modalMode === 'add' ? 'Tambah Anggota Keluarga' : 'Edit Anggota Keluarga'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {modalMode === 'add' ? 'Isi data anggota keluarga baru' : 'Perbarui data anggota keluarga'}
                  </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start">
                  <div className="p-2 bg-emerald-100 rounded-lg mr-3 shrink-0">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-900 text-sm">Informasi Kartu Keluarga</h4>
                    <p className="text-sm text-emerald-700 mt-0.5">
                        Menambahkan anggota untuk KK: <span className="font-mono font-bold">{formData.kk_number}</span>
                    </p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Nama Lengkap sesuai KTP"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">NIK</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      maxLength={16}
                      value={formData.nik}
                      onChange={(e) => setFormData({...formData, nik: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono transition-all"
                      placeholder="16 digit NIK"
                    />
                  </div>
                </div>

                {/* KK Number (Readonly) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor KK</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      readOnly
                      value={formData.kk_number}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl outline-none font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status Keluarga</label>
                  <div className="relative">
                    <Home className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select
                      required
                      value={formData.status_in_family}
                      onChange={(e) => setFormData({...formData, status_in_family: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white appearance-none transition-all"
                    >
                      <option value="" disabled>Pilih Status</option>
                      <option value="ISTRI">Istri</option>
                      <option value="ANAK">Anak</option>
                      <option value="FAMILI_LAIN">Famili Lain</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor HP</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Opsional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, gender: 'L'})}
                        className={`px-4 py-2.5 rounded-xl border flex items-center justify-center transition-all ${
                            formData.gender === 'L' 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-300' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Laki-Laki
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, gender: 'P'})}
                        className={`px-4 py-2.5 rounded-xl border flex items-center justify-center transition-all ${
                            formData.gender === 'P' 
                            ? 'bg-pink-50 border-pink-200 text-pink-700 ring-1 ring-pink-300' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Perempuan
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.place_of_birth}
                    onChange={(e) => setFormData({...formData, place_of_birth: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Kota Lahir"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Lahir</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"

                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Agama</label>
                  <select
                    value={formData.religion}
                    onChange={(e) => setFormData({...formData, religion: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="ISLAM">Islam</option>
                    <option value="KRISTEN">Kristen</option>
                    <option value="KATOLIK">Katolik</option>
                    <option value="HINDU">Hindu</option>
                    <option value="BUDDHA">Buddha</option>
                    <option value="KONGHUCU">Konghucu</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status Perkawinan</label>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="BELUM_KAWIN">Belum Kawin</option>
                    <option value="KAWIN">Kawin</option>
                    <option value="CERAI_HIDUP">Cerai Hidup</option>
                    <option value="CERAI_MATI">Cerai Mati</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pekerjaan</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Pekerjaan saat ini"
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Domisili</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Otomatis disamakan dengan Kepala Keluarga</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors mr-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan Anggota Keluarga
                    </>
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
