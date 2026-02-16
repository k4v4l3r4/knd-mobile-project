'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import Cookies from 'js-cookie';
import api from '@/lib/api';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const phone = searchParams.get('phone');
    const token = searchParams.get('token');
    
    // Form State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Redirect if missing params
    useEffect(() => {
        if (!phone || !token) {
            toast.error("Link tidak valid atau kadaluarsa");
            router.push('/login');
        }
    }, [phone, token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (password.length < 6) {
            setError("Kata sandi minimal 6 karakter.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Kata sandi di kedua kolom belum sama.");
            return;
        }

        if (phone && password === phone) {
            setError("Kata sandi tidak boleh sama dengan nomor WhatsApp.");
            return;
        }

        // Additional phone specific check (e.g. without +62 or 08)
        // Simple heuristic: check if password contains phone number sequence
        if (phone && (password.includes(phone) || phone.includes(password))) {
             setError("Kata sandi terlalu mirip dengan nomor WhatsApp.");
             return;
        }

        setIsLoading(true);

        try {
            const response = await api.post('/auth/reset-password', {
                phone,
                token,
                password
            });

            if (response.data.success) {
                setIsSuccess(true);
                // Auto login logic
                const newToken = response.data.data.token;
                Cookies.set('admin_token', newToken, { expires: 1, path: '/' });
                
                toast.success('Kata sandi berhasil diubah!');
                
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                setError(response.data.message || 'Gagal mengubah kata sandi.');
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Terjadi kesalahan sistem.');
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
                 <div className="text-center p-8 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Kata Sandi Berhasil Diubah</h3>
                    <p className="text-slate-500">Mengalihkan ke Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex w-full font-sans bg-slate-50 dark:bg-[#0f172a]">
            <Toaster position="top-center" />
            
            {/* Left Side - Branding (Desktop) - Reused */}
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
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 inline-block shadow-xl">
                        <Image 
                            src="/knd-logo.png" 
                            alt="RT Online Logo" 
                            width={180} 
                            height={60} 
                            className="h-12 w-auto object-contain brightness-0 invert" 
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-2xl mt-12">
                    <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-white">
                        Kelola RT Lebih Rapi, <br/>
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
                                B
                            </div>
                            <div>
                                <p className="text-slate-200 italic mb-2 text-sm leading-relaxed">
                                    "Sejak pakai sistem ini, kas RT jauh lebih tertib dan warga jadi lebih percaya karena laporan keuangan selalu transparan."
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm">Bendahara RT 05</span>
                                    <span className="text-slate-500 text-xs">•</span>
                                    <span className="text-emerald-400 text-xs font-medium">150 Warga</span>
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
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Digunakan oleh RT/RW di Indonesia</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Reset Password Form */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-6 lg:p-12 relative bg-white dark:bg-[#0f172a] transition-colors duration-300">
                
                {/* Mobile Logo */}
                <div className="lg:hidden mb-8">
                     <Image 
                        src="/knd-logo.png" 
                        alt="RT Online Logo" 
                        width={150} 
                        height={50} 
                        className="h-12 w-auto object-contain dark:brightness-0 dark:invert" 
                    />
                </div>

                <div className="w-full max-w-[400px]">
                    <div className="mb-8">
                        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                            Buat Kata Sandi Baru
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-base leading-relaxed">
                            Gunakan kata sandi baru untuk mengamankan akun RT Anda.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Kata Sandi Baru
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                </div>
                                <input 
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Minimal 6 karakter"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError(null);
                                    }}
                                    className={`w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm font-medium`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Ulangi Kata Sandi Baru
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                </div>
                                <input 
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Ketik ulang kata sandi"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setError(null);
                                    }}
                                    className={`w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm font-medium`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium mt-1 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Primary Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Menyimpan...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>Simpan & Masuk Dashboard</span>
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            )}
                        </button>
                    </form>
                </div>
                
                {/* Mobile Copyright */}
                <div className="absolute bottom-6 text-xs text-slate-400 lg:hidden">
                    &copy; 2026 RT Online.
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat halaman reset kata sandi...</p>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
