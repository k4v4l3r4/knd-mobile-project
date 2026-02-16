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
  Monitor
} from 'lucide-react';
import api from '@/lib/api';
import { useTenant } from '@/context/TenantContext';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshStatus } = useTenant();
    const testimonials = [
        {
            initial: 'B',
            quote: 'Sejak pakai sistem ini, kas RT jauh lebih tertib dan warga jadi lebih percaya karena laporan keuangan selalu transparan.',
            name: 'Bendahara RT 05',
            meta: '150 Warga'
        },
        {
            initial: 'K',
            quote: 'Laporan iuran otomatis setiap bulan membantu kami menghemat banyak waktu dan mengurangi salah hitung.',
            name: 'Ketua RT 01',
            meta: '96 Warga'
        },
        {
            initial: 'S',
            quote: 'Warga jadi lebih mudah lapor dan memantau status pengajuan surat tanpa harus datang ke pos.',
            name: 'Sekretaris RW 03',
            meta: '220 Warga'
        }
    ];
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});
    const [testimonialIndex, setTestimonialIndex] = useState(0);
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
    const [resetPhone, setResetPhone] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [resetError, setResetError] = useState('');
    const [isResetLoading, setIsResetLoading] = useState(false);

    useEffect(() => {
        if (searchParams.get('expired') === '1') {
            toast.error('Sesi Anda telah berakhir. Silakan login kembali.', {
                duration: 4000,
                icon: '🔒'
            });
            // Hapus parameter expired agar pesan tidak muncul terus saat refresh
            router.replace('/login');
        }
    }, [searchParams, router]);

    useEffect(() => {
        if (testimonials.length <= 1) return;
        const interval = setInterval(() => {
            setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

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
            await api.post('/auth/forgot-password', { phone: targetPhone });
            setResetPhone(targetPhone);
            toast.success('Kode verifikasi telah dikirim ke WhatsApp Anda.');
            setResetStep(2);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal mengirim kode verifikasi. Mohon coba lagi.';
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
                phone: resetPhone,
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
        } catch (error: any) {
            const message = error.response?.data?.message || 'Kode verifikasi tidak valid. Mohon coba lagi.';
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
                phone: resetPhone,
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
        } catch (error: any) {
            const message = error.response?.data?.message || 'Gagal menyimpan kata sandi baru. Mohon coba lagi.';
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
                phone,
                password,
            });

            if (response.data.success) {
                const token = response.data.data.token;
                Cookies.set('admin_token', token, { expires: 1, path: '/' });
                await refreshStatus();
                toast.success('Login berhasil! Mengalihkan...');
                router.push('/dashboard');
            } else {
                setErrors({ general: response.data.message || 'Login gagal.' });
                setIsLoading(false);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const status = error.response?.status;
            
            if (status === 401) {
                setErrors({ general: "Nomor atau kata sandi tidak sesuai." });
            } else if (status === 403) {
                setErrors({ general: "Akun Anda saat ini tidak aktif. Hubungi Admin RW." });
            } else {
                setErrors({ general: error.response?.data?.message || "Terjadi kesalahan sistem. Silakan coba lagi." });
            }
            
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setIsDemoLoading(true);
        try {
            window.location.href = '/api/auth/demo-login';
        } catch (error) {
            setIsDemoLoading(false);
            toast.error('Gagal membuka mode demo.');
        }
    };

    return (
        <div className="min-h-screen flex w-full font-sans bg-white dark:bg-[#0f172a]">
            
            {/* Left Side - Branding & Visual (Desktop) */}
            <div className="hidden lg:flex w-[55%] relative overflow-hidden flex-col justify-between p-16 text-white bg-slate-900">
                {/* Background Patterns */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-emerald-950 z-0"></div>
                <div className="absolute inset-0 opacity-10 z-0" style={{ 
                    backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', 
                    backgroundSize: '40px 40px' 
                }}></div>
                
                {/* Glow Effects */}
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[100px]"></div>

                {/* Header: Logo */}
                <div className="relative z-10">
                    <Image 
                        src="/knd-logo.png" 
                        alt="RT Online Logo" 
                        width={240} 
                        height={80} 
                        className="h-16 w-auto object-contain" 
                    />
                    <p className="mt-4 text-sm font-medium tracking-[0.2em] text-emerald-100/80 uppercase">
                        Kawasan Nyaman Digital
                    </p>
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-2xl mt-12">
                    <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-white">
                        Kelola RT Lebih Rapih, <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            Transparan, dan Digital
                        </span>
                    </h1>
                    <p className="text-lg text-slate-300 mb-10 font-light leading-relaxed max-w-lg">
                        Sistem administrasi RT modern, aman, dan mudah digunakan untuk kebutuhan warga masa kini.
                    </p>

                    {/* Value Props */}
                    <div className="space-y-4 mb-12">
                        {[
                            'Kelola iuran warga otomatis',
                            'Catat kas & pengeluaran RT',
                            'Laporan real-time & transparan'
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 group">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="text-slate-200 font-medium">{item}</span>
                            </div>
                        ))}
                    </div>

                    {/* Testimonial Card */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {testimonials[testimonialIndex].initial}
                            </div>
                            <div>
                                <p className="text-slate-200 italic mb-2 text-sm leading-relaxed">
                                    "{testimonials[testimonialIndex].quote}"
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm">
                                        {testimonials[testimonialIndex].name}
                                    </span>
                                    <span className="text-slate-500 text-xs">•</span>
                                    <span className="text-emerald-400 text-xs font-medium">
                                        {testimonials[testimonialIndex].meta}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer: Trust Badges */}
                <div className="relative z-10 flex items-center gap-6 mt-12">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-100">Data Terenkripsi & Aman</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-100">Digunakan oleh RT/RW di Indonesia</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col justify-center items-center p-6 md:p-12 xl:p-24 bg-white dark:bg-slate-900 relative">
                <div className="w-full max-w-md space-y-8">
                    
                    {/* Header Section */}
                    <div className="text-center lg:text-left space-y-2">
                         {/* Logo for Mobile only */}
                         <div className="lg:hidden flex justify-center mb-6">
                            <Image 
                                src="/knd-logo.png" 
                                alt="Logo" 
                                width={120} 
                                height={40} 
                                className="h-12 w-auto object-contain"
                            />
                         </div>

                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Login Admin
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-[0.15em] uppercase">
                            Kawasan Nyaman Digital
                        </p>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleLogin} className="space-y-6 mt-8">
                        
                        {/* Error Alert */}
                        {errors.general && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                {errors.general}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* WhatsApp Input */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
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
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border ${errors.phone ? 'border-red-300 ring-red-100' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="08123456789"
                                    />
                                </div>
                                {errors.phone && <p className="text-red-500 text-xs ml-1">{errors.phone}</p>}
                            </div>

                            {/* Password Input */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Kata Sandi
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
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
                                        className={`block w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border ${errors.password ? 'border-red-300 ring-red-100' : 'border-slate-200 dark:border-slate-700'} rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
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

                        {/* Primary Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-emerald-600/20 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Masuk Sekarang
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {isResetOpen && (
                        <div className="mt-6 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 bg-emerald-50/60 dark:bg-emerald-900/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                        Reset Kata Sandi
                                    </p>
                                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                        Langkah {resetStep} dari 3
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetOpen(false);
                                        setResetError('');
                                    }}
                                    className="text-xs text-emerald-700 dark:text-emerald-200 hover:underline"
                                >
                                    Tutup
                                </button>
                            </div>

                            {resetError && (
                                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs border border-red-100">
                                    {resetError}
                                </div>
                            )}

                            {resetStep === 1 && (
                                <form onSubmit={handleResetRequestOtp} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                                            Nomor WhatsApp yang terdaftar
                                        </label>
                                        <input
                                            type="tel"
                                            value={resetPhone}
                                            onChange={(e) => setResetPhone(e.target.value)}
                                            className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                            placeholder="08123456789"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isResetLoading}
                                        className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isResetLoading ? 'Mengirim kode...' : 'Kirim Kode Verifikasi'}
                                    </button>
                                </form>
                            )}

                            {resetStep === 2 && (
                                <form onSubmit={handleResetVerifyOtp} className="space-y-3">
                                    <p className="text-xs text-emerald-800 dark:text-emerald-100">
                                        Masukkan kode verifikasi 6 digit yang dikirim ke WhatsApp {resetPhone}.
                                    </p>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                                            Kode Verifikasi
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={resetOtp}
                                            onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tracking-[0.4em] text-center"
                                            placeholder="••••••"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isResetLoading}
                                        className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isResetLoading ? 'Memeriksa kode...' : 'Verifikasi Kode'}
                                    </button>
                                </form>
                            )}

                            {resetStep === 3 && (
                                <form onSubmit={handleResetSubmitPassword} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                                            Kata Sandi Baru
                                        </label>
                                        <input
                                            type="password"
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                            placeholder="Minimal 6 karakter"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                                            Konfirmasi Kata Sandi Baru
                                        </label>
                                        <input
                                            type="password"
                                            value={resetPasswordConfirm}
                                            onChange={(e) => setResetPasswordConfirm(e.target.value)}
                                            className="block w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                            placeholder="Ulangi kata sandi baru"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isResetLoading}
                                        className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isResetLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Separation / Divider */}
                    <div className="relative py-4">
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
                    <div className="space-y-6 text-center">
                        <Link 
                            href="/register"
                            className="block w-full py-3.5 px-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400 bg-transparent transition-all duration-200"
                        >
                            Daftarkan RT/RW Saya (Gratis)
                        </Link>

                        <div className="pt-2">
                            <button 
                                onClick={handleDemoLogin}
                                disabled={isDemoLoading}
                                className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition-all duration-200 group"
                            >
                                {isDemoLoading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                                        Memuat demo...
                                    </span>
                                ) : (
                                    <>
                                        <Monitor className="w-4 h-4 mr-2 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                        Lihat Demo Sistem
                                    </>
                                )}
                            </button>
                        </div>
                        
                        {/* Copyright Info */}
                        <div className="lg:hidden text-xs text-slate-400">
                            &copy; 2026 KND - Kawasan Nyaman Digital
                        </div>
                    </div>

                </div>
            </div>
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
