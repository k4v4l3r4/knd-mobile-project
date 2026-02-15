'use client';

import { useState } from 'react';
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

export default function RegisterPage() {
    const router = useRouter();
    
    // Form States
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        confirmPassword: '',
        rt_number: '',
        rw_number: '',
        rt_name: ''
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
                password: formData.password,
                rt_number: formData.rt_number,
                rw_number: formData.rw_number,
                rt_name: formData.rt_name || undefined,
                level: 'RT'
            });

            if (response.data.success || response.status === 201) {
                const token = response.data.data.token;
                Cookies.set('admin_token', token, { expires: 1, path: '/' });
                toast.success('Pendaftaran berhasil! Mengalihkan...');
                router.push('/dashboard');
            } else {
                setErrors({ general: response.data.message || 'Pendaftaran gagal.' });
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            
            // Default message
            let message = "Terjadi kesalahan sistem. Silakan coba lagi.";
            
            if (error.response) {
                // Server responded with error
                if (error.response.data && error.response.data.message) {
                    message = error.response.data.message;
                } else {
                    message = `Server Error: ${error.response.status}`;
                }

                // Handle validation errors from backend
                if (error.response.data && error.response.data.errors) {
                    const backendErrors = error.response.data.errors;
                    const newErrors: { [key: string]: string } = {};
                    Object.keys(backendErrors).forEach(key => {
                        newErrors[key] = backendErrors[key][0];
                    });
                    setErrors(prev => ({ ...prev, ...newErrors }));
                    
                    // Also show validation summary in general error
                    message = "Mohon periksa kembali inputan Anda.";
                }
            } else if (error.request) {
                // Network error (no response)
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
