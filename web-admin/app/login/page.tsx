'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Monitor,
  Users,
  Building,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { useTenant } from '@/context/TenantContext';

const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const p = phone.trim();
    if (p.startsWith('0')) return '62' + p.slice(1);
    if (!p.startsWith('62')) return '62' + p;
    return p;
};

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshStatus } = useTenant();
    
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});
    
    // Reset Password States
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
    const [resetPhone, setResetPhone] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [resetError, setResetError] = useState('');
    const [isResetLoading, setIsResetLoading] = useState(false);

    // Info Modal State
    const [activeInfoModal, setActiveInfoModal] = useState<'privacy' | 'terms' | 'help' | null>(null);

    const infoModalContent = {
        privacy: {
            title: "Kebijakan Privasi",
            content: "Kami menghargai privasi Anda. Data yang dikumpulkan (seperti nomor telepon dan alamat) hanya digunakan untuk keperluan administrasi lingkungan RT/RW dan tidak akan dibagikan kepada pihak ketiga tanpa persetujuan Anda. Kami menggunakan enkripsi standar industri untuk melindungi data Anda.",
            icon: ShieldCheck
        },
        terms: {
            title: "Syarat & Ketentuan",
            content: "Dengan menggunakan aplikasi ini, Anda setuju untuk memberikan data yang valid dan bertanggung jawab atas setiap aktivitas yang dilakukan menggunakan akun Anda. Aplikasi ini bertujuan untuk memudahkan pengelolaan lingkungan dan transparansi keuangan.",
            icon: CheckCircle2
        },
        help: {
            title: "Bantuan Pengguna",
            content: "Jika Anda mengalami kendala saat login atau penggunaan aplikasi, silakan hubungi pengurus RT setempat atau tim support kami melalui WhatsApp di 08972498383. Pastikan nomor WhatsApp Anda sudah terdaftar di sistem sebelum mencoba login.",
            icon: Phone
        }
    };

    useEffect(() => {
        try {
            if (searchParams && searchParams.get('expired') === '1') {
                toast.error('Sesi Anda telah berakhir. Silakan login kembali.', {
                    duration: 4000,
                    icon: '🔒'
                });
                router.replace('/login');
            }
        } catch (e) {
            console.error('Error parsing search params', e);
        }
    }, [searchParams, router]);

    const handleForgotPassword = (e: React.MouseEvent) => {
        e.preventDefault();
        setResetError('');
        setResetStep(1);
        setResetPhone(phone);
        setResetOtp('');
        setResetPassword('');
        setResetPasswordConfirm('');
        setResetToken('');
        setIsResetOpen(true);
    };

    const handleResetRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetPhone = resetPhone || phone;
        if (!targetPhone) {
            setResetError('Mohon isi nomor WhatsApp terlebih dahulu.');
            return;
        }
        setIsResetLoading(true);
        setResetError('');
        try {
            await api.post('/auth/forgot-password', { phone: formatPhoneNumber(targetPhone) });
            setResetPhone(targetPhone);
            toast.success('Kode verifikasi telah dikirim ke WhatsApp Anda.');
            setResetStep(2);
        } catch (error: unknown) {
            const err = error as any;
            const message = err.response?.data?.message || 'Gagal mengirim kode verifikasi. Mohon coba lagi.';
            setResetError(message);
        } finally {
            setIsResetLoading(false);
        }
    };

    const handleResetVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetPhone) {
            setResetError('Nomor WhatsApp tidak boleh kosong.');
            return;
        }
        if (!resetOtp || resetOtp.length !== 6) {
            setResetError('Mohon isi kode verifikasi 6 digit.');
            return;
        }
        setIsResetLoading(true);
        setResetError('');
        try {
            const response = await api.post('/auth/verify-otp', {
                phone: formatPhoneNumber(resetPhone),
                otp: resetOtp,
            });
            const token = response.data?.data?.token;
            if (!token) {
                setResetError('Token reset tidak ditemukan. Mohon coba lagi.');
                return;
            }
            setResetToken(token);
            toast.success('Kode verifikasi benar. Silakan buat kata sandi baru.');
            setResetStep(3);
        } catch (error: unknown) {
            const err = error as any;
            const message = err.response?.data?.message || 'Kode verifikasi tidak valid. Mohon coba lagi.';
            setResetError(message);
        } finally {
            setIsResetLoading(false);
        }
    };

    const handleResetSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetPassword || resetPassword.length < 6) {
            setResetError('Kata sandi baru minimal 6 karakter.');
            return;
        }
        if (resetPassword !== resetPasswordConfirm) {
            setResetError('Konfirmasi kata sandi baru tidak cocok.');
            return;
        }
        if (!resetPhone || !resetToken) {
            setResetError('Data reset tidak lengkap. Mohon ulangi proses reset sandi.');
            return;
        }
        setIsResetLoading(true);
        setResetError('');
        try {
            const response = await api.post('/auth/reset-password', {
                phone: formatPhoneNumber(resetPhone),
                password: resetPassword,
                token: resetToken,
            });
            const data = response.data?.data;
            if (data?.token) {
                Cookies.set('admin_token', data.token, { expires: 1, path: '/' });
                toast.success('Kata sandi berhasil direset. Mengalihkan ke dashboard...');
                setIsResetOpen(false);
                router.push('/dashboard');
                return;
            }
            toast.success('Kata sandi berhasil direset. Silakan login dengan kata sandi baru.');
            setIsResetOpen(false);
        } catch (error: unknown) {
            const err = error as any;
            const message = err.response?.data?.message || 'Gagal menyimpan kata sandi baru. Mohon coba lagi.';
            setResetError(message);
        } finally {
            setIsResetLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        
        let hasError = false;
        const newErrors: typeof errors = {};

        if (!phone) {
            newErrors.phone = "Mohon isi nomor WhatsApp Anda.";
            hasError = true;
        }
        
        if (!password) {
            newErrors.password = "Mohon isi kata sandi Anda.";
            hasError = true;
        }

        if (hasError) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.post('/login', {
                phone: formatPhoneNumber(phone),
                password,
            });

            if (response.data.success) {
                const userData = response.data.data.user;
                // Check if user is Warga (prevent login to Admin Dashboard)
                if (userData && (userData.role === 'WARGA' || userData.role === 'WARGA_TETAP' || userData.role === 'warga' || userData.role === 'warga_tetap')) {
                    setErrors({ general: "Akun warga hanya bisa digunakan di aplikasi mobile, gunakan akun pengurus untuk masuk ke sini" });
                    setIsLoading(false);
                    return;
                }

                const token = response.data.data.token;
                Cookies.set('admin_token', token, { expires: 1, path: '/' });
                await refreshStatus();
                toast.success('Login berhasil! Mengalihkan...');
                router.push('/dashboard');
            } else {
                setErrors({ general: response.data.message || 'Login gagal.' });
                setIsLoading(false);
            }
        } catch (error: unknown) {
            console.error('Login error:', error);
            const err = error as any;
            const status = err.response?.status;
            
            if (status === 401) {
                setErrors({ general: "Nomor atau kata sandi tidak sesuai." });
            } else if (status === 403) {
                setErrors({ general: "Akun Anda saat ini tidak aktif. Hubungi Admin RW." });
            } else {
                setErrors({ general: err.response?.data?.message || "Terjadi kesalahan sistem. Silakan coba lagi." });
            }
            
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setIsDemoLoading(true);
        try {
            window.location.href = '/api/auth/demo-login';
        } catch {
            setIsDemoLoading(false);
            toast.error('Gagal membuka mode demo.');
        }
    };

    return (
        <div className="min-h-screen flex w-full font-sans bg-white dark:bg-slate-900">
            {/* Left Section - Branding & Hero */}
            <div className="hidden lg:flex w-1/2 bg-[#0B1120] relative overflow-hidden items-center justify-center">
                {/* Background Effects */}
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_40%)]"></div>
                
                {/* Content */}
                <div className="relative z-10 p-16 max-w-2xl w-full flex flex-col h-full justify-between">
                    {/* Logo Area */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-medium text-emerald-200 tracking-wide uppercase">Sistem RT/RW Online v2.0</span>
                        </div>
                        
                        <h1 className="text-5xl xl:text-6xl font-bold text-white tracking-tight mb-6 leading-[1.1]">
                            Kelola Lingkungan <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">Lebih Modern.</span>
                        </h1>
                        
                        <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                            Transformasi digital untuk administrasi warga yang transparan, akuntabel, dan efisien dalam satu platform terintegrasi.
                        </p>
                    </div>
                    
                    {/* Feature Cards */}
                    <div className="grid grid-cols-2 gap-5 mt-auto mb-12">
                         {/* Card 1 */}
                        <div className="group p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-md hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/20">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-2 text-lg">Data Aman & Valid</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Keamanan data warga prioritas utama dengan enkripsi standar industri.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="group p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-md hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/20">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
                                <Monitor className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-2 text-lg">Monitoring Realtime</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Pantau iuran, kas, dan laporan warga secara langsung dari dashboard.</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 border-t border-white/5 pt-8">
                        <p>© 2025 KND RT Online. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <button onClick={() => setActiveInfoModal('privacy')} className="hover:text-emerald-400 transition-colors">Privacy</button>
                            <button onClick={() => setActiveInfoModal('terms')} className="hover:text-emerald-400 transition-colors">Terms</button>
                            <button onClick={() => setActiveInfoModal('help')} className="hover:text-emerald-400 transition-colors">Help</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto bg-white dark:bg-slate-900">
                <div className="w-full max-w-[440px] space-y-8">
                    {/* Header */}
                    <div className="text-center">
                        <Link href="/" className="inline-block mb-8 hover:opacity-80 transition-opacity">
                            <Image 
                                src="/knd-logo.png" 
                                alt="KND Logo" 
                                width={220} 
                                height={75} 
                                className="h-24 w-auto object-contain mx-auto"
                            />
                            <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                                Kawasan Nyaman Digital
                            </p>
                        </Link>
                        
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Selamat Datang Kembali
                        </h2>
                        <p className="mt-3 text-slate-500 dark:text-slate-400 text-base">
                            Silakan masuk ke akun administrator Anda untuk melanjutkan.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Error Alert */}
                        {errors.general && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/50 flex items-start gap-3 animate-fadeIn">
                                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{errors.general}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* WhatsApp Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Nomor WhatsApp
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border ${errors.phone ? 'border-red-300 ring-red-100' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="628123456789"
                                    />
                                </div>
                                {errors.phone && <p className="text-red-500 text-xs ml-1">{errors.phone}</p>}
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Kata Sandi
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-all"
                                    >
                                        Lupa sandi?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`block w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/50 border ${errors.password ? 'border-red-300 ring-red-100' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="••••••••"
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
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-4 px-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed group hover:translate-y-[-2px] active:translate-y-[0px]"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Masuk Sekarang
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Forgot Password Modal Area (Inline) */}
                    {isResetOpen && (
                        <div className="border border-emerald-100 dark:border-emerald-800 rounded-2xl p-6 bg-emerald-50/60 dark:bg-emerald-900/20 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                                        Reset Kata Sandi
                                    </p>
                                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                        Langkah {resetStep} dari 3
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetOpen(false);
                                        setResetError('');
                                    }}
                                    className="text-xs font-medium text-emerald-700 dark:text-emerald-200 hover:underline bg-emerald-100/50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>

                            {resetError && (
                                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs border border-red-100 font-medium">
                                    {resetError}
                                </div>
                            )}

                            {resetStep === 1 && (
                                <form onSubmit={handleResetRequestOtp} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 ml-1">
                                            Nomor WhatsApp
                                        </label>
                                        <input
                                            type="tel"
                                            maxLength={15}
                                            value={resetPhone}
                                            onChange={(e) => setResetPhone(e.target.value)}
                                            className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                            placeholder="08123456789"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isResetLoading}
                                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isResetLoading ? 'Mengirim kode...' : 'Kirim Kode Verifikasi'}
                                    </button>
                                </form>
                            )}

                            {resetStep === 2 && (
                                <form onSubmit={handleResetVerifyOtp} className="space-y-4">
                                    <p className="text-xs text-emerald-800 dark:text-emerald-100 bg-emerald-100/50 p-3 rounded-lg">
                                        Kode verifikasi dikirim ke <span className="font-bold">{resetPhone}</span>
                                    </p>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 ml-1">
                                            Kode 6 Digit
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={resetOtp}
                                            onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tracking-[0.5em] text-center font-mono"
                                            placeholder="000000"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isResetLoading}
                                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isResetLoading ? 'Memeriksa kode...' : 'Verifikasi Kode'}
                                    </button>
                                </form>
                            )}

                            {resetStep === 3 && (
                                <form onSubmit={handleResetSubmitPassword} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 ml-1">
                                            Kata Sandi Baru
                                        </label>
                                        <input
                                            type="password"
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                            placeholder="Minimal 6 karakter"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 ml-1">
                                            Ulangi Kata Sandi
                                        </label>
                                        <input
                                            type="password"
                                            value={resetPasswordConfirm}
                                            onChange={(e) => setResetPasswordConfirm(e.target.value)}
                                            className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                            placeholder="Konfirmasi sandi"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isResetLoading}
                                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isResetLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Divider */}
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white dark:bg-slate-900 px-4 text-xs text-slate-400 uppercase tracking-wider font-medium">
                                Belum punya akun?
                            </span>
                        </div>
                    </div>

                    {/* Secondary Actions */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Link 
                                href="/register-warga"
                                className="flex flex-col items-center justify-center py-4 px-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all duration-200 group text-center h-full"
                            >
                                <Users className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Daftar sebagai user Warga</span>
                            </Link>
                            <Link 
                                href="/register"
                                className="flex flex-col items-center justify-center py-4 px-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all duration-200 group text-center h-full"
                            >
                                <Building className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Daftar Sebagai User RT/RW</span>
                            </Link>
                        </div>

                        {/* Demo Section */}
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800/30">
                                <div className="flex gap-4">
                                    <div className="p-2.5 h-fit bg-emerald-100 dark:bg-emerald-800/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                                        <Monitor className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                                            Ingin mencoba sistem?
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                            Jelajahi semua fitur dashboard admin tanpa perlu mendaftar akun terlebih dahulu.
                                        </p>
                                        <button 
                                            onClick={handleDemoLogin}
                                            disabled={isDemoLoading}
                                            className="w-full flex justify-center items-center py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-xs font-bold transition-all shadow-sm group"
                                        >
                                            {isDemoLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    Memuat demo...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    Masuk Mode Demo
                                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Info Modal */}
            {activeInfoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl transform transition-all scale-100 relative border border-slate-100 dark:border-slate-800">
                        <button 
                            onClick={() => setActiveInfoModal(null)}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                {(() => {
                                    const Icon = infoModalContent[activeInfoModal].icon;
                                    return <Icon className="w-8 h-8" />;
                                })()}
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                {infoModalContent[activeInfoModal].title}
                            </h3>
                            
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                                {infoModalContent[activeInfoModal].content}
                            </p>
                            
                            <button
                                onClick={() => setActiveInfoModal(null)}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                            >
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f172a]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
