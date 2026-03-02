'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import { 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Phone,
  ShieldCheck,
  CheckCircle2,
  Check,
  User,
  Users,
  Ticket,
  MapPin,
  CreditCard,
  Building,
  Mail,
  ChevronDown,
  Info
} from 'lucide-react';
import api from '@/lib/api';
import { useTenant } from '@/context/TenantContext';

const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    let p = phone.trim();
    if (p.startsWith('0')) return '62' + p.slice(1);
    if (!p.startsWith('62')) return '62' + p;
    return p;
};

interface Region {
    code: string;
    name: string;
}

export default function RegisterWargaPage() {
    const router = useRouter();
    const { refreshStatus } = useTenant();
    
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Register Warga State
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regInviteCode, setRegInviteCode] = useState('');

    // Additional Warga Fields
    const [regKk, setRegKk] = useState('');
    const [regNik, setRegNik] = useState('');
    const [regGender, setRegGender] = useState('');
    const [regAddress, setRegAddress] = useState('');
    const [regRt, setRegRt] = useState('');
    const [regRw, setRegRw] = useState('');
    const [regProvince, setRegProvince] = useState('');
    const [regCity, setRegCity] = useState('');
    const [regDistrict, setRegDistrict] = useState('');
    const [regVillage, setRegVillage] = useState('');
    const [regPostalCode, setRegPostalCode] = useState('');
    const [regMaritalStatus, setRegMaritalStatus] = useState('');
    const [regReligion, setRegReligion] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Region Data
    const [provinces, setProvinces] = useState<Region[]>([]);
    const [cities, setCities] = useState<Region[]>([]);
    const [districts, setDistricts] = useState<Region[]>([]);
    const [villages, setVillages] = useState<Region[]>([]);

    useEffect(() => {
        fetchProvinces();
    }, []);

    const fetchProvinces = async () => {
        try {
            const res = await api.get('/regions/provinces');
            const data = res.data.data || {};
            const formatted = Object.entries(data).map(([code, name]) => ({
                code,
                name: String(name)
            }));
            setProvinces(formatted);
        } catch (error) {
            console.error('Failed to fetch provinces', error);
        }
    };

    const handleProvinceChange = async (code: string) => {
        setRegProvince(code);
        setRegCity('');
        setRegDistrict('');
        setRegVillage('');
        setCities([]);
        setDistricts([]);
        setVillages([]);
        if (code) {
            try {
                const res = await api.get(`/regions/cities/${code}`);
                const data = res.data.data || {};
                const formatted = Object.entries(data).map(([code, name]) => ({
                    code,
                    name: String(name)
                }));
                setCities(formatted);
            } catch (error) {
                console.error('Failed to fetch cities', error);
            }
        }
    };

    const handleCityChange = async (code: string) => {
        setRegCity(code);
        setRegDistrict('');
        setRegVillage('');
        setDistricts([]);
        setVillages([]);
        if (code) {
            try {
                const res = await api.get(`/regions/districts/${code}`);
                const data = res.data.data || {};
                const formatted = Object.entries(data).map(([code, name]) => ({
                    code,
                    name: String(name)
                }));
                setDistricts(formatted);
            } catch (error) {
                console.error('Failed to fetch districts', error);
            }
        }
    };

    const handleDistrictChange = async (code: string) => {
        setRegDistrict(code);
        setRegVillage('');
        setVillages([]);
        if (code) {
            try {
                const res = await api.get(`/regions/villages/${code}`);
                const data = res.data.data || {};
                const formatted = Object.entries(data).map(([code, name]) => ({
                    code,
                    name: String(name)
                }));
                setVillages(formatted);
            } catch (error) {
                console.error('Failed to fetch villages', error);
            }
        }
    };

    const handleRegisterWarga = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        
        let hasError = false;
        const newErrors: typeof errors = {};

        if (!regInviteCode) {
             newErrors.invite_code = "Kode Undangan RT wajib diisi.";
             hasError = true;
        }

        if (!regName) {
            newErrors.name = "Nama lengkap wajib diisi.";
            hasError = true;
        }

        if (!regPhone) {
            newErrors.phone = "Nomor WhatsApp wajib diisi.";
            hasError = true;
        }

        if (!regEmail) {
            newErrors.email = "Email wajib diisi.";
            hasError = true;
        }
        
        if (!regPassword || regPassword.length < 6) {
            newErrors.password = "Kata sandi minimal 6 karakter.";
            hasError = true;
        } else if (regPassword !== regConfirmPassword) {
            newErrors.confirm_password = "Konfirmasi kata sandi tidak cocok.";
            hasError = true;
        }

        // Additional Fields Validation (All Mandatory)
        if (!regKk) {
            newErrors.kk_number = "Nomor KK wajib diisi.";
            hasError = true;
        } else if (regKk.length !== 16) {
            newErrors.kk_number = "Nomor KK harus 16 digit.";
            hasError = true;
        }

        if (!regNik) {
            newErrors.nik = "NIK wajib diisi.";
            hasError = true;
        } else if (regNik.length !== 16) {
            newErrors.nik = "NIK harus 16 digit.";
            hasError = true;
        }

        if (!regGender) {
            newErrors.gender = "Jenis Kelamin wajib dipilih.";
            hasError = true;
        }

        if (!regMaritalStatus) {
            newErrors.marital_status = "Status Pernikahan wajib dipilih.";
            hasError = true;
        }

        if (!regReligion) {
            newErrors.religion = "Agama wajib dipilih.";
            hasError = true;
        }

        if (!regAddress) {
            newErrors.address = "Alamat Lengkap wajib diisi.";
            hasError = true;
        }

        if (!regRt) {
            newErrors.rt = "RT wajib diisi.";
            hasError = true;
        }

        if (!regRw) {
            newErrors.rw = "RW wajib diisi.";
            hasError = true;
        }

        if (!regProvince) {
            newErrors.province = "Provinsi wajib dipilih.";
            hasError = true;
        }

        if (!regCity) {
            newErrors.city = "Kota/Kabupaten wajib dipilih.";
            hasError = true;
        }

        if (!regDistrict) {
            newErrors.district = "Kecamatan wajib dipilih.";
            hasError = true;
        }

        if (!regVillage) {
            newErrors.village = "Kelurahan/Desa wajib dipilih.";
            hasError = true;
        }

        if (!regPostalCode) {
            newErrors.postal_code = "Kode Pos wajib diisi.";
            hasError = true;
        }

        if (!termsAccepted) {
            newErrors.terms = "Anda harus menyetujui Syarat & Ketentuan.";
            hasError = true;
        }

        if (hasError) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                name: regName,
                phone: formatPhoneNumber(regPhone),
                email: regEmail,
                password: regPassword,
                invite_code: regInviteCode,
                // Additional fields
                kk_number: regKk,
                nik: regNik,
                gender: regGender,
                address: regAddress,
                address_rt: regRt,
                address_rw: regRw,
                province_code: regProvince,
                city_code: regCity,
                district_code: regDistrict,
                village_code: regVillage,
                postal_code: regPostalCode,
                marital_status: regMaritalStatus,
                religion: regReligion,
            };

            const response = await api.post('/register-warga', payload);

            if (response.data.success) {
                const token = response.data.data.token;
                Cookies.set('admin_token', token, { expires: 1, path: '/' });
                await refreshStatus();
                toast.success('Registrasi berhasil! Selamat datang.');
                router.push('/dashboard');
            } else {
                setErrors({ general: response.data.message || 'Registrasi gagal.' });
            }
        } catch (error: unknown) {
            console.error('Register error:', error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            let message = err.response?.data?.message || 'Terjadi kesalahan saat registrasi.';
            
            // Show validation errors if any
            if (err.response?.data?.errors) {
                 const validationErrors = err.response.data.errors;
                 const newErrors: typeof errors = {};
                 
                 if (validationErrors.name) newErrors.name = validationErrors.name[0];
                 if (validationErrors.phone) newErrors.phone = validationErrors.phone[0];
                 if (validationErrors.email) newErrors.email = validationErrors.email[0];
                 if (validationErrors.password) newErrors.password = validationErrors.password[0];
                 if (validationErrors.invite_code) newErrors.invite_code = validationErrors.invite_code[0];
                 
                 // If there are other errors not mapped to specific fields, append to general message
                 const otherErrors = Object.keys(validationErrors).filter(key => 
                    !['name', 'phone', 'email', 'password', 'invite_code'].includes(key)
                 );
                 
                 if (otherErrors.length > 0) {
                    const otherMessages = otherErrors.map(key => validationErrors[key][0]).join('. ');
                    message = `${message} (${otherMessages})`;
                 }
                 
                 setErrors({ ...newErrors, general: message });
            } else {
                setErrors({ general: message });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center w-full font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/50 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black py-12 px-4 sm:px-6">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-white/50 dark:border-slate-800 p-8 md:p-10 relative overflow-hidden">
                
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-10 relative z-10">
                    <Link href="/" className="mb-8 hover:scale-105 transition-transform duration-300">
                        <Image 
                            src="/knd-logo.png" 
                            alt="KND Logo" 
                            width={200} 
                            height={70} 
                            className="h-20 w-auto object-contain drop-shadow-sm"
                        />
                    </Link>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-3">
                        Registrasi Warga
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg leading-relaxed">
                        Bergabunglah dengan komunitas digital RT Anda. <br className="hidden sm:block"/> 
                        Silakan lengkapi formulir di bawah ini dengan data yang valid.
                    </p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleRegisterWarga} className="space-y-8 relative z-10" autoComplete="off">
                    {/* Error Alert */}
                    {errors.general && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/50 flex items-start gap-3 animate-fadeIn">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{errors.general}</span>
                        </div>
                    )}

                    {/* Section: Data Akun */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4 mb-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    Data Akun
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Informasi untuk login dan identifikasi</p>
                            </div>
                        </div>

                        {/* Invite Code Input - Highlighted */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 flex justify-between">
                                <span>Kode Undangan RT <span className="text-red-500">*</span></span>
                                <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Wajib Diisi</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Ticket className="h-5 w-5 text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={regInviteCode}
                                    onChange={(e) => setRegInviteCode(e.target.value)}
                                    className={`block w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border-2 ${errors.invite_code ? 'border-red-300 ring-red-100' : 'border-emerald-100 dark:border-emerald-900/30 focus:border-emerald-500'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 shadow-sm`}
                                    placeholder="Masukkan kode dari Ketua RT"
                                />
                            </div>
                            {errors.invite_code ? (
                                <p className="text-red-500 text-xs ml-1 font-medium animate-pulse">{errors.invite_code}</p>
                            ) : (
                                <p className="text-slate-400 text-xs ml-1">Dapatkan kode ini dari pengurus RT setempat.</p>
                            )}
                        </div>

                        {/* Name Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Nama Lengkap <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.name ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                    placeholder="Nama Lengkap sesuai KTP"
                                />
                            </div>
                            {errors.name && <p className="text-red-500 text-xs ml-1">{errors.name}</p>}
                        </div>

                        {/* Phone & Email Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Phone Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    Nomor WhatsApp <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type="tel"
                                        maxLength={15}
                                        value={regPhone}
                                        onChange={(e) => setRegPhone(e.target.value)}
                                        autoComplete="off"
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.phone ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="628123456789"
                                    />
                                </div>
                                {errors.phone && <p className="text-red-500 text-xs ml-1">{errors.phone}</p>}
                            </div>

                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        autoComplete="off"
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.email ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="email@anda.com"
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-xs ml-1">{errors.email}</p>}
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Kata Sandi <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className={`block w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-900 border ${errors.password ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                    placeholder="Minimal 6 karakter"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer p-2"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                    )}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs ml-1">{errors.password}</p>}
                        </div>

                        {/* Confirm Password Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={regConfirmPassword}
                                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className={`block w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-900 border ${errors.confirm_password ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                    placeholder="Ulangi kata sandi"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer p-2"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                                    )}
                                </button>
                            </div>
                            {errors.confirm_password && <p className="text-red-500 text-xs ml-1">{errors.confirm_password}</p>}
                        </div>
                    </div>

                    {/* Section: Data Pribadi (Opsional) */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4 mb-2">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    Data Pribadi
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Lengkapi identitas sesuai KTP & KK</p>
                            </div>
                        </div>

                        {/* KK & NIK Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* KK Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    Nomor KK <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Users className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={regKk}
                                        onChange={(e) => setRegKk(e.target.value.replace(/\D/g, ''))}
                                        maxLength={16}
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.kk_number ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="16 digit No. KK"
                                    />
                                </div>
                                {errors.kk_number && <p className="text-red-500 text-xs ml-1">{errors.kk_number}</p>}
                            </div>

                            {/* NIK */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    NIK <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <CreditCard className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={regNik}
                                        onChange={(e) => setRegNik(e.target.value.replace(/\D/g, ''))}
                                        maxLength={16}
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.nik ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="16 digit NIK"
                                    />
                                </div>
                                {errors.nik && <p className="text-red-500 text-xs ml-1">{errors.nik}</p>}
                            </div>
                        </div>

                        {/* Gender & Marital Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Gender */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    Jenis Kelamin <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={regGender}
                                        onChange={(e) => setRegGender(e.target.value)}
                                        className={`block w-full px-4 py-3.5 pl-4 bg-white dark:bg-slate-900 border ${errors.gender ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Pilih Jenis Kelamin</option>
                                        <option value="L">Laki-laki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                                {errors.gender && <p className="text-red-500 text-xs ml-1">{errors.gender}</p>}
                            </div>

                            {/* Marital Status */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    Status Pernikahan <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={regMaritalStatus}
                                        onChange={(e) => setRegMaritalStatus(e.target.value)}
                                        className={`block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.marital_status ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Pilih Status</option>
                                        <option value="Belum Kawin">Belum Kawin</option>
                                        <option value="Kawin">Kawin</option>
                                        <option value="Cerai Hidup">Cerai Hidup</option>
                                        <option value="Cerai Mati">Cerai Mati</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                                {errors.marital_status && <p className="text-red-500 text-xs ml-1">{errors.marital_status}</p>}
                            </div>
                        </div>

                        {/* Religion */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Agama <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={regReligion}
                                    onChange={(e) => setRegReligion(e.target.value)}
                                    className={`block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.religion ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none cursor-pointer`}
                                >
                                    <option value="">Pilih Agama</option>
                                    <option value="ISLAM">Islam</option>
                                    <option value="KRISTEN">Kristen</option>
                                    <option value="KATOLIK">Katolik</option>
                                    <option value="HINDU">Hindu</option>
                                    <option value="BUDDHA">Buddha</option>
                                    <option value="KHONGHUCU">Khonghucu</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                            </div>
                            {errors.religion && <p className="text-red-500 text-xs ml-1">{errors.religion}</p>}
                        </div>
                    </div>

                    {/* Section: Data Alamat Domisili */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4 mb-2">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    Alamat Domisili
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Lokasi tempat tinggal saat ini</p>
                            </div>
                        </div>

                        {/* Alamat Fields */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Alamat Lengkap <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute top-3.5 left-0 pl-4 flex items-start pointer-events-none">
                                    <MapPin className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <textarea
                                    value={regAddress}
                                    onChange={(e) => setRegAddress(e.target.value)}
                                    rows={3}
                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.address ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 resize-none shadow-sm`}
                                    placeholder="Nama Jalan, No. Rumah, Gang, Patokan, dll"
                                />
                            </div>
                            {errors.address && <p className="text-red-500 text-xs ml-1">{errors.address}</p>}
                        </div>

                        {/* RT/RW Fields */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    RT <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={regRt}
                                        onChange={(e) => setRegRt(e.target.value.replace(/\D/g, ''))}
                                        maxLength={3}
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.rt ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="000"
                                    />
                                </div>
                                {errors.rt && <p className="text-red-500 text-xs ml-1">{errors.rt}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    RW <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={regRw}
                                        onChange={(e) => setRegRw(e.target.value.replace(/\D/g, ''))}
                                        maxLength={3}
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.rw ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="000"
                                    />
                                </div>
                                {errors.rw && <p className="text-red-500 text-xs ml-1">{errors.rw}</p>}
                            </div>
                        </div>

                        {/* Region Selects */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Provinsi <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        value={regProvince}
                                        onChange={(e) => handleProvinceChange(e.target.value)}
                                        className={`block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.province ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Pilih Provinsi</option>
                                        {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kota/Kabupaten <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        value={regCity}
                                        onChange={(e) => handleCityChange(e.target.value)}
                                        disabled={!regProvince}
                                        className={`block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.city ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                                    >
                                        <option value="">Pilih Kota/Kabupaten</option>
                                        {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                                {errors.city && <p className="text-red-500 text-xs ml-1">{errors.city}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kecamatan <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        value={regDistrict}
                                        onChange={(e) => handleDistrictChange(e.target.value)}
                                        disabled={!regCity}
                                        className={`block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.district ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                                    >
                                        <option value="">Pilih Kecamatan</option>
                                        {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                                {errors.district && <p className="text-red-500 text-xs ml-1">{errors.district}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kelurahan/Desa <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        value={regVillage}
                                        onChange={(e) => setRegVillage(e.target.value)}
                                        disabled={!regDistrict}
                                        className={`block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.village ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                                    >
                                        <option value="">Pilih Kelurahan</option>
                                        {villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                                {errors.village && <p className="text-red-500 text-xs ml-1">{errors.village}</p>}
                            </div>
                        </div>

                        {/* Postal Code */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Kode Pos <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={regPostalCode}
                                    onChange={(e) => setRegPostalCode(e.target.value.replace(/\D/g, ''))}
                                    maxLength={5}
                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.postal_code ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                    placeholder="Kode Pos"
                                />
                            </div>
                            {errors.postal_code && <p className="text-red-500 text-xs ml-1">{errors.postal_code}</p>}
                        </div>
                    </div>

                    {/* Information Note */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex gap-3 items-start mt-6">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            Pastikan seluruh data yang Anda masukkan adalah benar dan sesuai dengan identitas resmi (KTP/KK). Data Anda akan diverifikasi oleh pengurus RT sebelum akun diaktifkan.
                        </p>
                    </div>

                    {/* Terms */}
                    <div className="pt-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-emerald-500 checked:bg-emerald-500 hover:border-emerald-400"
                                />
                                <Check className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" size={12} strokeWidth={4} />
                            </div>
                            <span className={`text-sm ${errors.terms ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'} group-hover:text-slate-900 dark:group-hover:text-white transition-colors`}>
                                Saya menyatakan data yang diisi adalah benar dan setuju data saya dikelola sesuai <a href="#" className="text-emerald-600 font-bold hover:underline">Aturan & Ketentuan</a> yang berlaku.
                            </span>
                        </label>
                        {errors.terms && <p className="text-red-500 text-xs ml-8 mt-1">{errors.terms}</p>}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full group relative flex justify-center items-center py-4 px-6 border border-transparent rounded-2xl shadow-xl shadow-emerald-500/20 text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-[0.98] mt-6 overflow-hidden"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                        <span className="relative flex items-center">
                            {isLoading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Daftar Sekarang
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </span>
                    </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Sudah punya akun?{' '}
                        <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
                            Masuk disini
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
