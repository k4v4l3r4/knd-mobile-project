'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  MapPin,
  FileText,
  Check,
  ChevronLeft,
  Upload,
  CreditCard,
  Map as MapIcon
} from 'lucide-react';
import api from '@/lib/api';
import { useTenant } from '@/context/TenantContext';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

const MAP_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const p = phone.trim();
    if (p.startsWith('0')) return '62' + p.slice(1);
    if (!p.startsWith('62')) return '62' + p;
    return p;
};

export default function RegisterPage() {
    const router = useRouter();
    const { refreshStatus } = useTenant();
    
    // --- STATE ---
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        // Step 1: Account
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        
        // Step 2: Wilayah
        rt_number: '',
        rw_number: '',
        rt_name: '',
        address: '',
        province: '',
        city: '',
        district: '',
        subdistrict: '',
        postal_code: '',
        latitude: '',
        longitude: '',
        
        // Step 3: Berkas
        kk_number: '',
    });

    const [files, setFiles] = useState<{
        sk_file: File | null;
        ktp_file: File | null;
    }>({
        sk_file: null,
        ktp_file: null
    });

    const [termsAccepted, setTermsAccepted] = useState(false);
    
    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    // Region Data
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

    // Maps
    const { isLoaded: isMapLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: MAP_LIBRARIES
    });
    
    const mapRef = useRef<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState({ lat: -6.2088, lng: 106.8456 }); // Jakarta

    // --- HANDLERS ---

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'sk_file' | 'ktp_file') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [field]: e.target.files![0] }));
            if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setFormData(prev => ({
                ...prev,
                latitude: lat.toString(),
                longitude: lng.toString()
            }));
            if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
        }
    }, []);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    // --- REGION FETCHING ---
    const fetchProvinces = async () => {
        try {
            const res = await api.get('/regions/provinces');
            if (res.data.success) setProvinces(res.data.data);
        } catch (err) { console.error(err); }
    };
    
    const fetchCities = async (code: string) => {
        try {
            const res = await api.get(`/regions/cities/${code}`);
            if (res.data.success) setCities(res.data.data);
        } catch (err) { console.error(err); }
    };

    const fetchDistricts = async (code: string) => {
        try {
            const res = await api.get(`/regions/districts/${code}`);
            if (res.data.success) setDistricts(res.data.data);
        } catch (err) { console.error(err); }
    };

    const fetchSubdistricts = async (code: string) => {
        try {
            const res = await api.get(`/regions/villages/${code}`);
            if (res.data.success) setSubdistricts(res.data.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchProvinces(); }, []);

    const handleRegionChange = (type: 'province' | 'city' | 'district' | 'subdistrict', code: string, label: string) => {
        // Reset logic similar to original but condensed
        if (type === 'province') {
            setFormData(p => ({ ...p, province: label, city: '', district: '', subdistrict: '' }));
            setRegionCodes({ province: code, city: '', district: '', subdistrict: '' });
            setCities({}); setDistricts({}); setSubdistricts({});
            if (code) fetchCities(code);
        } else if (type === 'city') {
            setFormData(p => ({ ...p, city: label, district: '', subdistrict: '' }));
            setRegionCodes(p => ({ ...p, city: code, district: '', subdistrict: '' }));
            setDistricts({}); setSubdistricts({});
            if (code) fetchDistricts(code);
        } else if (type === 'district') {
            setFormData(p => ({ ...p, district: label, subdistrict: '' }));
            setRegionCodes(p => ({ ...p, district: code, subdistrict: '' }));
            setSubdistricts({});
            if (code) fetchSubdistricts(code);
        } else if (type === 'subdistrict') {
            setFormData(p => ({ ...p, subdistrict: label }));
            setRegionCodes(p => ({ ...p, subdistrict: code }));
        }
        if (errors[type]) setErrors(prev => ({ ...prev, [type]: '' }));
    };

    // --- OTP LOGIC REMOVED ---


    // --- VALIDATION ---
    const validateStep = (currentStep: number) => {
        const newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (currentStep === 1) {
            if (!formData.name.trim()) newErrors.name = "Nama wajib diisi";
            if (!formData.phone.trim()) newErrors.phone = "WhatsApp wajib diisi";
            if (!formData.email.trim()) newErrors.email = "Email wajib diisi";
            if (!formData.password) newErrors.password = "Password wajib diisi";
            else if (formData.password.length < 6) newErrors.password = "Minimal 6 karakter";
            if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Password tidak cocok";
        }

        if (currentStep === 2) {
            if (!formData.rt_number.trim()) newErrors.rt_number = "No. RT wajib diisi";
            if (!formData.rw_number.trim()) newErrors.rw_number = "No. RW wajib diisi";
            if (!formData.address.trim()) newErrors.address = "Alamat wajib diisi";
            if (!formData.province) newErrors.province = "Provinsi wajib diisi";
            if (!formData.city) newErrors.city = "Kota wajib diisi";
            if (!formData.district) newErrors.district = "Kecamatan wajib diisi";
            if (!formData.subdistrict) newErrors.subdistrict = "Kelurahan wajib diisi";
            if (!formData.postal_code) newErrors.postal_code = "Kode Pos wajib diisi";
            if (!formData.latitude || !formData.longitude) newErrors.location = "Titik lokasi wajib dipilih di peta";
        }

        if (currentStep === 3) {
            if (!files.sk_file) newErrors.sk_file = "SK Pengurus RT wajib diupload";
            if (!files.ktp_file) newErrors.ktp_file = "Foto KTP wajib diupload";
            if (!formData.kk_number.trim()) newErrors.kk_number = "Nomor KK wajib diisi";
            if (!termsAccepted) newErrors.terms = "Anda harus menyetujui Syarat & Ketentuan";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
            toast.error("Mohon lengkapi data yang wajib diisi");
        }
        return isValid;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrev = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    // --- SUBMIT ---
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        setIsLoading(true);
        
        try {
            const submitData = new FormData();
            // Append text fields
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (key === 'phone') {
                        submitData.append(key, formatPhoneNumber(value as string));
                    } else {
                        submitData.append(key, value);
                    }
                }
            });
            // Append files
            if (files.sk_file) submitData.append('sk_file', files.sk_file);
            if (files.ktp_file) submitData.append('ktp_file', files.ktp_file);
            
            // Hardcode level
            submitData.append('level', 'RT');

            const response = await api.post('/register', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success || response.status === 201) {
                const token = response.data.data.token;
                Cookies.set('admin_token', token, { expires: 1, path: '/' });
                await refreshStatus();
                toast.success('Pendaftaran berhasil! Mengalihkan...');
                router.push('/dashboard');
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            const msg = error.response?.data?.message || "Terjadi kesalahan sistem";
            toast.error(msg);
            setErrors(prev => ({ ...prev, general: msg }));
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER HELPERS ---
    const getPasswordStrength = (pass: string) => {
        if (!pass) return 0;
        let score = 0;
        if (pass.length >= 6) score += 1;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;
        return score; // 0-5
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const strengthColor = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];
    const strengthText = ['Kosong', 'Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];

    return (
        <div className="min-h-screen flex items-center justify-center w-full font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/50 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black py-12 px-4 sm:px-6">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-white/50 dark:border-slate-800 p-8 md:p-10 relative overflow-hidden">
                
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-10 relative z-10">
                    <Image 
                        src="/knd-logo.png" 
                        alt="RT Online" 
                        width={200} 
                        height={70} 
                        className="h-16 w-auto object-contain drop-shadow-sm mb-6" 
                    />
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                        Daftarkan RT Baru
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg leading-relaxed mb-8">
                        Lengkapi data untuk membuat lingkungan RT digital Anda.
                    </p>
                    
                    {/* Stepper */}
                    <div className="w-full max-w-lg flex items-center justify-between relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 -z-10 rounded-full" />
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={`flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-2 transition-colors duration-300`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                    step >= s 
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-110' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                    {step > s ? <Check size={24} /> : s}
                                </div>
                                <span className={`text-xs font-semibold tracking-wide ${step >= s ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'}`}>
                                    {s === 1 ? 'AKUN' : s === 2 ? 'WILAYAH' : 'BERKAS'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <form onSubmit={handleRegister}>
                        {/* Error Alert */}
                        {errors.general && (
                            <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{errors.general}</span>
                            </div>
                        )}
                        
                        {/* STEP 1: AKUN */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                                Informasi Akun
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Buat akun untuk Ketua/Pengurus RT.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Name */}
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nama Lengkap (Sesuai KTP) <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    name="name"
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.name ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                                    placeholder="Nama Ketua RT"
                                                />
                                            </div>
                                            {errors.name && <p className="text-red-500 text-xs ml-1">{errors.name}</p>}
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nomor WhatsApp <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    name="phone"
                                                    type="tel"
                                                    maxLength={15}
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.phone ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                                    placeholder="62812xxx"
                                                />
                                            </div>
                                            {errors.phone && <p className="text-red-500 text-xs ml-1">{errors.phone}</p>}
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-bold text-slate-400 group-focus-within:text-emerald-500 transition-colors">@</div>
                                                <input
                                                    name="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.email ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                            {errors.email && <p className="text-red-500 text-xs ml-1">{errors.email}</p>}
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Password <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    name="password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900 border ${errors.password ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                                    placeholder="Minimal 6 karakter"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {/* Strength Meter */}
                                            {formData.password && (
                                                <div className="mt-2">
                                                    <div className="flex gap-1 h-1 mb-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < passwordStrength ? strengthColor[passwordStrength] : 'bg-slate-100 dark:bg-slate-800'}`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 text-right">{strengthText[passwordStrength]}</p>
                                                </div>
                                            )}
                                            {errors.password && <p className="text-red-500 text-xs ml-1">{errors.password}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Konfirmasi Password <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    name="confirmPassword"
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.confirmPassword ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                                    placeholder="Ulangi password"
                                                />
                                            </div>
                                            {errors.confirmPassword && <p className="text-red-500 text-xs ml-1">{errors.confirmPassword}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: WILAYAH */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                                Data Wilayah RT
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Lengkapi data lokasi untuk fitur peta tetangga.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* RT/RW Numbers */}
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nomor RT <span className="text-red-500">*</span></label>
                                            <input
                                                name="rt_number"
                                                maxLength={3}
                                                value={formData.rt_number}
                                                onChange={handleChange}
                                                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200"
                                                placeholder="Contoh: 001"
                                            />
                                            {errors.rt_number && <p className="text-red-500 text-xs ml-1">{errors.rt_number}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nomor RW <span className="text-red-500">*</span></label>
                                            <input
                                                name="rw_number"
                                                maxLength={3}
                                                value={formData.rw_number}
                                                onChange={handleChange}
                                                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200"
                                                placeholder="Contoh: 005"
                                            />
                                            {errors.rw_number && <p className="text-red-500 text-xs ml-1">{errors.rw_number}</p>}
                                        </div>

                                        {/* Address */}
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Alamat Lengkap Sekretariat/Ketua RT <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <MapPin className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className="block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200"
                                                    placeholder="Jl. Mawar No. 12"
                                                />
                                            </div>
                                            {errors.address && <p className="text-red-500 text-xs ml-1">{errors.address}</p>}
                                        </div>

                                        {/* Region Selects */}
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Provinsi <span className="text-red-500">*</span></label>
                                            <select 
                                                value={regionCodes.province}
                                                onChange={(e) => handleRegionChange('province', e.target.value, e.target.options[e.target.selectedIndex].text)}
                                                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 appearance-none"
                                            >
                                                <option value="">Pilih Provinsi</option>
                                                {Object.entries(provinces).map(([code, name]) => (
                                                    <option key={code} value={code}>{name}</option>
                                                ))}
                                            </select>
                                            {errors.province && <p className="text-red-500 text-xs ml-1">{errors.province}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kota/Kabupaten <span className="text-red-500">*</span></label>
                                            <select 
                                                value={regionCodes.city}
                                                onChange={(e) => handleRegionChange('city', e.target.value, e.target.options[e.target.selectedIndex].text)}
                                                disabled={!regionCodes.province}
                                                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 disabled:opacity-50 transition-all duration-200 appearance-none"
                                            >
                                                <option value="">Pilih Kota/Kab</option>
                                                {Object.entries(cities).map(([code, name]) => (
                                                    <option key={code} value={code}>{name}</option>
                                                ))}
                                            </select>
                                            {errors.city && <p className="text-red-500 text-xs ml-1">{errors.city}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kecamatan <span className="text-red-500">*</span></label>
                                            <select 
                                                value={regionCodes.district}
                                                onChange={(e) => handleRegionChange('district', e.target.value, e.target.options[e.target.selectedIndex].text)}
                                                disabled={!regionCodes.city}
                                                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 disabled:opacity-50 transition-all duration-200 appearance-none"
                                            >
                                                <option value="">Pilih Kecamatan</option>
                                                {Object.entries(districts).map(([code, name]) => (
                                                    <option key={code} value={code}>{name}</option>
                                                ))}
                                            </select>
                                            {errors.district && <p className="text-red-500 text-xs ml-1">{errors.district}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kelurahan <span className="text-red-500">*</span></label>
                                            <select 
                                                value={regionCodes.subdistrict}
                                                onChange={(e) => handleRegionChange('subdistrict', e.target.value, e.target.options[e.target.selectedIndex].text)}
                                                disabled={!regionCodes.district}
                                                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 disabled:opacity-50 transition-all duration-200 appearance-none"
                                            >
                                                <option value="">Pilih Kelurahan</option>
                                                {Object.entries(subdistricts).map(([code, name]) => (
                                                    <option key={code} value={code}>{name}</option>
                                                ))}
                                            </select>
                                            {errors.subdistrict && <p className="text-red-500 text-xs ml-1">{errors.subdistrict}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kode Pos <span className="text-red-500">*</span></label>
                                            <input
                                                name="postal_code"
                                                value={formData.postal_code}
                                                onChange={handleChange}
                                                className="block w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200"
                                                placeholder="Kode Pos"
                                            />
                                            {errors.postal_code && <p className="text-red-500 text-xs ml-1">{errors.postal_code}</p>}
                                        </div>

                                        {/* MAP PICKER */}
                                        <div className="md:col-span-2 space-y-2 mt-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2">
                                                <MapIcon size={16} /> Titik Lokasi RT (Wajib) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="w-full h-[300px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                                {isMapLoaded ? (
                                                    <GoogleMap
                                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                                        center={mapCenter}
                                                        zoom={13}
                                                        onClick={handleMapClick}
                                                        onLoad={onMapLoad}
                                                    >
                                                        {formData.latitude && formData.longitude && (
                                                            <Marker 
                                                                position={{ 
                                                                    lat: parseFloat(formData.latitude), 
                                                                    lng: parseFloat(formData.longitude) 
                                                                }} 
                                                            />
                                                        )}
                                                    </GoogleMap>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                        Loading Map...
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 ml-1">Klik pada peta untuk menandai lokasi sekretariat RT.</p>
                                            {formData.latitude && (
                                                <p className="text-xs text-emerald-600 font-medium ml-1">
                                                    Terpilih: {formData.latitude}, {formData.longitude}
                                                </p>
                                            )}
                                            {errors.location && <p className="text-red-500 text-xs ml-1">{errors.location}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: BERKAS */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                                Berkas Validasi
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Upload dokumen untuk verifikasi keaslian pengurus RT.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* KK Number */}
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nomor Kartu Keluarga (KK) <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <CreditCard className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                </div>
                                                <input
                                                    name="kk_number"
                                                    value={formData.kk_number}
                                                    onChange={handleChange}
                                                    maxLength={16}
                                                    className={`block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border ${errors.kk_number ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                                    placeholder="16 digit nomor KK"
                                                />
                                            </div>
                                            {errors.kk_number && <p className="text-red-500 text-xs ml-1">{errors.kk_number}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Upload SK */}
                                            <div className={`p-6 border-2 border-dashed ${errors.sk_file ? 'border-red-300 bg-red-50/50' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-900'} rounded-3xl transition-all duration-200 group cursor-pointer relative`}>
                                                <input 
                                                    type="file" 
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => handleFileChange(e, 'sk_file')}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="flex flex-col items-center gap-3 text-center">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${files.sk_file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
                                                        {files.sk_file ? <Check className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">SK Pengurus RT <span className="text-red-500">*</span></h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 px-4">
                                                            {files.sk_file ? (
                                                                <span className="text-emerald-600 font-medium break-all line-clamp-1">{files.sk_file.name}</span>
                                                            ) : (
                                                                "Klik atau drag file PDF/JPG/PNG (Max 5MB)"
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Upload KTP */}
                                            <div className={`p-6 border-2 border-dashed ${errors.ktp_file ? 'border-red-300 bg-red-50/50' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-900'} rounded-3xl transition-all duration-200 group cursor-pointer relative`}>
                                                <input 
                                                    type="file" 
                                                    accept=".jpg,.jpeg,.png"
                                                    onChange={(e) => handleFileChange(e, 'ktp_file')}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="flex flex-col items-center gap-3 text-center">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${files.ktp_file ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                                        {files.ktp_file ? <Check className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Foto KTP Ketua <span className="text-red-500">*</span></h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 px-4">
                                                            {files.ktp_file ? (
                                                                <span className="text-blue-600 font-medium break-all line-clamp-1">{files.ktp_file.name}</span>
                                                            ) : (
                                                                "Klik atau drag file JPG/PNG (Max 5MB)"
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
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
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NAVIGATION BUTTONS */}
                        <div className="mt-8 flex gap-4 pt-6">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                                >
                                    <ChevronLeft size={20} /> Kembali
                                </button>
                            )}
                            
                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 group"
                                >
                                    Lanjut <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    {isLoading ? (
                                        <>Memproses...</>
                                    ) : (
                                        <>Daftar Sekarang <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            )}
                        </div>

                    </form>
                </div>
                
                <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Sudah punya akun?{' '}
                    <a href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
                        Masuk disini
                    </a>
                </p>
            </div>
        </div>
    );
}
