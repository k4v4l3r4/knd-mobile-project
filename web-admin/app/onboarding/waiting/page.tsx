import Link from "next/link";
import { AiGuide } from "@/components/ui/AiGuide";
import { ShieldCheck, MessageCircle } from "lucide-react";

export default function WaitingPage() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col">
       {/* Header */}
       <header className="absolute top-0 left-0 w-full p-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">Kynd</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AiGuide
            mood="waiting"
            text="Data kamu sudah aman di meja Pak RT! ☕ Beliau mungkin lagi keliling atau istirahat. Sabar ya, biasanya nggak lama kok."
            actionButton={
              <Link
                href="https://wa.me/?text=Pak%20RT,%20saya%20sudah%20daftar%20di%20aplikasi%20RT%20Online,%20mohon%20dikonfirmasi%20ya.%20Terima%20kasih."
                target="_blank"
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5"
              >
                <MessageCircle className="w-5 h-5" />
                Ingatkan Pak RT
              </Link>
            }
          />
        </div>
      </main>
    </div>
  );
}
