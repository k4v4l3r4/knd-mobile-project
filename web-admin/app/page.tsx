import Link from "next/link";
import Image from "next/image";
import { AiGuide } from "@/components/ui/AiGuide";
import { ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-10">
        <Image 
          src="/knd-logo.png" 
          alt="RT Online Logo" 
          width={240} 
          height={80} 
          className="h-20 w-auto object-contain" 
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AiGuide
            mood="welcoming"
            text="Halo Tetangga! 👋 Saya RTBot. Jangan bingung ya, aplikasi ini gampang banget kok. Mau langsung daftar atau coba-coba dulu (Demo)?"
            actionButton={
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Link
                  href="/login"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
                >
                  Masuk / Daftar Warga
                </Link>
                
                <Link
                  href="/api/auth/demo-login"
                  className="w-full bg-white hover:bg-slate-50 text-slate-600 font-medium py-3.5 px-6 rounded-xl border border-slate-200 transition-all text-center"
                >
                  Coba Mode Demo
                </Link>
              </div>
            }
          />
        </div>
      </main>

      {/* Footer Decoration (Optional) */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-emerald-50/50 to-transparent pointer-events-none" />
    </div>
  );
}
