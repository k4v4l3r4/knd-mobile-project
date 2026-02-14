'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Timer,
  RefreshCw
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import api from '@/lib/api';

export default function VerifyOtpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const phone = searchParams.get('phone');
    
    // OTP State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(299); // 4:59 in seconds
    const [error, setError] = useState<string | null>(null);

    // Format phone for display
    const maskedPhone = phone 
        ? `+${phone.substring(0, 2)} ${phone.substring(2, 5)}-xxxx-${phone.substring(phone.length - 3)}`
        : 'nomor Anda';

    // Timer Logic
    useEffect(() => {
        if (!timeLeft) return;

        const intervalId = setInterval(() => {
            setTimeLeft(time => time - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timeLeft]);

    // Format Timer Display
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Handle OTP Input
    const handleOtpChange = (index: number, value: string) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError(null);

        // Auto focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            // Focus previous input on backspace if current is empty
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        
        if (pastedData) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length; i++) {
                newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            setError(null);
            
            // Focus appropriate input
            if (pastedData.length < 6) {
                inputRefs.current[pastedData.length]?.focus();
            } else {
                inputRefs.current[5]?.focus();
            }
        }
    };

    const handleResend = async () => {
        if (timeLeft > 0 || isResending) return;
        
        setIsResending(true);
        setError(null);

        try {
            const response = await api.post('/auth/forgot-password', { phone });
            
            if (response.data.success) {
                toast.success('Kode baru berhasil dikirim!');
                setTimeLeft(299); // Reset timer
            } else {
                setError(response.data.message || 'Gagal mengirim ulang kode.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mengirim ulang.');
        } finally {
            setIsResending(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpValue = otp.join('');
        
        if (otpValue.length < 6) {
            setError('Mohon lengkapi 6 digit kode OTP.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/verify-otp', {
                phone,
                otp: otpValue
            });

            if (response.data.success) {
                toast.success('Verifikasi berhasil!');
                // Redirect to reset password page
                router.push(`/reset-password?phone=${phone}&token=${response.data.data.token}`);
            } else {
                setError(response.data.message || 'Kode verifikasi salah.');
            }
        } catch (err: any) {
            if (err.response?.status === 422) {
                setError("Kode yang dimasukkan kurang tepat. Coba cek lagi WhatsApp Anda.");
            } else {
                setError(err.response?.data?.message || 'Terjadi kesalahan sistem.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!phone) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
                <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Data Tidak Lengkap</h3>
                    <p className="text-slate-500 mb-6">Mohon ulangi proses dari awal.</p>
                    <button 
                        onClick={() => router.push('/forgot-password')}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        Kembali
                    </button>
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

            {/* Right Side - Verify OTP Form */}
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
                            Verifikasi Nomor Anda
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-base leading-relaxed">
                            Kami telah mengirim 6 digit kode ke WhatsApp <br/>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">{maskedPhone}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* OTP Inputs */}
                        <div className="space-y-3">
                            <div className="flex gap-2 sm:gap-3 justify-between">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        autoFocus={index === 0}
                                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border ${
                                            error ? 'border-red-500 bg-red-50 text-red-600' : 
                                            digit ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white'
                                        } focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm`}
                                    />
                                ))}
                            </div>
                            
                            {error && (
                                <div className="flex items-center justify-center gap-1.5 text-red-500 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Timer & Resend */}
                        <div className="text-center">
                            {timeLeft > 0 ? (
                                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                                    <Timer className="w-4 h-4" />
                                    <span>Kirim ulang kode dalam <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{formattedTime}</span></span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={isResending}
                                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                                    {isResending ? 'Mengirim ulang...' : 'Kirim Ulang Kode WhatsApp'}
                                </button>
                            )}
                        </div>

                        {/* Primary Button */}
                        <button
                            type="submit"
                            disabled={otp.join('').length < 6 || isLoading}
                            className="w-full flex items-center justify-center py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Memverifikasi...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>Verifikasi Kode</span>
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            )}
                        </button>

                        {/* Secondary Action */}
                        <div className="text-center pt-2">
                            <button 
                                type="button"
                                onClick={() => router.push('/forgot-password')}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Ganti Nomor WhatsApp
                            </button>
                        </div>
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
