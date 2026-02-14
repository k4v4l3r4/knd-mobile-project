'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Camera, 
  Save, 
  Lock, 
  Loader2,
  CheckCircle,
  AlertCircle,
  PenTool
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { formatRole } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar: string | null;
  photo_url: string | null; // Fallback
  signature_type: 'image' | 'auto_font' | 'qr_only';
  signature_image: string | null;
}

export default function ProfilePage() {
  const { isDemo, isExpired } = useTenant();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Signature States
  const [signatureType, setSignatureType] = useState<'image' | 'auto_font' | 'qr_only'>('auto_font');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      const userData = res.data.data;
      setUser(userData);
      setName(userData.name);
      setPhone(userData.phone);
      setSignatureType(userData.signature_type || 'auto_font');
      setSignaturePreview(userData.signature_image);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast.error('Mode Demo: Update profil tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('signature_type', signatureType);
      formData.append('_method', 'PUT');

      if (signatureFile) {
        formData.append('signature_image', signatureFile);
      }

      await api.post('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Profil berhasil diperbarui');
      fetchProfile();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB');
        return;
      }
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
      toast.error('Mode Demo: Ubah password tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    
    setPasswordSaving(true);
    try {
      await api.put('/profile/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword
      });
      toast.success('Password berhasil diperbarui');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat mengubah foto profil');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    // Preview logic if needed, but we'll direct upload
    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Foto profil berhasil diperbarui');
      fetchProfile();
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal mengupload foto');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Profil</h1>
        <DemoLabel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-50 bg-slate-100 relative">
                {user?.avatar || user?.photo_url ? (
                  <Image 
                    src={user?.avatar?.startsWith('http') ? user.avatar : `http://localhost:8000${user?.avatar || user?.photo_url}`} 
                    alt={user?.name || 'Profile'} 
                    fill
                    className="object-cover"
                    onError={(e) => {
                       // Fallback if image fails
                       (e.target as any).src = `https://ui-avatars.com/api/?name=${user?.name}&background=10b981&color=fff`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 text-3xl font-bold">
                    {user?.name?.charAt(0)}
                  </div>
                )}
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                <Camera size={16} />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-800">{user?.name}</h2>
            <p className="text-sm text-slate-500">{formatRole(user?.role)}</p>
            
            <div className="mt-6 w-full space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                <Mail size={16} className="text-emerald-500" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                <Shield size={16} className="text-emerald-500" />
                <span className="truncate">{formatRole(user?.role)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Edit Profile Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-emerald-500" />
              Informasi Pribadi
            </h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Nama Lengkap"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nomor Telepon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="08xxxxxxxx"
                    required
                  />
                </div>
              </div>
              
              {/* Signature Preference */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-sm font-medium text-slate-700 block mb-3">Preferensi Tanda Tangan (di Surat)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Option 1: Auto Font */}
                  <div 
                    onClick={() => setSignatureType('auto_font')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      signatureType === 'auto_font' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        signatureType === 'auto_font' ? 'border-emerald-500' : 'border-slate-300'
                      }`}>
                        {signatureType === 'auto_font' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Auto Text</span>
                    </div>
                    <div className="h-16 flex items-center justify-center bg-white rounded border border-slate-100">
                       <span className="text-2xl text-slate-800" style={{ fontFamily: 'cursive' }}>{name || 'Nama Anda'}</span>
                    </div>
                  </div>

                  {/* Option 2: Image Upload */}
                  <div 
                    onClick={() => setSignatureType('image')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      signatureType === 'image' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        signatureType === 'image' ? 'border-emerald-500' : 'border-slate-300'
                      }`}>
                         {signatureType === 'image' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Upload Scan</span>
                    </div>
                    <div className="h-16 flex items-center justify-center bg-white rounded border border-slate-100 overflow-hidden relative group">
                        {signaturePreview ? (
                            <img src={signaturePreview} alt="Signature" className="h-full w-auto object-contain" />
                        ) : (
                            <span className="text-xs text-slate-400">Belum ada</span>
                        )}
                        {signatureType === 'image' && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); signatureInputRef.current?.click(); }}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <PenTool size={16} className="text-white" />
                            </div>
                        )}
                    </div>
                    <input 
                        type="file" 
                        ref={signatureInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleSignatureFileChange} 
                    />
                  </div>

                  {/* Option 3: QR Only */}
                  <div 
                    onClick={() => setSignatureType('qr_only')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      signatureType === 'qr_only' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        signatureType === 'qr_only' ? 'border-emerald-500' : 'border-slate-300'
                      }`}>
                         {signatureType === 'qr_only' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">QR Only</span>
                    </div>
                    <div className="h-16 flex items-center justify-center bg-white rounded border border-slate-100">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 bg-slate-800 rounded mb-1"></div>
                            <span className="text-[10px] text-slate-500">Digital Valid</span>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Lock size={20} className="text-emerald-500" />
              Ubah Password
            </h3>
            
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password Saat Ini</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="********"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Minimal 8 karakter"
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Konfirmasi Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Ulangi password baru"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {passwordSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
