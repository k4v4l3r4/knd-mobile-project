'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X,
  User,
  Users,
  CreditCard,
  Briefcase,
  Phone,
  MapPin,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FileSpreadsheet,
  Eye,
  Smartphone
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useRouter } from 'next/navigation';

interface Warga {
  id: number;
  name: string;
  nik: string;
  phone: string;
  email?: string | null;
  address: string | null;
  block?: string | null;
  gang?: string | null;
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
  address_rt?: string | null;
  address_rw?: string | null;
  postal_code?: string | null;
  ktp_image_path: string | null;
  kk_image_path: string | null;
  province_code?: string | null;
  city_code?: string | null;
  district_code?: string | null;
  village_code?: string | null;
  has_mobile_app?: boolean;
}

export default function WargaPage() {
  const { isDemo, isExpired, isTrial } = useTenant();
  const router = useRouter();
  const [wargas, setWargas] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentWarga, setCurrentWarga] = useState<Partial<Warga>>({});
  const [saving, setSaving] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [wargaToDelete, setWargaToDelete] = useState<Warga | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Import/Export State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any | null>(null);
  const [resetting, setResetting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    kk_number: '',
    phone: '',
    email: '',
    address: '',
    block: '',
    gang: '',
    address_rt: '',
    address_rw: '',
    address_ktp: '',
    postal_code: '',
    gender: 'L',
    place_of_birth: '',
    date_of_birth: '',
    religion: 'ISLAM',
    marital_status: 'BELUM_KAWIN',
    occupation: '',
    status_in_family: 'KEPALA_KELUARGA',
    province_code: '',
    city_code: '',
    district_code: '',
    village_code: '',
  });
  const [birthDateInput, setBirthDateInput] = useState('');
  
  const [addressSame, setAddressSame] = useState(true);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [kkFile, setKkFile] = useState<File | null>(null);
  
  // Region Data States
  const [provinces, setProvinces] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [villages, setVillages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        setProvinces({
          '31': 'DKI Jakarta',
          '32': 'Jawa Barat',
          '33': 'Jawa Tengah',
        });
        return;
      }
      const res = await api.get('/regions/provinces');
      if (res.data.success) setProvinces(res.data.data);
    } catch (err) {
      if (!isDemo) {
        console.error('Failed to fetch provinces:', err);
      }
    }
  };

  const fetchCities = async (provinceCode: string) => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoCities: Record<string, Record<string, string>> = {
          '31': {
            '3171': 'Jakarta Pusat',
            '3172': 'Jakarta Utara',
            '3173': 'Jakarta Barat',
            '3174': 'Jakarta Selatan',
            '3175': 'Jakarta Timur',
          },
          '32': {
            '3273': 'Kota Bekasi',
            '3275': 'Kota Depok',
            '3204': 'Kabupaten Bandung',
          },
          '33': {
            '3375': 'Kota Semarang',
            '3320': 'Kabupaten Banyumas',
          },
        };
        setCities(demoCities[provinceCode] || {});
        return;
      }
      const res = await api.get(`/regions/cities/${provinceCode}`);
      if (res.data.success) setCities(res.data.data);
    } catch (err) {
      if (!isDemo) {
        console.error('Failed to fetch cities:', err);
      }
    }
  };

  const fetchDistricts = async (cityCode: string) => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoDistricts: Record<string, Record<string, string>> = {
          '3174': {
            '3174030': 'Kebayoran Baru',
            '3174040': 'Tebet',
          },
          '3273': {
            '3273060': 'Bekasi Selatan',
            '3273070': 'Bekasi Barat',
          },
          '3375': {
            '3375030': 'Semarang Tengah',
            '3375040': 'Semarang Selatan',
          },
        };
        setDistricts(demoDistricts[cityCode] || {});
        return;
      }
      const res = await api.get(`/regions/districts/${cityCode}`);
      if (res.data.success) setDistricts(res.data.data);
    } catch (err) {
      if (!isDemo) {
        console.error('Failed to fetch districts:', err);
      }
    }
  };

  const fetchVillages = async (districtCode: string) => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoVillages: Record<string, Record<string, string>> = {
          '3273060': {
            '3273060005': 'Kayuringin Jaya',
            '3273060006': 'Jakasetia',
          },
          '3174030': {
            '3174030007': 'Gandaria Utara',
            '3174030004': 'Selong',
          },
          '3375030': {
            '3375030001': 'Miroto',
            '3375030002': 'Brumbungan',
          },
        };
        setVillages(demoVillages[districtCode] || {});
        return;
      }
      const res = await api.get(`/regions/villages/${districtCode}`);
      if (res.data.success) setVillages(res.data.data);
    } catch (err) {
      if (!isDemo) {
        console.error('Failed to fetch villages:', err);
      }
    }
  };

  const handleRegionChange = (type: 'province' | 'city' | 'district' | 'village', code: string) => {
    if (type === 'province') {
      setFormData(prev => ({ ...prev, province_code: code, city_code: '', district_code: '', village_code: '' }));
      setCities({});
      setDistricts({});
      setVillages({});
      if (code) fetchCities(code);
    } else if (type === 'city') {
      setFormData(prev => ({ ...prev, city_code: code, district_code: '', village_code: '' }));
      setDistricts({});
      setVillages({});
      if (code) fetchDistricts(code);
    } else if (type === 'district') {
      setFormData(prev => ({ ...prev, district_code: code, village_code: '' }));
      setVillages({});
      if (code) fetchVillages(code);
    } else if (type === 'village') {
      setFormData(prev => ({ ...prev, village_code: code }));
    }
  };

  const handleResetWarga = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Reset data tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    const confirmed = window.confirm('Yakin ingin menghapus SEMUA data warga di RT ini? Tindakan ini tidak dapat dibatalkan.');
    if (!confirmed) return;

    try {
      setResetting(true);
      const response = await api.delete('/warga/reset');
      if (response.data?.success) {
        toast.success(response.data.message || 'Data warga berhasil direset');
        fetchWargas('', 1);
      } else {
        toast.error(response.data?.message || 'Gagal mereset data warga');
      }
    } catch (err: any) {
      console.error('Failed to reset warga:', err);
      const msg = err?.response?.data?.message || 'Gagal mereset data warga';
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchWargas('', 1);
    setPage(1);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchWargas(search, 1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchWargas = async (searchTerm = '', pageParam?: number) => {
    setLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demo: Warga[] = [
          {
            id: 1,
            name: 'Budi Santoso',
            role: 'WARGA_TETAP',
            nik: '3201010101010001',
            kk_number: '3201010101010000',
            phone: '0812-1111-2222',
            email: 'budi@example.com',
            address: 'Jl. Melati No. 1',
            address_rt: '01',
            address_rw: '02',
            gender: 'L',
            place_of_birth: 'Bandung',
            date_of_birth: '1985-05-12',
            religion: 'ISLAM',
            marital_status: 'KAWIN',
            occupation: 'Karyawan',
            status_in_family: 'KEPALA_KELUARGA',
            province_code: '32',
            city_code: '3204',
            district_code: '3204050',
            village_code: '3204050001',
            rt_id: null,
            rw_id: null,
            address_ktp: null,
            postal_code: '40288',
            ktp_image_path: null,
            kk_image_path: null
          },
          {
            id: 2,
            name: 'Siti Rahma',
            role: 'WARGA_TETAP',
            nik: '3201010101010002',
            kk_number: '3201010101010000',
            phone: '0813-3333-4444',
            email: 'siti@example.com',
            address: 'Jl. Mawar No. 5',
            address_rt: '01',
            address_rw: '02',
            gender: 'P',
            place_of_birth: 'Jakarta',
            date_of_birth: '1990-09-23',
            religion: 'ISLAM',
            marital_status: 'KAWIN',
            occupation: 'Ibu Rumah Tangga',
            status_in_family: 'IBU',
            province_code: '31',
            city_code: '3174',
            district_code: '3174030',
            village_code: '3174030007',
            rt_id: null,
            rw_id: null,
            address_ktp: null,
            postal_code: '12110',
            ktp_image_path: null,
            kk_image_path: null
          },
          {
            id: 3,
            name: 'Agus Wirawan',
            role: 'WARGA_KOST',
            nik: '3201010101010003',
            kk_number: '3201010101010003',
            phone: '0851-5555-6666',
            email: 'agus@example.com',
            address: 'Jl. Kenanga No. 8',
            address_rt: '03',
            address_rw: '04',
            gender: 'L',
            place_of_birth: 'Semarang',
            date_of_birth: '1987-02-01',
            religion: 'ISLAM',
            marital_status: 'BELUM_KAWIN',
            occupation: 'Wiraswasta',
            status_in_family: 'WARGA',
            province_code: '33',
            city_code: '3375',
            district_code: '3375030',
            village_code: '3375030001',
            rt_id: null,
            rw_id: null,
            address_ktp: null,
            postal_code: '50134',
            ktp_image_path: null,
            kk_image_path: null
          }
        ];
        const filtered = searchTerm
          ? demo.filter(d =>
              d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              d.nik.includes(searchTerm) ||
              d.phone.includes(searchTerm)
            )
          : demo;
        const perPage = 10;
        const total = filtered.length;
        const last = Math.max(1, Math.ceil(total / perPage));
        const targetPage = Math.min(pageParam ?? page, last);
        const startIndex = (targetPage - 1) * perPage;
        const paginated = filtered.slice(startIndex, startIndex + perPage);
        setWargas(paginated);
        setMeta({
          current_page: targetPage,
          last_page: last,
          total,
          per_page: perPage,
        });
        setPage(targetPage);
        return;
      }
      const response = await api.get('/warga', {
        params: { 
          search: searchTerm, 
          page: pageParam ?? page, 
          per_page: 10,
          head_only: true
        }
      });
      if (response.data.success) {
        const payload = response.data.data;
        if (Array.isArray(payload)) {
          setWargas(payload);
          setMeta(null);
        } else {
          setWargas(payload.data);
          setMeta(payload);
          if (typeof payload.current_page === 'number') {
            setPage(payload.current_page);
          }
        }
      }
    } catch (err) {
      if (!isDemo) {
        console.error('Failed to fetch warga:', err);
        toast.error('Gagal memuat data warga');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1) return;
    if (meta && typeof meta.last_page === 'number' && newPage > meta.last_page) return;
    fetchWargas(search, newPage);
  };

  const handleOpenModal = (mode: 'add' | 'edit', warga?: Warga) => {
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }
    if (isDemo && mode === 'edit') {
        toast.error('Mode Demo: Edit data tidak diizinkan');
        return;
    }
    if (isDemo && mode === 'add') {
        toast.error('Mode Demo: Tambah data tidak diizinkan');
        return;
    }

    setModalMode(mode);
    setKtpFile(null);
    setKkFile(null);
    
    if (mode === 'edit' && warga) {
      setCurrentWarga(warga);
      const isoBirthDate = warga.date_of_birth ? new Date(warga.date_of_birth).toISOString().split('T')[0] : '';
      setFormData({
        name: warga.name,
        nik: warga.nik, 
        kk_number: warga.kk_number || '',
        phone: warga.phone,
        email: warga.email || '',
        address: warga.address || '',
        block: warga.block || '',
        gang: warga.gang || '',
        address_rt: warga.address_rt || '',
        address_rw: warga.address_rw || '',
        address_ktp: warga.address_ktp || '',
        postal_code: warga.postal_code || '',
        gender: warga.gender || 'L',
        place_of_birth: warga.place_of_birth || '',
        date_of_birth: isoBirthDate,
        religion: warga.religion || 'ISLAM',
        marital_status: warga.marital_status || 'BELUM_KAWIN',
        occupation: warga.occupation || '',
        status_in_family: warga.status_in_family || 'KEPALA_KELUARGA',
        province_code: warga.province_code || '',
        city_code: warga.city_code || '',
        district_code: warga.district_code || '',
        village_code: warga.village_code || '',
      });
      if (isoBirthDate) {
        const [y, m, d] = isoBirthDate.split('-');
        setBirthDateInput(`${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`);
      } else {
        setBirthDateInput('');
      }
      
      // Load dependent dropdowns if editing
      if (warga.province_code) fetchCities(warga.province_code);
      if (warga.city_code) fetchDistricts(warga.city_code);
      if (warga.district_code) fetchVillages(warga.district_code);
      
      if (warga.address_ktp && warga.address !== warga.address_ktp) {
        setAddressSame(false);
      } else {
        setAddressSame(true);
      }
    } else {
      setCurrentWarga({});
      setFormData({
        name: '',
        nik: '',
        kk_number: '',
        phone: '',
        email: '',
        address: '',
        block: '',
        gang: '',
        address_rt: '',
        address_rw: '',
        address_ktp: '',
        postal_code: '',
        gender: 'L',
        place_of_birth: '',
        date_of_birth: '',
        religion: 'ISLAM',
        marital_status: 'BELUM_KAWIN',
        occupation: '',
        status_in_family: 'KEPALA_KELUARGA',
        province_code: '',
        city_code: '',
        district_code: '',
        village_code: '',
      });
      setBirthDateInput('');
      setAddressSame(true);
      setCities({});
      setDistricts({});
      setVillages({});
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
        toast.error('Mode Demo: Simpan data tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!formData.date_of_birth) {
      toast.error('Format Tanggal Lahir tidak valid. Gunakan dd/mm/yyyy.');
      return;
    }

    setSaving(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'address_ktp') {
             data.append(key, value);
        }
      });
      
      const regionParts: string[] = [];
      
      // Look up names for display in address_ktp
      const provinceName = provinces[formData.province_code] || '';
      const cityName = cities[formData.city_code] || '';
      const districtName = districts[formData.district_code] || '';
      const villageName = villages[formData.village_code] || '';

      if (villageName) regionParts.push(`Kelurahan ${villageName}`);
      if (districtName) regionParts.push(`Kecamatan ${districtName}`);
      if (cityName) regionParts.push(`Kabupaten/Kota ${cityName}`);
      if (provinceName) regionParts.push(`Provinsi ${provinceName}`);
      
      const regionText = regionParts.length ? ` (${regionParts.join(', ')})` : '';
      const baseKtpAddress = addressSame ? formData.address : formData.address_ktp;
      const rtRwText = [formData.address_rt && `RT ${formData.address_rt}`, formData.address_rw && `RW ${formData.address_rw}`].filter(Boolean).join(' / ');
      const postalText = formData.postal_code ? `, Kodepos ${formData.postal_code}` : '';
      const rtRwSuffix = rtRwText ? ` (${rtRwText})` : '';
      data.append('address_ktp', `${baseKtpAddress}${rtRwSuffix}${regionText}${postalText}`);
      
      if (ktpFile) data.append('ktp_image', ktpFile);
      if (kkFile) data.append('kk_image', kkFile);

      if (modalMode === 'add') {
        await api.post('/warga', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Warga berhasil ditambahkan');
      } else {
        data.append('_method', 'PUT');
        await api.post(`/warga/${currentWarga.id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Data warga berhasil diperbarui');
      }
      
      setIsModalOpen(false);
      fetchWargas(search);
    } catch (err: unknown) {
      console.error('Error saving warga:', err);
      type BackendErrors = Record<string, string[]>;
      interface ErrorResponseData {
        message?: string;
        errors?: BackendErrors;
      }
      interface AxiosErrorLike {
        response?: {
          data?: ErrorResponseData;
          status?: number;
        };
      }

      let message = 'Gagal menyimpan data warga.';
      const error = err as AxiosErrorLike;
      const data = error.response?.data;

      if (data) {
        if (data.message) {
          message = data.message;
        } else if (data.errors) {
          const collected: string[] = [];
          Object.values(data.errors).forEach((arr) => {
            arr.forEach((m) => {
              if (collected.indexOf(m) === -1) {
                collected.push(m);
              }
            });
          });
          if (collected.length) {
            message = collected.join('\n');
          }
        }
      } else if (typeof error.response?.status === 'number') {
        message = `Server Error: ${error.response.status}`;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (warga: Warga) => {
    setWargaToDelete(warga);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (isDemo) {
        toast.error('Mode Demo: Hapus data tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!wargaToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/warga/${wargaToDelete.id}`);
      toast.success('Data warga berhasil dihapus');
      fetchWargas(search);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Error deleting warga:', err);
      toast.error('Gagal menghapus data warga');
    } finally {
      setIsDeleting(false);
      setWargaToDelete(null);
    }
  };

  const handleExport = async () => {
    if (isDemo) {
        toast.error('Mode Demo: Export data tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    try {
        const token = Cookies.get('admin_token');
        const response = await api.get('/warga/export', {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `data_warga_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Data berhasil diexport');
    } catch (err: unknown) {
        console.error('Export error:', err);
        toast.error('Gagal mengexport data');
    }
  };

  const handleExportPdf = async () => {
    if (isDemo) {
        toast.error('Mode Demo: Export data tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    try {
        const token = Cookies.get('admin_token');
        const response = await api.get('/warga/export-pdf', {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` }
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `data_warga_${new Date().toISOString().slice(0,10)}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('PDF berhasil diunduh');
    } catch (err: unknown) {
        console.error('Export PDF error:', err);
        const apiError = (err as { response?: { data?: { message?: string } } })?.response?.data;
        const msg = apiError?.message || 'Gagal mengexport PDF';
        toast.error(msg);
    }
  };

  const handleDownloadTemplate = async () => {
    if (isDemo) {
        toast.error('Mode Demo: Download template tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    try {
        const token = Cookies.get('admin_token');
        const response = await api.get('/warga/export-template', {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` }
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'template_import_warga.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Template import berhasil diunduh');
    } catch (err: unknown) {
        console.error('Template export error:', err);
        toast.error('Gagal mengunduh template import');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
        toast.error('Mode Demo: Import data tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }
    if (!importFile) {
        toast.error('Pilih file CSV terlebih dahulu');
        return;
    }

    setImporting(true);
    const data = new FormData();
    data.append('file', importFile);

    try {
        const response = await api.post('/warga/import', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data.success) {
            toast.success(response.data.message);
            if (response.data.errors && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
                const preview = response.data.errors.slice(0, 3).join('\n');
                toast.error(`Beberapa baris gagal diimport:\n${preview}`);
                console.error('Import errors:', response.data.errors);
            }
            setIsImportModalOpen(false);
            setImportFile(null);
            fetchWargas();
        }
    } catch (err: unknown) {
        console.error('Import error:', err);
        const apiError = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data;
        const msg = apiError?.message || 'Gagal import data';
        toast.error(msg);
        if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
          const preview = apiError.errors.slice(0, 3).join('\n');
          toast.error(preview);
          console.error('Import errors detail:', apiError.errors);
        }
    } finally {
        setImporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users size={120} className="text-emerald-600 dark:text-emerald-400" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <Users size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Data Warga</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola data kependudukan warga, NIK, KK, dan informasi kontak.
           </p>
         </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-4">
        <div className="relative w-full md:flex-1 max-w-xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors" size={20} />
            <input
                type="text"
                placeholder="Cari nama, NIK, atau no HP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all shadow-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
        </div>
        <div className="flex flex-wrap gap-2 justify-start md:justify-end w-full md:w-auto">
            <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-sm"
                title="Export CSV"
            >
                <Download size={20} />
                <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
                onClick={handleExportPdf}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-sm"
                title="Export PDF"
            >
                <Download size={20} />
                <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-sm"
                title="Download contoh template CSV untuk import"
            >
                <FileSpreadsheet size={20} />
                <span className="hidden sm:inline">Template</span>
            </button>
            <button
                type="button"
                onClick={handleResetWarga}
                disabled={resetting || loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-2xl font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title="Hapus semua data warga di RT ini"
            >
                <Trash2 size={20} />
                <span className="hidden sm:inline">{resetting ? 'Mereset...' : 'Reset Data'}</span>
            </button>
            <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm"
                title="Import CSV"
            >
                <FileSpreadsheet size={20} />
                <span className="hidden sm:inline">Import</span>
            </button>
            <button
                onClick={() => handleOpenModal('add')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
            >
                <Plus size={20} strokeWidth={2.5} />
                <span className="hidden sm:inline">Tambah Warga</span>
            </button>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Warga</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Blok / Gang</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Info Kontak</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                // Loading Skeleton
                [...Array(5)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
                          <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-2">
                        <div className="h-5 w-28 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : wargas.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-3 text-emerald-200 dark:text-emerald-700"><Users size={40} /></div>
                            <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada data warga.</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500">Silakan tambahkan data warga baru.</p>
                        </div>
                    </td>
                </tr>
              ) : (
                wargas.map((warga) => (
                  <tr key={warga.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg shadow-sm border border-emerald-200/50 dark:border-emerald-800/30">
                          {warga.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                            <span>{warga.name}</span>
                            {warga.has_mobile_app && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Smartphone size={12} className="shrink-0" />
                                <span>Aplikasi Mobile</span>
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 space-y-0.5">
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide dark:text-slate-300">
                                  {warga.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}
                              </span>
                            </div>
                            {warga.block && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                                <span>Blok / No: {warga.block}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-emerald-500 dark:text-emerald-400" />
                                <span>{warga.block ? `Blok ${warga.block}` : ''}</span>
                            </div>
                            {warga.gang && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span>Gang {warga.gang}</span>
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <Phone size={14} className="text-emerald-500 dark:text-emerald-400" />
                                {warga.phone}
                             </div>
                             {warga.occupation && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Briefcase size={12} />
                                    {warga.occupation}
                                </div>
                             )}
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            warga.status_in_family === 'KEPALA_KELUARGA' || warga.role === 'ADMIN_RT' || warga.role === 'RT'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}>
                            {warga.status_in_family
                              ? warga.status_in_family.replace('_', ' ')
                              : (warga.role === 'ADMIN_RT' || warga.role === 'RT'
                                  ? 'KETUA RT'
                                  : warga.role === 'WARGA_TETAP'
                                    ? 'WARGA TETAP'
                                    : warga.role === 'WARGA_KOST'
                                      ? 'WARGA KOST'
                                      : 'WARGA')}
                        </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/warga/${warga.id}`)}
                            className="p-2.5 text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                            title="Detail Kepala Keluarga"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenModal('edit', warga)}
                            className="p-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(warga)}
                            className="p-2.5 text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors border border-rose-200 dark:border-rose-800 shadow-sm"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {meta && (
          <PaginationControls
            currentPage={meta.current_page || page}
            lastPage={meta.last_page || 1}
            onPageChange={handlePageChange}
            isLoading={loading}
          />
        )}
      </div>

      {/* --- IMPORT MODAL --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Import Data Warga</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upload file CSV untuk import data massal.</p>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleImport} className="space-y-6">
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm border border-blue-100 dark:border-blue-800 flex gap-3">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <div className="space-y-1">
                            <p className="font-semibold">Format CSV yang didukung:</p>
                            <p>
                              Nama, NIK, Nomor KK, No. Telepon/WA, Email, Jenis Kelamin (L/P),
                              Tempat Lahir, Tanggal Lahir (YYYY-MM-DD), Agama, Status Perkawinan,
                              Pekerjaan, Status Keluarga, Alamat Domisili, Alamat KTP, Blok, Gang,
                              RT, RW, Kode Pos, Kode Provinsi, Kode Kota/Kabupaten, Kode Kecamatan,
                              Kode Kelurahan
                            </p>
                            <p className="text-xs mt-2 text-blue-600/80 dark:text-blue-400/80">
                              * Gunakan tombol "Download Template" untuk mendapatkan contoh format yang terbaru.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pilih File CSV</label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept=".csv,.txt"
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-900/30 file:text-emerald-700 dark:file:text-emerald-400 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-900/50 cursor-pointer text-slate-700 dark:text-slate-300"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setIsImportModalOpen(false)}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        disabled={importing}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={importing || !importFile}
                        className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {importing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Importing...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                <span>Import Data</span>
                            </>
                        )}
                    </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {modalMode === 'add' ? 'Tambah Warga Baru' : 'Edit Data Warga'}
                </h3>
                <p className="text-sm text-slate-500">Lengkapi informasi data diri warga dengan benar.</p>
                <p className="text-xs text-rose-500 mt-1 font-medium">
                  <span className="text-rose-500">*</span> Wajib diisi
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-8 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Section: Data Pribadi */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                        <User size={16} /> Data Pribadi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">
                                Nama Lengkap <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                placeholder="Sesuai KTP"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                NIK (16 Digit) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={16}
                                value={formData.nik}
                                onChange={(e) => setFormData({...formData, nik: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono dark:text-white"
                                placeholder="32xxxxxxxxxxxxxx"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Nomor KK <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={16}
                                value={formData.kk_number}
                                onChange={(e) => setFormData({...formData, kk_number: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono dark:text-white"
                                placeholder="32xxxxxxxxxxxxxx"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                            >
                                <option value="L">Laki-Laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Tempat Lahir <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.place_of_birth}
                                onChange={(e) => setFormData({...formData, place_of_birth: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                placeholder="Kota kelahiran"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Tanggal Lahir <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="dd/mm/yyyy"
                                required
                                value={birthDateInput}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setBirthDateInput(value);
                                    const parts = value.split(/[\/\-]/);
                                    if (parts.length === 3) {
                                        let [d, m, y] = parts;
                                        d = d.padStart(2, '0');
                                        m = m.padStart(2, '0');
                                        if (y.length === 4) {
                                            setFormData(prev => ({
                                                ...prev,
                                                date_of_birth: `${y}-${m}-${d}`,
                                            }));
                                            return;
                                        }
                                    }
                                    setFormData(prev => ({
                                        ...prev,
                                        date_of_birth: '',
                                    }));
                                }}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Section: Kontak & Alamat */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                        <MapPin size={16} /> Kontak & Alamat
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nomor Handphone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                placeholder="08xxxxxxxxxx"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Alamat Domisili <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                required
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[80px] dark:text-white"
                                placeholder="Alamat lengkap..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Blok / Nomor Rumah</label>
                            <input
                                type="text"
                                value={formData.block}
                                onChange={(e) => setFormData({...formData, block: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                placeholder="Contoh: A5, B12"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gang</label>
                            <input
                                type="text"
                                value={formData.gang}
                                onChange={(e) => setFormData({...formData, gang: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                placeholder="Contoh: Gg. Melati"
                            />
                        </div>
                        <div className="md:col-span-2">
                             <div className="flex items-center gap-2 mb-2">
                                <input 
                                    type="checkbox" 
                                    id="addressSame"
                                    checked={addressSame}
                                    onChange={(e) => setAddressSame(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                />
                                <label htmlFor="addressSame" className="text-sm text-slate-600 dark:text-slate-400">Alamat KTP sama dengan Domisili</label>
                             </div>
                             {!addressSame && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Alamat Sesuai KTP</label>
                                    <input
                                        type="text"
                                        value={formData.address_ktp}
                                        onChange={(e) => setFormData({...formData, address_ktp: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                        placeholder="Alamat lengkap sesuai KTP"
                                    />
                                </div>
                             )}
                            {/* RT/RW & Kodepos */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        RT <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.address_rt}
                                        onChange={(e) => setFormData({...formData, address_rt: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                        placeholder="Contoh: 05"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        RW <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.address_rw}
                                        onChange={(e) => setFormData({...formData, address_rw: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                        placeholder="Contoh: 03"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Kodepos <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.postal_code}
                                        onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                        placeholder="Contoh: 40293"
                                    />
                                </div>
                            </div>
                            {/* New Region Dropdowns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Provinsi <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.province_code}
                                        onChange={(e) => handleRegionChange('province', e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                    >
                                        <option value="">Pilih Provinsi</option>
                                        {Object.entries(provinces).map(([code, name]) => (
                                            <option key={code} value={code}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Kabupaten/Kota <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.city_code}
                                        onChange={(e) => handleRegionChange('city', e.target.value)}
                                        disabled={!formData.province_code}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 dark:text-white"
                                    >
                                        <option value="">Pilih Kota/Kab</option>
                                        {Object.entries(cities).map(([code, name]) => (
                                            <option key={code} value={code}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Kecamatan <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.district_code}
                                        onChange={(e) => handleRegionChange('district', e.target.value)}
                                        disabled={!formData.city_code}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 dark:text-white"
                                    >
                                        <option value="">Pilih Kecamatan</option>
                                        {Object.entries(districts).map(([code, name]) => (
                                            <option key={code} value={code}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Kelurahan <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.village_code}
                                        onChange={(e) => handleRegionChange('village', e.target.value)}
                                        disabled={!formData.district_code}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 dark:text-white"
                                    >
                                        <option value="">Pilih Kelurahan</option>
                                        {Object.entries(villages).map(([code, name]) => (
                                            <option key={code} value={code}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Section: Dokumen Pendukung */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                        <Upload size={16} /> Dokumen Pendukung
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Foto KTP</label>
                            <div className="relative group">
                                <div className={`border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer ${ktpFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setKtpFile(e.target.files ? e.target.files[0] : null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                                        <div className={`p-2 rounded-full ${ktpFile ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                                            <ImageIcon size={20} />
                                        </div>
                                        <div className="text-xs">
                                            {ktpFile ? (
                                                <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate max-w-[150px] block">{ktpFile.name}</span>
                                            ) : (
                                                <span className="text-slate-500 dark:text-slate-400">Klik atau geser foto KTP ke sini</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {currentWarga.ktp_image_path && !ktpFile && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> File KTP sudah ada
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Foto KK</label>
                            <div className="relative group">
                                <div className={`border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer ${kkFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setKkFile(e.target.files ? e.target.files[0] : null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                                        <div className={`p-2 rounded-full ${kkFile ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                                            <ImageIcon size={20} />
                                        </div>
                                        <div className="text-xs">
                                            {kkFile ? (
                                                <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate max-w-[150px] block">{kkFile.name}</span>
                                            ) : (
                                                <span className="text-slate-500 dark:text-slate-400">Klik atau geser foto KK ke sini</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {currentWarga.kk_image_path && !kkFile && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> File KK sudah ada
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Section: Status & Pekerjaan */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                        <Briefcase size={16} /> Status & Pekerjaan
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Agama</label>
                            <select
                                value={formData.religion}
                                onChange={(e) => setFormData({...formData, religion: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
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
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status Perkawinan</label>
                            <select
                                value={formData.marital_status}
                                onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                            >
                                <option value="BELUM_KAWIN">Belum Kawin</option>
                                <option value="KAWIN">Kawin</option>
                                <option value="CERAI_HIDUP">Cerai Hidup</option>
                                <option value="CERAI_MATI">Cerai Mati</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                            <input
                                type="text"
                                value={formData.occupation}
                                onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                placeholder="Pekerjaan saat ini"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status dalam Keluarga</label>
                            <select
                                value={formData.status_in_family}
                                onChange={(e) => setFormData({...formData, status_in_family: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white"
                            >
                                <option value="KEPALA_KELUARGA">Kepala Keluarga</option>
                                <option value="ISTRI">Istri</option>
                                <option value="ANAK">Anak</option>
                                <option value="FAMILI_LAIN">Famili Lain</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Data Warga'}
                    </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {isDeleteModalOpen && wargaToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-800">
            <div className="flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-3xl mx-auto mb-6">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">Hapus Data?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Apakah Anda yakin ingin menghapus data warga <span className="font-bold text-slate-800 dark:text-white">&quot;{wargaToDelete.name}&quot;</span>? 
              <br/>Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
