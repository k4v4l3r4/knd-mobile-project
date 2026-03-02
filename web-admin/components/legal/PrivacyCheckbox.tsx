"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PrivacyCheckboxProps {
  onChange: (checked: boolean) => void;
}

export function PrivacyCheckbox({ onChange }: PrivacyCheckboxProps) {
  const [isChecked, setIsChecked] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setIsChecked(checked)
    onChange(checked)
  }

  return (
    <div className="flex items-start space-x-3 my-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
      <input
        type="checkbox"
        id="privacy-agreement"
        checked={isChecked}
        onChange={handleCheckboxChange}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
      />
      <label htmlFor="privacy-agreement" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
        Saya menyetujui{' '}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault(); 
            setShowTermsModal(true);
          }}
          className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline focus:outline-none"
        >
          Syarat & Ketentuan
        </button>
        {' '}dan{' '}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setShowPrivacyModal(true);
          }}
          className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline focus:outline-none"
        >
          Kebijakan Privasi
        </button>
        {' '}Kynd, serta mengizinkan pemrosesan data pribadi saya untuk keperluan administrasi RT.
      </label>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-emerald-900">Kebijakan Privasi Data (UU PDP)</DialogTitle>
            <DialogDescription>
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-slate-600 text-sm leading-relaxed mt-2">
             <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 mb-4">
               <p className="font-medium text-emerald-800">
                 🛡️ Komitmen Privasi Kami
               </p>
               <p className="text-emerald-700 mt-1">
                 Data Anda dienkripsi dan hanya digunakan untuk kepentingan warga, bukan untuk dijual.
               </p>
             </div>

             <div>
               <h4 className="font-bold text-slate-900 mb-1">1. Data yang Kami Kumpulkan</h4>
               <p>Kami mengumpulkan data spesifik (Minimisasi Data) meliputi:</p>
               <ul className="list-disc pl-5 mt-1 space-y-1">
                 <li><strong>Data Identitas:</strong> NIK, Foto KTP, Nomor KK (untuk verifikasi kependudukan).</li>
                 <li><strong>Data Kontak:</strong> Nomor HP dan Alamat Email (untuk notifikasi darurat & iuran).</li>
                 <li><strong>Data Lokasi:</strong> Geo-tagging saat pelaporan insiden atau absen ronda.</li>
               </ul>
             </div>
             
             <div>
               <h4 className="font-bold text-slate-900 mb-1">2. Tujuan Penggunaan</h4>
               <p>Data Anda diproses secara sah untuk tujuan:</p>
               <ul className="list-disc pl-5 mt-1 space-y-1">
                 <li>Administrasi kependudukan RT/RW.</li>
                 <li>Manajemen keamanan lingkungan (Jadwal Ronda).</li>
                 <li>Transparansi keuangan (Iuran & Sumbangan).</li>
                 <li>Layanan surat pengantar otomatis.</li>
               </ul>
             </div>
             
             <div>
               <h4 className="font-bold text-slate-900 mb-1">3. Keamanan & Penyimpanan</h4>
               <p>
                 Seluruh data sensitif disimpan dengan enkripsi standar industri. Kami menerapkan kontrol akses ketat dimana hanya Pengurus RT berwenang yang dapat mengakses data detail.
               </p>
             </div>
             
             <div>
               <h4 className="font-bold text-slate-900 mb-1">4. Hak Anda (Subjek Data)</h4>
               <p>Sesuai UU PDP, Anda berhak untuk:</p>
               <ul className="list-disc pl-5 mt-1 space-y-1">
                 <li>Meminta koreksi data yang salah.</li>
                 <li>Meminta penghapusan data (Right to be Forgotten) saat pindah domisili.</li>
                 <li>Mendapatkan salinan data Anda.</li>
               </ul>
             </div>
          </div>
          <DialogFooter className="mt-6">
             <Button onClick={() => setShowPrivacyModal(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
               Saya Mengerti
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Syarat & Ketentuan Pengguna</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 text-slate-600 text-sm leading-relaxed mt-2">
             <p>Selamat datang di KND, Aplikasi Super App untuk Warga.</p>
             
             <div>
               <h4 className="font-bold text-slate-900 mb-1">1. Akurasi Data</h4>
               <p>Anda menjamin bahwa data yang Anda masukkan adalah benar, akurat, dan sesuai dengan dokumen resmi negara.</p>
             </div>

             <div>
               <h4 className="font-bold text-slate-900 mb-1">2. Etika Penggunaan</h4>
               <p>Anda dilarang menggunakan fitur pelaporan atau forum warga untuk menyebarkan kebencian, hoax, atau konten ilegal.</p>
             </div>

             <div>
               <h4 className="font-bold text-slate-900 mb-1">3. Kewajiban Pembayaran</h4>
               <p>Penggunaan fitur pembayaran iuran melalui aplikasi bersifat mengikat dan tercatat sebagai bukti sah di lingkungan RT.</p>
             </div>

             <div>
               <h4 className="font-bold text-slate-900 mb-1">4. Sanksi</h4>
               <p>Pengurus RT berhak menonaktifkan akun jika ditemukan pelanggaran terhadap syarat & ketentuan ini.</p>
             </div>
           </div>
           <DialogFooter className="mt-6">
             <Button onClick={() => setShowTermsModal(false)} variant="outline" className="w-full sm:w-auto">
               Tutup
             </Button>
             <Button onClick={() => {setShowTermsModal(false); if(!isChecked) document.getElementById('privacy-agreement')?.click();}} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto mt-2 sm:mt-0">
               Setuju & Lanjutkan
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
