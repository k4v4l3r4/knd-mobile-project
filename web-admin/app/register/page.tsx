'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import { 
  User,
  Phone,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Building,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import api from '@/lib/api';
import { useTenant } from '@/context/TenantContext';
import { SearchableSelect } from '@/components/ui/searchable-select';

export default function RegisterPage() {
    const router = useRouter();
    const { refreshStatus } = useTenant();
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        province: '',
        city: '',
        district: '',
        subdistrict: '',
        postal_code: '',
        password: '',
        confirmPassword: '',
        rt_number: '',
        rw_number: '',
        rt_name: ''
    });

    const [provinces, setProvinces] = useState<Record<string, string>>({});
    const [cities, setCities] = useState<Record<string, string>>({});
    const [districts, setDistricts] = useState<Record<string, string>>({});
    const [subdistricts, setSubdistricts] = useState<Record<string, string>>({});
    const [regionCodes, setRegionCodes] = useState({
        province: '',
        city: '',
        district: '',
        subdistrict: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const fetchProvinces = async () => {
        try {
            const res = await api.get('/regions/provinces');
            if (res.data.success) {
                setProvinces(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch provinces', err);
        }
    };

    const fetchCities = async (provinceCode: string) => {
        try {
            if (!provinceCode) {
                setCities({});
                return;
            }
            const res = await api.get(`/regions/cities/${provinceCode}`);
            if (res.data.success) {
                setCities(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch cities', err);
        }
    };

    const fetchDistricts = async (cityCode: string) => {
        try {
            if (!cityCode) {
                setDistricts({});
                return;
            }
            const res = await api.get(`/regions/districts/${cityCode}`);
            if (res.data.success) {
                setDistricts(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch districts', err);
        }
    };

    const fetchSubdistricts = async (districtCode: string) => {
        try {
            if (!districtCode) {
                setSubdistricts({});
                return;
            }
            const res = await api.get(`/regions/villages/${districtCode}`);
            if (res.data.success) {
                setSubdistricts(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch subdistricts', err);
        }
    };

    const handleRegionChange = (type: 'province' | 'city' | 'district' | 'subdistrict', code: string, label: string) => {
        if (type === 'province') {
            setFormData(prev => ({
                ...prev,
                province: label,
                city: '',
                district: '',
                subdistrict: ''
            }));
            setRegionCodes({
                province: code,
                city: '',
                district: '',
                subdistrict: ''
            });
            setCities({});
            setDistricts({});
            setSubdistricts({});
            if (code) {
                fetchCities(code);
            }
        } else if (type === 'city') {
            setFormData(prev => ({
                ...prev,
                city: label,
                district: '',
                subdistrict: ''
            }));
            setRegionCodes(prev => ({
                ...prev,
                city: code,
                district: '',
                subdistrict: ''
            }));
            setDistricts({});
            setSubdistricts({});
            if (code) {
                fetchDistricts(code);
            }
        } else if (type === 'district') {
            setFormData(prev => ({
                ...prev,
                district: label,
                subdistrict: ''
            }));
            setRegionCodes(prev => ({
                ...prev,
                district: code,
                subdistrict: ''
            }));
            setSubdistricts({});
            if (code) {
                fetchSubdistricts(code);
            }
        } else if (type === 'subdistrict') {
            setFormData(prev => ({
                ...prev,
                subdistrict: label
            }));
            setRegionCodes(prev => ({
                ...prev,
                subdistrict: code
            }));
        }
        if (errors[type]) {
            setErrors(prev => ({ ...prev, [type]: '' }));
        }
    };

    useEffect(() => {
        fetchProvinces();
    }, []);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (!formData.name.trim()) {
            newErrors.name = "Nama lengkap wajib diisi";
            isValid = false;
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Nomor WhatsApp wajib diisi";
            isValid = false;
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email wajib diisi";
            isValid = false;
        }

        if (!formData.address.trim()) {
            newErrors.address = "Alamat lengkap wajib diisi";
            isValid = false;
        }

        if (!formData.province.trim()) {
            newErrors.province = "Provinsi wajib diisi";
            isValid = false;
        }

        if (!formData.city.trim()) {
            newErrors.city = "Kota/Kabupaten wajib diisi";
            isValid = false;
        }

        if (!formData.district.trim()) {
            newErrors.district = "Kecamatan wajib diisi";
            isValid = false;
        }

        if (!formData.subdistrict.trim()) {
            newErrors.subdistrict = "Kelurahan wajib diisi";
            isValid = false;
        }

        if (!formData.postal_code.trim()) {
            newErrors.postal_code = "Kode Pos wajib diisi";
            isValid = false;
        }

        if (!formData.password) {
            newErrors.password = "Kata sandi wajib diisi";
            isValid = false;
        } else if (formData.password.length < 6) {
            newErrors.password = "Kata sandi minimal 6 karakter";
            isValid = false;
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Konfirmasi kata sandi tidak cocok";
            isValid = false;
        }

        if (!formData.rt_number.trim()) {
            newErrors.rt_number = "Nomor RT wajib diisi";
            isValid = false;
        }

        if (!formData.rw_number.trim()) {
            newErrors.rw_number = "Nomor RW wajib diisi";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const response = await api.post('/register', {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                province: formData.province,
                city: formData.city,
                district: formData.district,
                subdistrict: formData.subdistrict,
                postal_code: formData.postal_code,
                password: formData.password,
                rt_number: formData.rt_number,
                rw_number: formData.rw_number,
                rt_name: formData.rt_name || undefined,
                level: 'RT'
            });

            if (response.data.success || response.status === 201) {
                const token = response.data.data.token;
                Cookies.set('admin_token', token, { expires: 1, path: '/' });
                await refreshStatus();
                toast.success('Pendaftaran berhasil! Mengalihkan...');
                router.push('/dashboard');
            } else {
                setErrors({ general: response.data.message || 'Pendaftaran gagal.' });
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            let message = "Terjadi kesalahan sistem. Silakan coba lagi.";
            
            if (error.response) {
                if (error.response.data && error.response.data.message) {
                    message = error.response.data.message;
                } else {
                    message = `Server Error: ${error.response.status}`;
                }

                if (error.response.data && error.response.data.errors) {
                    const backendErrors = error.response.data.errors;
                    const newErrors: { [key: string]: string } = {};
                    Object.keys(backendErrors).forEach(key => {
                        newErrors[key] = backendErrors[key][0];
                    });
                    setErrors(prev => ({ ...prev, ...newErrors }));

                    const allMessages: string[] = [];
                    Object.keys(backendErrors).forEach(key => {
                        const arr = backendErrors[key];
                        if (Array.isArray(arr)) {
                            arr.forEach((m: string) => {
                                if (m && allMessages.indexOf(m) === -1) {
                                    allMessages.push(m);
                                }
                            });
                        }
                    });

                    if (backendErrors.phone && Array.isArray(backendErrors.phone)) {
                        const raw = backendErrors.phone[0] || "";
                        const lower = raw.toLowerCase();
                        if (lower.indexOf('taken') !== -1 || lower.indexOf('sudah ada') !== -1 || lower.indexOf('sudah terdaftar') !== -1) {
                            message = "Nomor WhatsApp sudah terdaftar. Gunakan nomor lain atau login jika sudah punya akun.";
                        } else if (raw) {
                            message = raw;
                        } else if (allMessages.length > 0) {
                            message = allMessages[0];
                        } else {
                            message = "Nomor WhatsApp tidak valid. Mohon periksa kembali.";
                        }
                    } else if (allMessages.length > 0) {
                        message = allMessages[0];
                    } else {
                        message = "Mohon periksa kembali inputan Anda.";
                    }
                }
            } else if (error.request) {
                message = "Gagal terhubung ke server. Periksa koneksi internet Anda.";
            }

            setErrors(prev => ({ ...prev, general: message }));
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full font-sans bg-slate-50 dark:bg-[#020617]">
            <div className="w-full flex flex-col items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-3xl">
                    <div className="mb-8 flex flex-col items-center text-center gap-3">
                        <Image 
                            src="/knd-logo.png" 
                            alt="RT Online Logo" 
                            width={220} 
                            height={70} 
                            className="h-14 w-auto object-contain" 
                        />
                        <p className="text-xs font-medium tracking-[0.25em] text-emerald-700/80 dark:text-emerald-300/80 uppercase">
                            Kawasan Nyaman Digital
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Mulai Transformasi Digital RT/RW Anda
                        </h1>
                        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-2xl">
                            Daftarkan RT Anda untuk mendapatkan akses penuh ke fitur administrasi, keuangan, dan layanan digital RT Online.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
                        
                        <div className="text-center md:text-left space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mx-auto md:mx-0">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Registrasi Live RT Online</span>
                            </div>

                            <div className="space-y-1.5">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Daftarkan RT Baru
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    Isi formulir di bawah untuk membuat akun resmi pengurus RT Anda.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5 mt-2">
                            
                            {errors.general && (
                                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    {errors.general}
                                </div>
                            )}

                            {/* Personal Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Nama Lengkap (Admin)</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            name="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className={`block w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.name ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                            placeholder="Nama Ketua/Admin RT"
                                        />
                                    </div>
                                    {errors.name && <p className="text-red-500 text-xs ml-1">{errors.name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Nomor WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            name="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className={`block w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.phone ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                            placeholder="0812xxx"
                                        />
                                    </div>
                                    {errors.phone && <p className="text-red-500 text-xs ml-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* RT Info */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Nomor RT</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            name="rt_number"
                                            type="text"
                                            value={formData.rt_number}
                                            onChange={handleChange}
                                            className={`block w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.rt_number ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                            placeholder="001"
                                        />
                                    </div>
                                    {errors.rt_number && <p className="text-red-500 text-xs ml-1">{errors.rt_number}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Nomor RW</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                        <input
                                            name="rw_number"
                                            type="text"
                                            value={formData.rw_number}
                                            onChange={handleChange}
                                            className={`block w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.rw_number ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                            placeholder="005"
                                        />
                                    </div>
                                    {errors.rw_number && <p className="text-red-500 text-xs ml-1">{errors.rw_number}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Nama Wilayah (Opsional)</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                    <input
                                        name="rt_name"
                                        type="text"
                                        value={formData.rt_name}
                                        onChange={handleChange}
                                        className="block w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        placeholder="Contoh: RT Mawar Indah"
                                    />
                                </div>
                            </div>

                            {/* Contact & Address */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Email Resmi RT</label>
                                <div className="relative">
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.email ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                        placeholder="contoh: adminrt@example.com"
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-xs ml-1">{errors.email}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Alamat Lengkap</label>
                                <div className="relative">
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={(e) => handleChange(e as any)}
                                        className={`block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.address ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[80px]`}
                                        placeholder="Alamat sekretariat / wilayah RT"
                                    />
                                </div>
                                {errors.address && <p className="text-red-500 text-xs ml-1">{errors.address}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Kode Pos</label>
                                <div className="relative">
                                    <input
                                        name="postal_code"
                                        type="text"
                                        value={formData.postal_code}
                                        onChange={handleChange}
                                        className={`block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.postal_code ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                        placeholder="contoh: 12820"
                                    />
                                </div>
                                {errors.postal_code && <p className="text-red-500 text-xs ml-1">{errors.postal_code}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Provinsi</label>
                                    <SearchableSelect
                                        value={regionCodes.province}
                                        onChange={(value, label) => handleRegionChange('province', value, label)}
                                        options={Object.entries(provinces).map(([code, name]) => ({ label: name, value: code }))}
                                        placeholder="Pilih Provinsi"
                                    />
                                    {errors.province && <p className="text-red-500 text-xs ml-1">{errors.province}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Kota/Kabupaten</label>
                                    <SearchableSelect
                                        value={regionCodes.city}
                                        onChange={(value, label) => handleRegionChange('city', value, label)}
                                        options={Object.entries(cities).map(([code, name]) => ({ label: name, value: code }))}
                                        placeholder="Pilih Kota/Kabupaten"
                                        disabled={!regionCodes.province}
                                    />
                                    {errors.city && <p className="text-red-500 text-xs ml-1">{errors.city}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Kecamatan</label>
                                    <SearchableSelect
                                        value={regionCodes.district}
                                        onChange={(value, label) => handleRegionChange('district', value, label)}
                                        options={Object.entries(districts).map(([code, name]) => ({ label: name, value: code }))}
                                        placeholder="Pilih Kecamatan"
                                        disabled={!regionCodes.city}
                                    />
                                    {errors.district && <p className="text-red-500 text-xs ml-1">{errors.district}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Kelurahan</label>
                                    <SearchableSelect
                                        value={regionCodes.subdistrict}
                                        onChange={(value, label) => handleRegionChange('subdistrict', value, label)}
                                        options={Object.entries(subdistricts).map(([code, name]) => ({ label: name, value: code }))}
                                        placeholder="Pilih Kelurahan"
                                        disabled={!regionCodes.district}
                                    />
                                    {errors.subdistrict && <p className="text-red-500 text-xs ml-1">{errors.subdistrict}</p>}
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Kata Sandi</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`block w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.password ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                        placeholder="Minimal 6 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-xs ml-1">{errors.password}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Konfirmasi Kata Sandi</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                    <input
                                        name="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={`block w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.confirmPassword ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                                        placeholder="Ulangi kata sandi"
                                    />
                                </div>
                                {errors.confirmPassword && <p className="text-red-500 text-xs ml-1">{errors.confirmPassword}</p>}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-emerald-600/20 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-[0.98] mt-4"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Daftar Sekarang
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="pt-6">
                            <div className="relative py-3">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white dark:bg-slate-900 px-4 text-xs text-slate-400 uppercase tracking-wider font-medium">
                                        Sudah punya akun?
                                    </span>
                                </div>
                            </div>

                            <button 
                                type="button"
                                onClick={() => router.push('/login')}
                                className="w-full py-3.5 px-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400 bg-slate-50/60 dark:bg-slate-900 transition-all duration-200"
                            >
                                Masuk ke Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
