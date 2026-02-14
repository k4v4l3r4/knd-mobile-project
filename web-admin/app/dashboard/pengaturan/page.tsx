'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import { 
  Building2, 
  Wallet, 
  ListTodo, 
  Users, 
  Save, 
  Upload, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  CreditCard,
  Banknote,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  MapPin,
  ImageIcon,
  Settings,
  FileText,
  Cctv
} from 'lucide-react';
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

// --- Types ---
interface LetterTypeData {
  id?: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

interface FeeData {
  id?: number;
  name: string;
  amount: number;
  is_mandatory: boolean;
}

interface WalletData {
  id?: number;
  name: string;
  type: 'CASH' | 'BANK';
  bank_name?: string;
  account_number?: string;
  balance: number;
}

interface ActivityData {
  id?: number;
  name: string;
  description?: string;
}

interface AdminData {
  id?: number;
  user_id?: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface RoleData {
  id?: number;
  name: string; // key e.g. SEKSI_KEAMANAN
  label: string; // e.g. Seksi Keamanan
  description?: string;
  is_system?: boolean;
  scope: 'RT' | 'RW' | 'RW_LINTAS_RT';
  permissions: string[];
}

const SCOPE_OPTIONS = [
  { id: 'RT', label: 'RT', badge: 'RT', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', description: 'Hanya data dalam satu RT' },
  { id: 'RW', label: 'RW', badge: 'RW', color: 'bg-blue-100 text-blue-700 border-blue-200', description: 'Seluruh data dalam satu RW' },
  { id: 'RW_LINTAS_RT', label: 'RW • Lintas RT', badge: 'RW • Lintas RT', color: 'bg-purple-100 text-purple-700 border-purple-200', description: 'Khusus UMKM lintas wilayah' },
];

const PERMISSION_GROUPS = [
  { id: 'dashboard', label: 'Dashboard', description: 'Bisa melihat ringkasan data' },
  { id: 'finance', label: 'Keuangan', description: 'Bisa mengelola kas dan iuran' },
  { id: 'umkm', label: 'UMKM', description: 'Bisa mengelola data UMKM' },
  { id: 'admin', label: 'Admin & Sistem', description: 'Bisa mengelola pengguna dan pengaturan' },
  { id: 'service', label: 'Layanan Warga', description: 'Bisa mengelola surat dan laporan' },
];

interface ProfileData {
  rt_name: string;
  address: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  contact_phone?: string;
  logo_url: string | null;
  structure_image_url: string | null;
}

interface CctvData {
  id?: number;
  label: string;
  stream_url: string;
  location?: string;
  is_active: boolean;
}

export default function SettingsPage() {
  const { isDemo, isExpired } = useTenant();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  // Data States
  const [profile, setProfile] = useState<ProfileData>({
    rt_name: '', address: '', province: '', city: '', district: '', subdistrict: '', postal_code: '', contact_phone: '', logo_url: null, structure_image_url: null
  });

  // RT/RW Split State
  const [rtValue, setRtValue] = useState('');
  const [rwValue, setRwValue] = useState('');

  // Sync RT/RW to rt_name
  useEffect(() => {
    const rt = rtValue.replace(/\D/g, '').slice(0, 3);
    const rw = rwValue.replace(/\D/g, '').slice(0, 3);
    if (rt || rw) {
        setProfile(prev => ({
            ...prev,
            rt_name: `RT ${rt.padStart(3, '0')} RW ${rw.padStart(3, '0')}`
        }));
    }
  }, [rtValue, rwValue]);

  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [fees, setFees] = useState<FeeData[]>([]);
  const [letterTypes, setLetterTypes] = useState<LetterTypeData[]>([]);
  const [wargas, setWargas] = useState<any[]>([]);
  const [cctvs, setCctvs] = useState<CctvData[]>([]);

  // Modal States
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<WalletData | null>(null);
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<ActivityData | null>(null);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminData | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleData | null>(null);

  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [currentFee, setCurrentFee] = useState<FeeData | null>(null);

  const [isLetterTypeModalOpen, setIsLetterTypeModalOpen] = useState(false);
  const [currentLetterType, setCurrentLetterType] = useState<LetterTypeData | null>(null);

  const [isCctvModalOpen, setIsCctvModalOpen] = useState(false);
  const [currentCctv, setCurrentCctv] = useState<CctvData | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'wallet' | 'activity' | 'admin' | 'role' | 'fee' | 'letter-type' | 'cctv' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: number, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Region Data States
  const [provinces, setProvinces] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [subdistricts, setSubdistricts] = useState<Record<string, string>>({});

  // Helper to find code by name
  const findCodeByName = (data: Record<string, string>, name: string) => {
    if (!name) return '';
    return Object.keys(data).find(key => data[key].toUpperCase() === name.toUpperCase()) || '';
  };

  // File Upload Refs & Previews
  const logoInputRef = useRef<HTMLInputElement>(null);
  const structureInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [structurePreview, setStructurePreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [structureFile, setStructureFile] = useState<File | null>(null);

  // Fetch Functions
  const fetchProfile = async () => {
    try {
      const res = await axios.get('/settings/profile');
      setProfile(res.data);
      if (res.data.logo_url) setLogoPreview(getImageUrl(res.data.logo_url));
      if (res.data.structure_image_url) setStructurePreview(getImageUrl(res.data.structure_image_url));

      // Parse RT/RW from rt_name if available
      if (res.data.rt_name) {
        const match = res.data.rt_name.match(/RT\s+(\d+)\s+RW\s+(\d+)/i);
        if (match) {
          setRtValue(match[1]);
          setRwValue(match[2]);
        }
      }
    } catch (error) { console.error("Error fetching profile", error); }
  };

  const fetchWallets = async () => {
    try { const res = await axios.get('/settings/wallets'); setWallets(res.data); } catch (error) { console.error(error); }
  };

  const fetchActivities = async () => {
    try { const res = await axios.get('/settings/activities'); setActivities(res.data); } catch (error) { console.error(error); }
  };

  const fetchAdmins = async () => {
    try { const res = await axios.get('/settings/admins'); setAdmins(res.data); } catch (error) { console.error(error); }
  };

  const fetchRoles = async () => {
    try { const res = await axios.get('/settings/roles'); setRoles(res.data); } catch (error) { console.error(error); }
  };

  const fetchFees = async () => {
    try { const res = await axios.get('/fees'); setFees(res.data); } catch (error) { console.error(error); }
  };

  const fetchLetterTypes = async () => {
    try { const res = await axios.get('/letter-types'); setLetterTypes(res.data.data); } catch (error) { console.error(error); }
  };

  const fetchWargas = async () => {
    try { const res = await axios.get('/warga?all=true'); setWargas(res.data.data || []); } catch (error) { console.error(error); }
  };

  const fetchCctvs = async () => {
    try { const res = await axios.get('/cctvs'); setCctvs(res.data.data); } catch (error) { console.error(error); }
  };

  // Region Fetch Functions
  const fetchProvinces = async () => {
    try {
      const response = await axios.get('/regions/provinces');
      if (response.data.success) {
        setProvinces(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch provinces', error);
    }
  };

  const fetchCities = async (provinceCode: string) => {
    try {
      const response = await axios.get(`/regions/cities/${provinceCode}`);
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cities', error);
    }
  };

  const fetchDistricts = async (cityCode: string) => {
    try {
      const response = await axios.get(`/regions/districts/${cityCode}`);
      if (response.data.success) {
        setDistricts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch districts', error);
    }
  };

  const fetchSubdistricts = async (districtCode: string) => {
    try {
      const response = await axios.get(`/regions/villages/${districtCode}`);
      if (response.data.success) {
        setSubdistricts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch subdistricts', error);
    }
  };

  const handleRegionChange = (level: 'province' | 'city' | 'district' | 'subdistrict', value: string, name: string) => {
    const newProfile = { ...profile };
    
    // Reset lower levels when upper level changes
    if (level === 'province') {
      newProfile.province = name;
      newProfile.city = '';
      newProfile.district = '';
      newProfile.subdistrict = '';
      setCities({});
      setDistricts({});
      setSubdistricts({});
      if (value) fetchCities(value);
    } else if (level === 'city') {
      newProfile.city = name;
      newProfile.district = '';
      newProfile.subdistrict = '';
      setDistricts({});
      setSubdistricts({});
      if (value) fetchDistricts(value);
    } else if (level === 'district') {
      newProfile.district = name;
      newProfile.subdistrict = '';
      setSubdistricts({});
      if (value) fetchSubdistricts(value);
    } else if (level === 'subdistrict') {
      newProfile.subdistrict = name;
    }

    setProfile(newProfile);
  };

  useEffect(() => {
    // Initial fetch for provinces
    fetchProvinces();
  }, []);

  // Cascading Effects for Regions (Initial Load Logic)
  useEffect(() => {
    if (profile.province && Object.keys(provinces).length > 0) {
      const code = findCodeByName(provinces, profile.province);
      if (code) fetchCities(code);
    }
  }, [profile.province, provinces]);

  useEffect(() => {
    if (profile.city && Object.keys(cities).length > 0) {
      const code = findCodeByName(cities, profile.city);
      if (code) fetchDistricts(code);
    }
  }, [profile.city, cities]);

  useEffect(() => {
    if (profile.district && Object.keys(districts).length > 0) {
      const code = findCodeByName(districts, profile.district);
      if (code) fetchSubdistricts(code);
    }
  }, [profile.district, districts]);

  useEffect(() => {
    const loadTab = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'profile':
            if (!profile.rt_name) await fetchProfile();
            break;
          case 'wallets':
            if (wallets.length === 0) await fetchWallets();
            break;
          case 'activities':
            if (activities.length === 0) await fetchActivities();
            break;
          case 'admins':
            if (admins.length === 0) await fetchAdmins();
            if (wargas.length === 0) await fetchWargas();
            break;
          case 'roles':
            if (roles.length === 0) await fetchRoles();
            break;
          case 'fees':
            if (fees.length === 0) await fetchFees();
            break;
          case 'letter-types':
            if (letterTypes.length === 0) await fetchLetterTypes();
            break;
          case 'cctv':
            if (cctvs.length === 0) await fetchCctvs();
            break;
        }
      } catch (error) {
        console.error("Error loading tab data", error);
      } finally {
        setLoading(false);
      }
    };
    loadTab();
  }, [activeTab]);

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/storage/${cleanPath}`;
  };

  // --- Profile Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'structure') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(previewUrl);
      } else {
        setStructureFile(file);
        setStructurePreview(previewUrl);
      }
    }
  };

  const saveProfile = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan profil');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    const toastId = toast.loading('Menyimpan profil...');
    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([key, value]) => {
        if (value !== null && key !== 'logo_url' && key !== 'structure_image_url') {
          formData.append(key, value as string);
        }
      });
      if (logoFile) formData.append('logo', logoFile);
      if (structureFile) formData.append('structure_image', structureFile);

      await axios.post('/settings/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Profil berhasil disimpan', { id: toastId });
      fetchProfile();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan profil', { id: toastId });
    }
  };

  // --- Wallet Logic ---
  const openWalletModal = (wallet?: WalletData) => {
    setCurrentWallet(wallet || { name: '', type: 'CASH', balance: 0 });
    setIsWalletModalOpen(true);
  };

  const saveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan dompet');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!currentWallet) return;
    const toastId = toast.loading('Menyimpan dompet...');
    try {
      if (currentWallet.id) {
        await axios.put(`/settings/wallets/${currentWallet.id}`, currentWallet);
      } else {
        await axios.post('/settings/wallets', currentWallet);
      }
      toast.success('Data dompet tersimpan', { id: toastId });
      setIsWalletModalOpen(false);
      fetchWallets();
    } catch (error) {
        console.error(error);
        toast.error('Gagal menyimpan dompet', { id: toastId });
    }
  };

  // --- Activity Logic ---
  const openActivityModal = (activity?: ActivityData) => {
    setCurrentActivity(activity || { name: '', description: '' });
    setIsActivityModalOpen(true);
  };

  const saveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan kategori');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!currentActivity) return;
    const toastId = toast.loading('Menyimpan kategori...');
    try {
      if (currentActivity.id) {
         await axios.put(`/settings/activities/${currentActivity.id}`, currentActivity);
      } else {
         await axios.post('/settings/activities', currentActivity);
      }
      toast.success('Kategori tersimpan', { id: toastId });
      setIsActivityModalOpen(false);
      fetchActivities();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan kategori', { id: toastId });
    }
  };

  // --- Admin Logic ---
  const openAdminModal = (admin?: AdminData) => {
    setCurrentAdmin(admin || { name: '', email: '', phone: '', role: 'ADMIN_RT' });
    setIsAdminModalOpen(true);
  };

  const saveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan admin');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!currentAdmin) return;
    
    const toastId = toast.loading('Menyimpan admin...');
    try {
      if (currentAdmin.id) {
        await axios.put(`/settings/admins/${currentAdmin.id}`, currentAdmin);
      } else {
        await axios.post('/settings/admins', currentAdmin);
      }
      toast.success('Data admin tersimpan', { id: toastId });
      setIsAdminModalOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan admin', { id: toastId });
    }
  };

  // --- Role Logic ---
  const openRoleModal = (role?: RoleData) => {
    if (role) {
      setCurrentRole(role);
    } else {
      setCurrentRole({ 
        name: '', 
        label: '', 
        description: '', 
        is_system: false,
        scope: 'RT',
        permissions: []
      });
    }
    setIsRoleModalOpen(true);
  };

  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan peran');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!currentRole) return;
    
    const toastId = toast.loading('Menyimpan peran...');
    try {
      if (currentRole.id) {
        await axios.put(`/settings/roles/${currentRole.id}`, currentRole);
      } else {
        await axios.post('/settings/roles', currentRole);
      }
      toast.success('Peran tersimpan', { id: toastId });
      setIsRoleModalOpen(false);
      fetchRoles();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan peran', { id: toastId });
    }
  };

  // --- Fee Logic ---
  const openFeeModal = (fee?: FeeData) => {
    setCurrentFee(fee || { name: '', amount: 0, is_mandatory: true });
    setIsFeeModalOpen(true);
  };

  const saveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan iuran');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!currentFee) return;

    const toastId = toast.loading('Menyimpan iuran...');
    try {
      if (currentFee.id) {
        await axios.put(`/fees/${currentFee.id}`, currentFee);
      } else {
        await axios.post('/fees', currentFee);
      }
      toast.success('Data iuran tersimpan', { id: toastId });
      setIsFeeModalOpen(false);
      fetchFees();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan iuran', { id: toastId });
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // --- Letter Type Logic ---
  const openLetterTypeModal = (type?: LetterTypeData) => {
    setCurrentLetterType(type || { name: '', description: '', is_active: true });
    setIsLetterTypeModalOpen(true);
  };

  const saveLetterType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan jenis surat');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!currentLetterType) return;

    const toastId = toast.loading('Menyimpan jenis surat...');
    try {
      if (currentLetterType.id) {
        await axios.put(`/letter-types/${currentLetterType.id}`, currentLetterType);
      } else {
        await axios.post('/letter-types', currentLetterType);
      }
      toast.success('Jenis surat tersimpan', { id: toastId });
      setIsLetterTypeModalOpen(false);
      fetchLetterTypes();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan jenis surat', { id: toastId });
    }
  };

  // --- CCTV Logic ---
  const openCctvModal = (cctv?: CctvData) => {
    setCurrentCctv(cctv || { label: '', stream_url: '', location: '', is_active: true });
    setIsCctvModalOpen(true);
  };

  const saveCctv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan CCTV');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!currentCctv) return;

    const toastId = toast.loading('Menyimpan CCTV...');
    try {
      if (currentCctv.id) {
        await axios.put(`/cctvs/${currentCctv.id}`, currentCctv);
      } else {
        await axios.post('/cctvs', currentCctv);
      }
      toast.success('CCTV tersimpan', { id: toastId });
      setIsCctvModalOpen(false);
      fetchCctvs();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan CCTV', { id: toastId });
    }
  };

  // --- Delete Logic ---
  const confirmDelete = (type: 'wallet' | 'activity' | 'admin' | 'role' | 'fee' | 'letter-type' | 'cctv', id: number, name: string) => {
    setDeleteType(type);
    setItemToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus item');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    if (!itemToDelete || !deleteType) return;
    
    setIsDeleting(true);
    try {
      let endpoint = '';
      if (deleteType === 'wallet') endpoint = `/settings/wallets/${itemToDelete.id}`;
      else if (deleteType === 'activity') endpoint = `/settings/activities/${itemToDelete.id}`;
      else if (deleteType === 'admin') endpoint = `/settings/admins/${itemToDelete.id}`;
      else if (deleteType === 'role') endpoint = `/settings/roles/${itemToDelete.id}`;
      else if (deleteType === 'fee') endpoint = `/fees/${itemToDelete.id}`;
      else if (deleteType === 'letter-type') endpoint = `/letter-types/${itemToDelete.id}`;
      else if (deleteType === 'cctv') endpoint = `/cctvs/${itemToDelete.id}`;

      await axios.delete(endpoint);
      toast.success('Item berhasil dihapus');
      
      if (deleteType === 'wallet') fetchWallets();
      else if (deleteType === 'activity') fetchActivities();
      else if (deleteType === 'admin') fetchAdmins();
      else if (deleteType === 'role') fetchRoles();
      else if (deleteType === 'fee') fetchFees();
      else if (deleteType === 'letter-type') fetchLetterTypes();
      else if (deleteType === 'cctv') fetchCctvs();

      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'Gagal menghapus item');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
      setDeleteType(null);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2.5 px-6 py-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
        activeTab === id 
          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/30' 
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/50 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Settings size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <Settings size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Pengaturan Sistem</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola profil RT, akun keuangan, kategori kegiatan, dan manajemen akses admin.
           </p>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex overflow-x-auto md:flex-wrap no-scrollbar">
            <TabButton id="profile" label="Profil RT" icon={Building2} />
            <TabButton id="wallets" label="Kas & Bank" icon={Wallet} />
            <TabButton id="activities" label="Kategori Kegiatan" icon={ListTodo} />
            <TabButton id="admins" label="Manajemen Admin" icon={Shield} />
            <TabButton id="roles" label="Manajemen Peran" icon={Users} />
            <TabButton id="fees" label="Manajemen Iuran" icon={Banknote} />
            <TabButton id="letter-types" label="Jenis Surat" icon={FileText} />
            <TabButton id="cctv" label="Pengaturan CCTV" icon={Cctv} />
          </div>
        </div>

        <div className="p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
              <p className="text-slate-500 font-medium">Memuat pengaturan...</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Profil RT */}
              {activeTab === 'profile' && (
                <div className="max-w-5xl space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-2 space-y-8">
                      <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <MapPin className="w-5 h-5" />
                          </div>
                          Informasi Wilayah
                        </h3>
                        <div className="grid grid-cols-1 gap-5">
                          <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nama RT <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RT</span>
                                    <input
                                        type="text"
                                        value={rtValue}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                            setRtValue(val);
                                        }}
                                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300"
                                        placeholder="000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nama RW <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RW</span>
                                    <input
                                        type="text"
                                        value={rwValue}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                            setRwValue(val);
                                        }}
                                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300"
                                        placeholder="000"
                                    />
                                </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Alamat Lengkap <span className="text-red-500">*</span></label>
                            <textarea
                              value={profile.address || ''}
                              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none text-slate-800 dark:text-slate-100"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Provinsi <span className="text-red-500">*</span></label>
                              <SearchableSelect
                                value={findCodeByName(provinces, profile.province)}
                                onChange={(value, label) => handleRegionChange('province', value, label)}
                                options={Object.entries(provinces).map(([code, name]) => ({ label: name, value: code }))}
                                placeholder="Pilih Provinsi"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kota/Kabupaten <span className="text-red-500">*</span></label>
                              <SearchableSelect
                                value={findCodeByName(cities, profile.city)}
                                onChange={(value, label) => handleRegionChange('city', value, label)}
                                options={Object.entries(cities).map(([code, name]) => ({ label: name, value: code }))}
                                placeholder="Pilih Kota/Kabupaten"
                                disabled={!profile.province}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kecamatan <span className="text-red-500">*</span></label>
                              <SearchableSelect
                                value={findCodeByName(districts, profile.district)}
                                onChange={(value, label) => handleRegionChange('district', value, label)}
                                options={Object.entries(districts).map(([code, name]) => ({ label: name, value: code }))}
                                placeholder="Pilih Kecamatan"
                                disabled={!profile.city}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kelurahan <span className="text-red-500">*</span></label>
                              <SearchableSelect
                                value={findCodeByName(subdistricts, profile.subdistrict)}
                                onChange={(value, label) => handleRegionChange('subdistrict', value, label)}
                                options={Object.entries(subdistricts).map(([code, name]) => ({ label: name, value: code }))}
                                placeholder="Pilih Kelurahan"
                                disabled={!profile.district}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kode Pos</label>
                              <input
                                type="text"
                                value={profile.postal_code || ''}
                                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 dark:text-slate-100"
                                placeholder="Contoh: 12345"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">No. WhatsApp Sekretariat</label>
                              <input
                                type="text"
                                value={profile.contact_phone || ''}
                                onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-slate-800 dark:text-slate-100"
                                placeholder="Contoh: 081234567890"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Images */}
                    <div className="space-y-6">
                      <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          Media & Branding
                        </h3>
                        
                        {/* Logo Upload */}
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Logo RT</label>
                          <div 
                            className="group relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-[2rem] p-6 text-center cursor-pointer hover:bg-white dark:hover:bg-slate-700 hover:border-emerald-400 transition-all duration-300 bg-white/50 dark:bg-slate-900/50"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            {logoPreview ? (
                                <div className="relative">
                                  <img src={logoPreview} alt="Logo Preview" className="mx-auto h-32 w-32 object-contain mb-2 drop-shadow-sm group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm">
                                    <Pencil className="w-8 h-8 text-white" />
                                  </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors">
                                      <Upload className="w-7 h-7" />
                                    </div>
                                    <span className="text-sm font-bold">Upload Logo</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">PNG, JPG (Max 2MB)</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={logoInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'logo')}
                            />
                          </div>
                        </div>

                        {/* Structure Upload */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Struktur Organisasi</label>
                          <div 
                            className="group relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-[2rem] p-6 text-center cursor-pointer hover:bg-white dark:hover:bg-slate-700 hover:border-emerald-400 transition-all duration-300 bg-white/50 dark:bg-slate-900/50"
                            onClick={() => structureInputRef.current?.click()}
                          >
                            {structurePreview ? (
                                <div className="relative">
                                  <img src={structurePreview} alt="Structure Preview" className="mx-auto h-32 object-contain mb-2 drop-shadow-sm group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm">
                                    <Pencil className="w-8 h-8 text-white" />
                                  </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors">
                                      <Upload className="w-7 h-7" />
                                    </div>
                                    <span className="text-sm font-bold">Upload Struktur</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">PNG, JPG (Max 2MB)</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={structureInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'structure')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
                    <button 
                      onClick={fetchProfile}
                      className="px-6 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={saveProfile}
                      className="bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center space-x-2 active:scale-95"
                    >
                      <Save className="w-5 h-5" />
                      <span>Simpan Perubahan</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Kas & Bank */}
              {activeTab === 'wallets' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Daftar Akun Keuangan</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Kelola dompet tunai dan rekening bank RT</p>
                    </div>
                    <button 
                      onClick={() => openWalletModal()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Tambah Akun</span>
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Nama Akun</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Tipe</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Detail Bank</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Saldo Saat Ini</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {wallets.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-8 py-16 text-center text-slate-500 dark:text-slate-400">
                              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                                <Wallet className="w-10 h-10" />
                              </div>
                              <p className="font-bold text-lg text-slate-700 dark:text-slate-200">Belum ada akun keuangan</p>
                              <p className="text-sm mt-1">Tambahkan akun kas atau bank baru.</p>
                            </td>
                          </tr>
                        ) : (
                          wallets.map(wallet => (
                            <tr key={wallet.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${wallet.type === 'CASH' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                    {wallet.type === 'CASH' ? <Banknote className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                                  </div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{wallet.name}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${
                                  wallet.type === 'CASH' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                                }`}>
                                  {wallet.type === 'CASH' ? 'Tunai' : 'Bank'}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-slate-600 dark:text-slate-400">
                                {wallet.type === 'BANK' ? (
                                  <div className="text-sm">
                                    <p className="font-bold text-slate-900 dark:text-slate-100">{wallet.bank_name}</p>
                                    <p className="font-mono text-xs text-slate-500 dark:text-slate-500 tracking-wide">{wallet.account_number}</p>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600 font-medium">-</span>
                                )}
                              </td>
                              <td className="px-8 py-5 font-mono font-bold text-slate-800 dark:text-slate-200 text-base">
                                Rp {wallet.balance.toLocaleString('id-ID')}
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => openWalletModal(wallet)}
                                    className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => confirmDelete('wallet', wallet.id!, wallet.name)}
                                    className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Kategori Kegiatan */}
              {activeTab === 'activities' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kategori Kegiatan</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Kelola jenis kegiatan untuk jadwal dan agenda</p>
                    </div>
                    <button 
                      onClick={() => openActivityModal()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Tambah Kategori</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activities.map(activity => (
                      <div key={activity.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm dark:shadow-none hover:shadow-xl hover:shadow-emerald-900/5 dark:hover:shadow-emerald-900/20 hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                            <ListTodo className="w-6 h-6" />
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openActivityModal(activity)}
                              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => confirmDelete('activity', activity.id!, activity.name)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-2">{activity.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{activity.description || 'Tidak ada deskripsi'}</p>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                          <ListTodo className="w-8 h-8" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Belum ada kategori kegiatan</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Manajemen Admin */}
              {activeTab === 'admins' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manajemen Admin</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Kelola pengguna yang memiliki akses ke dashboard admin</p>
                    </div>
                    <button 
                      onClick={() => openAdminModal()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Tambah Admin</span>
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Admin</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Kontak</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Peran</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {admins.map(admin => (
                          <tr key={admin.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 text-lg">
                                  {admin.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{admin.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{admin.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-medium">
                              {admin.phone}
                            </td>
                            <td className="px-8 py-5">
                              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${
                                admin.role === 'ADMIN_RT' 
                                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800' 
                                  : admin.role === 'SECRETARY'
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                                  : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800'
                              }`}>
                                {admin.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openAdminModal(admin)}
                                  className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => confirmDelete('admin', admin.id!, admin.name)}
                                  className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 5: Manajemen Peran */}
              {activeTab === 'roles' && (
                <div className="max-w-5xl space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Daftar Peran</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola peran dan hak akses pengguna sistem</p>
                    </div>
                    <button 
                       onClick={() => openRoleModal()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Tambah Peran</span>
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Nama Peran & Scope</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Hak Akses</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Deskripsi</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {roles.map(role => {
                          const scopeInfo = SCOPE_OPTIONS.find(s => s.id === role.scope) || SCOPE_OPTIONS[0];
                          const accessSummary = role.permissions && role.permissions.length > 0 
                            ? role.permissions.map(p => PERMISSION_GROUPS.find(g => g.id === p)?.label || p).join(', ')
                            : 'Tidak ada akses khusus';

                          return (
                          <tr key={role.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{role.label}</span>
                                  {role.is_system && (
                                    <div className="group/tooltip relative">
                                      <Shield size={16} className="text-slate-400" />
                                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        Peran Bawaan Sistem
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${scopeInfo.color}`}>
                                    {scopeInfo.badge}
                                  </span>
                                  <span className="text-xs font-mono text-slate-400">{role.name}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-[250px] truncate" title={accessSummary}>
                                Akses: {accessSummary}
                              </p>
                            </td>
                            <td className="px-8 py-5 text-slate-600 dark:text-slate-400 text-sm">
                              {role.description || '-'}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => openRoleModal(role)}
                                  className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {!role.is_system && (
                                  <button 
                                    onClick={() => confirmDelete('role', role.id!, role.label)}
                                    className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 6: Manajemen Iuran */}
              {activeTab === 'fees' && (
                <div className="max-w-5xl space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Daftar Iuran</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola jenis iuran wajib dan sukarela untuk warga</p>
                    </div>
                    <button 
                       onClick={() => openFeeModal()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Tambah Iuran</span>
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Nama Iuran</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Nominal</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Sifat</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {fees.map(fee => (
                          <tr key={fee.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-8 py-5">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{fee.name}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                {formatRupiah(fee.amount)}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              {fee.is_mandatory ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <AlertCircle size={12} /> Wajib
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 size={12} /> Sukarela
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openFeeModal(fee)}
                                  className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => confirmDelete('fee', fee.id!, fee.name)}
                                  className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {fees.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-8 py-16 text-center text-slate-500 dark:text-slate-400">
                              Belum ada data iuran
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 7: Jenis Surat */}
              {activeTab === 'letter-types' && (
                <div className="max-w-5xl space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Jenis Surat</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola jenis surat yang tersedia untuk warga</p>
                    </div>
                    <button 
                       onClick={() => openLetterTypeModal()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Tambah Jenis</span>
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Nama Surat</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Kode</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">Status</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {letterTypes.map(type => (
                          <tr key={type.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-8 py-5">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">{type.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{type.description || '-'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                {type.code || '-'}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              {type.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 size={12} /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <X size={12} /> Nonaktif
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openLetterTypeModal(type)}
                                  className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => confirmDelete('letter-type', type.id!, type.name)}
                                  className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {letterTypes.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-8 py-16 text-center text-slate-500 dark:text-slate-400">
                              Belum ada data jenis surat
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 8: CCTV */}
              {activeTab === 'cctv' && (
                <div className="max-w-5xl space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pengaturan CCTV</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola kamera CCTV yang ditampilkan di dashboard dan widget</p>
                    </div>
                    <button 
                       onClick={() => openCctvModal()}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Tambah CCTV</span>
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">Label Kamera</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">URL Stream</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">Lokasi</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">Status</th>
                          <th className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {cctvs.map(cctv => (
                          <tr key={cctv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                            <td className="px-8 py-5">
                              <span className="font-bold text-slate-800 dark:text-white">{cctv.label}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded max-w-[200px] truncate block" title={cctv.stream_url}>
                                {cctv.stream_url}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-slate-600 dark:text-slate-300 text-sm">{cctv.location || '-'}</span>
                            </td>
                            <td className="px-8 py-5">
                              {cctv.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 size={12} /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <X size={12} /> Nonaktif
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openCctvModal(cctv)}
                                  className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => confirmDelete('cctv', cctv.id!, cctv.label)}
                                  className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {cctvs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-8 py-16 text-center text-slate-500 dark:text-slate-400">
                              Belum ada data CCTV
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Wallet Modal */}
      {isWalletModalOpen && currentWallet && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentWallet.id ? 'Edit Akun' : 'Tambah Akun'}
              </h3>
              <button onClick={() => setIsWalletModalOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveWallet} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Akun</label>
                <input
                  type="text"
                  required
                  value={currentWallet.name}
                  onChange={(e) => setCurrentWallet({ ...currentWallet, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="Contoh: Kas RT, Bank BRI"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tipe Akun</label>
                <select
                  value={currentWallet.type}
                  onChange={(e) => setCurrentWallet({ ...currentWallet, type: e.target.value as 'CASH' | 'BANK' })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                >
                  <option value="CASH">Tunai (Cash)</option>
                  <option value="BANK">Rekening Bank</option>
                </select>
              </div>
              
              {currentWallet.type === 'BANK' && (
                <div className="space-y-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Bank</label>
                    <input
                      type="text"
                      value={currentWallet.bank_name || ''}
                      onChange={(e) => setCurrentWallet({ ...currentWallet, bank_name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                      placeholder="Contoh: Bank BRI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nomor Rekening</label>
                    <input
                      type="text"
                      value={currentWallet.account_number || ''}
                      onChange={(e) => setCurrentWallet({ ...currentWallet, account_number: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                      placeholder="Nomor rekening bank"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  required
                  value={currentWallet.balance}
                  onChange={(e) => setCurrentWallet({ ...currentWallet, balance: Number(e.target.value) })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  min="0"
                />
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {isActivityModalOpen && currentActivity && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentActivity.id ? 'Edit Kategori' : 'Tambah Kategori'}
              </h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveActivity} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Kategori</label>
                <input
                  type="text"
                  required
                  value={currentActivity.name}
                  onChange={(e) => setCurrentActivity({ ...currentActivity, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="Contoh: Kerja Bakti"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deskripsi</label>
                <textarea
                  value={currentActivity.description || ''}
                  onChange={(e) => setCurrentActivity({ ...currentActivity, description: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium resize-none text-slate-800 dark:text-white"
                  rows={3}
                  placeholder="Keterangan singkat tentang kategori ini"
                />
              </div>
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {isAdminModalOpen && currentAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentAdmin.id ? 'Edit Admin' : 'Tambah Admin'}
              </h3>
              <button onClick={() => setIsAdminModalOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveAdmin} className="space-y-6">
              
              {/* Source Selection for New Admin */}
              {!currentAdmin.id && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900">
                    <label className="block text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2">Sumber Data Admin</label>
                    <select
                        value={currentAdmin.user_id || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                                const w = wargas.find(w => w.id === Number(val));
                                if (w) {
                                    // Heuristic to detect swapped data or wrong placement
                                    let email = w.email || '';
                                    let phone = w.phone || '';

                                    // If email looks like a phone number (mostly digits, no @)
                                    const emailIsPhone = /^[\d\+\-\(\)\s]+$/.test(email) && !email.includes('@');
                                    // If phone looks like an email (has @)
                                    const phoneIsEmail = phone.includes('@');

                                    if (emailIsPhone && phoneIsEmail) {
                                        // Completely swapped
                                        const temp = email;
                                        email = phone;
                                        phone = temp;
                                    } else if (emailIsPhone && !phone) {
                                        // Email field has phone, phone field is empty -> Move it
                                        phone = email;
                                        email = '';
                                    }

                                    setCurrentAdmin({
                                        ...currentAdmin,
                                        user_id: w.id,
                                        name: w.name,
                                        email: email,
                                        phone: phone
                                    });
                                }
                            } else {
                                // Reset to manual
                                setCurrentAdmin({
                                    ...currentAdmin,
                                    user_id: undefined,
                                    name: '',
                                    email: '',
                                    phone: ''
                                });
                            }
                        }}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-emerald-900 dark:text-emerald-100 font-medium"
                    >
                        <option value="">+ Buat Admin Baru (Manual)</option>
                        <optgroup label="Pilih dari Warga">
                            {wargas.map(w => (
                                <option key={w.id} value={w.id}>{w.name} - {w.address_block || w.email}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  readOnly={!!currentAdmin.user_id}
                  value={currentAdmin.name}
                  onChange={(e) => setCurrentAdmin({ ...currentAdmin, name: e.target.value })}
                  className={`w-full px-5 py-3.5 border rounded-2xl transition-all outline-none font-medium text-slate-800 dark:text-white ${
                      currentAdmin.user_id 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  readOnly={!!currentAdmin.user_id}
                  value={currentAdmin.email}
                  onChange={(e) => setCurrentAdmin({ ...currentAdmin, email: e.target.value })}
                  className={`w-full px-5 py-3.5 border rounded-2xl transition-all outline-none font-medium text-slate-800 dark:text-white ${
                      currentAdmin.user_id 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nomor Telepon</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  readOnly={!!currentAdmin.user_id}
                  value={currentAdmin.phone}
                  onChange={(e) => setCurrentAdmin({ ...currentAdmin, phone: e.target.value })}
                  className={`w-full px-5 py-3.5 border rounded-2xl transition-all outline-none font-medium text-slate-800 dark:text-white ${
                      currentAdmin.user_id 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Peran</label>
                <select
                  value={currentAdmin.role}
                  onChange={(e) => setCurrentAdmin({ ...currentAdmin, role: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                >
                  <option value="" disabled>Pilih Peran</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>{role.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {isRoleModalOpen && currentRole && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-2xl w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700 my-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {currentRole.id ? 'Edit Peran' : 'Tambah Peran'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Atur hak akses dan cakupan data peran ini.</p>
              </div>
              <button onClick={() => setIsRoleModalOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={saveRole} className="space-y-8">
              {/* Section 1: Identitas Peran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Peran (Label)</label>
                  <input
                    type="text"
                    required
                    value={currentRole.label}
                    onChange={(e) => setCurrentRole({ ...currentRole, label: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                    placeholder="Contoh: Seksi Kebersihan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kode Peran (Key)</label>
                  <input
                    type="text"
                    required
                    disabled={!!currentRole.id}
                    value={currentRole.name}
                    onChange={(e) => setCurrentRole({ ...currentRole, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    className={`w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white ${currentRole.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="Contoh: SEKSI_KEBERSIHAN"
                  />
                  <p className="text-xs text-slate-400 mt-2 ml-1">Format: HURUF_BESAR (Unik)</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deskripsi (Opsional)</label>
                  <input
                    type="text"
                    value={currentRole.description || ''}
                    onChange={(e) => setCurrentRole({ ...currentRole, description: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                    placeholder="Keterangan singkat peran"
                  />
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Section 2: Scope Peran */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                  Scope Peran (Wajib) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {SCOPE_OPTIONS.map((option) => (
                    <div 
                      key={option.id}
                      onClick={() => setCurrentRole({...currentRole, scope: option.id as any})}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                        currentRole.scope === option.id 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          currentRole.scope === option.id ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {currentRole.scope === option.id && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${option.color}`}>{option.badge}</span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Section 3: Hak Akses */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                  Hak Akses (Checklist)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PERMISSION_GROUPS.map((group) => {
                    const isSelected = currentRole.permissions.includes(group.id);
                    return (
                      <label 
                        key={group.id} 
                        className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/50' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-200'
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={isSelected}
                          onChange={(e) => {
                            const newPermissions = e.target.checked 
                              ? [...currentRole.permissions, group.id]
                              : currentRole.permissions.filter(p => p !== group.id);
                            setCurrentRole({...currentRole, permissions: newPermissions});
                          }}
                        />
                        <div>
                          <span className={`block font-bold text-sm ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {group.label}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {isSelected ? '✔ Bisa lihat & kelola' : '✖ Tidak bisa akses'}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 flex gap-4 sticky bottom-0 bg-white dark:bg-slate-900 pb-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Simpan Peran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fee Modal */}
      {isFeeModalOpen && currentFee && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentFee.id ? 'Edit Iuran' : 'Tambah Iuran'}
              </h3>
              <button onClick={() => setIsFeeModalOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveFee} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Iuran</label>
                <input
                  type="text"
                  required
                  value={currentFee.name}
                  onChange={(e) => setCurrentFee({ ...currentFee, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="Contoh: Iuran Kebersihan"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  value={currentFee.amount}
                  onChange={(e) => setCurrentFee({ ...currentFee, amount: Number(e.target.value) })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sifat Iuran</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${currentFee.is_mandatory ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                    <input
                      type="radio"
                      className="hidden"
                      checked={currentFee.is_mandatory}
                      onChange={() => setCurrentFee({ ...currentFee, is_mandatory: true })}
                    />
                    <AlertCircle size={20} />
                    <span className="font-bold">Wajib</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${!currentFee.is_mandatory ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                    <input
                      type="radio"
                      className="hidden"
                      checked={!currentFee.is_mandatory}
                      onChange={() => setCurrentFee({ ...currentFee, is_mandatory: false })}
                    />
                    <CheckCircle2 size={20} />
                    <span className="font-bold">Sukarela</span>
                  </label>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Letter Type Modal */}
      {isLetterTypeModalOpen && currentLetterType && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentLetterType.id ? 'Edit Jenis Surat' : 'Tambah Jenis Surat'}
              </h3>
              <button onClick={() => setIsLetterTypeModalOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveLetterType} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Surat</label>
                <input
                  type="text"
                  required
                  value={currentLetterType.name}
                  onChange={(e) => setCurrentLetterType({ ...currentLetterType, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="Contoh: Surat Pengantar KTP"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kode Surat (Opsional)</label>
                <input
                  type="text"
                  value={currentLetterType.code || ''}
                  onChange={(e) => setCurrentLetterType({ ...currentLetterType, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="Contoh: PENGANTAR_KTP"
                />
                <p className="text-xs text-slate-400 mt-2 ml-1">Kode unik untuk referensi sistem. Gunakan huruf besar & underscore.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deskripsi</label>
                <textarea
                  value={currentLetterType.description || ''}
                  onChange={(e) => setCurrentLetterType({ ...currentLetterType, description: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium resize-none text-slate-800 dark:text-white"
                  rows={3}
                  placeholder="Keterangan singkat tentang jenis surat ini"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${currentLetterType.is_active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                    <input
                      type="radio"
                      className="hidden"
                      checked={currentLetterType.is_active}
                      onChange={() => setCurrentLetterType({ ...currentLetterType, is_active: true })}
                    />
                    <CheckCircle2 size={20} />
                    <span className="font-bold">Aktif</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${!currentLetterType.is_active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                    <input
                      type="radio"
                      className="hidden"
                      checked={!currentLetterType.is_active}
                      onChange={() => setCurrentLetterType({ ...currentLetterType, is_active: false })}
                    />
                    <X size={20} />
                    <span className="font-bold">Nonaktif</span>
                  </label>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsLetterTypeModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CCTV Modal */}
      {isCctvModalOpen && currentCctv && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {currentCctv.id ? 'Edit CCTV' : 'Tambah CCTV'}
              </h3>
              <button onClick={() => setIsCctvModalOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveCctv} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Label Kamera</label>
                <input
                  type="text"
                  required
                  value={currentCctv.label}
                  onChange={(e) => setCurrentCctv({ ...currentCctv, label: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="Contoh: Gerbang Utama"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">URL Stream</label>
                <input
                  type="text"
                  required
                  value={currentCctv.stream_url}
                  onChange={(e) => setCurrentCctv({ ...currentCctv, stream_url: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="https://..."
                />
                <p className="text-xs text-slate-400 mt-2 ml-1">Mendukung format HLS (.m3u8) atau MP4.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Lokasi (Opsional)</label>
                <input
                  type="text"
                  value={currentCctv.location || ''}
                  onChange={(e) => setCurrentCctv({ ...currentCctv, location: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium text-slate-800 dark:text-white"
                  placeholder="Contoh: Pos Satpam"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${currentCctv.is_active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                    <input
                      type="radio"
                      className="hidden"
                      checked={currentCctv.is_active}
                      onChange={() => setCurrentCctv({ ...currentCctv, is_active: true })}
                    />
                    <CheckCircle2 size={20} />
                    <span className="font-bold">Aktif</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${!currentCctv.is_active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                    <input
                      type="radio"
                      className="hidden"
                      checked={!currentCctv.is_active}
                      onChange={() => setCurrentCctv({ ...currentCctv, is_active: false })}
                    />
                    <X size={20} />
                    <span className="font-bold">Nonaktif</span>
                  </label>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsCctvModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-3xl mx-auto mb-6">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">Hapus Data?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-800 dark:text-slate-200">"{itemToDelete.name}"</span>? 
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
                onClick={handleDelete}
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
