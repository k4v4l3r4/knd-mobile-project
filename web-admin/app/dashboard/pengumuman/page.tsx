'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Loader2,
  X,
  Calendar,
} from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { toast, Toaster } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  expires_at: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export default function PengumumanPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
    expires_at: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: number, title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoAnnouncements: Announcement[] = [
          {
            id: 1,
            title: 'Kerja Bakti Bersih Lingkungan',
            content: 'Kerja bakti akan dilaksanakan pada hari Minggu pukul 07.00 WIB. Mohon partisipasi seluruh warga untuk menjaga kebersihan lingkungan kita.',
            image_url: 'https://placehold.co/800x450?text=Kerja+Bakti',
            status: 'PUBLISHED',
            expires_at: null,
            created_at: new Date().toISOString(),
            likes_count: 12,
            comments_count: 3
          },
          {
            id: 2,
            title: 'Iuran Keamanan Bulan Ini',
            content: 'Mohon kepada seluruh warga untuk melunasi iuran keamanan bulan ini paling lambat tanggal 10.',
            image_url: 'https://placehold.co/800x450?text=Iuran+Keamanan',
            status: 'PUBLISHED',
            expires_at: null,
            created_at: new Date().toISOString(),
            likes_count: 8,
            comments_count: 1
          },
          {
            id: 3,
            title: 'Pendataan Warga Baru',
            content: 'Bagi warga baru atau yang belum terdata, silakan melapor ke pengurus RT untuk pendataan.',
            image_url: null,
            status: 'DRAFT',
            expires_at: null,
            created_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0
          }
        ];
        setAnnouncements(demoAnnouncements);
        return;
      }
      const response = await api.get('/announcements');
      if (response.data.success) {
        setAnnouncements(response.data.data.data || response.data.data);
      }
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching announcements:', error);
        toast.error('Gagal memuat data pengumuman');
      }
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    if (!status) return;
    fetchAnnouncements();
  }, [status, fetchAnnouncements]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast.error('Mode Demo: Simpan pengumuman tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('status', formData.status);
      if (formData.expires_at) {
        data.append('expires_at', formData.expires_at);
      }
      if (selectedImage) {
        data.append('image', selectedImage);
      }
      if (editingId) {
        data.append('_method', 'PUT');
      }

      const url = editingId ? `/announcements/${editingId}` : '/announcements';
      const response = await api.post(url, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success(editingId ? 'Pengumuman berhasil diperbarui' : 'Pengumuman berhasil dibuat');
        fetchAnnouncements();
        closeModal();
      }
    } catch (error: unknown) {
      console.error('Error submitting:', error);
      let message = 'Gagal menyimpan pengumuman';

      type ErrorResponse = {
        data?: {
          message?: string;
          errors?: Record<string, string[]>;
        };
      };

      const hasResponse =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: ErrorResponse }).response;

      if (hasResponse) {
        const response = (error as { response?: ErrorResponse }).response;
        const data = response?.data;

        if (data?.message) {
          message = data.message;
        } else if (data?.errors) {
          const errors = data.errors;
          const firstField = Object.keys(errors)[0];
          const firstMessage = firstField && errors[firstField]?.[0];
          if (firstMessage) {
            message = firstMessage;
          }
        }
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (item: Announcement) => {
    setItemToDelete({ id: item.id, title: item.title });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    if (isDemo) {
      toast.error('Mode Demo: Pengumuman tidak dapat dihapus');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/announcements/${itemToDelete.id}`);
      toast.success('Pengumuman berhasil dihapus');
      setAnnouncements(prev => prev.filter(a => a.id !== itemToDelete.id));
      setIsDeleteModalOpen(false);
    } catch {
      toast.error('Gagal menghapus pengumuman');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const openEdit = (item: Announcement) => {
    if (isDemo) {
      toast.error('Mode Demo: Edit pengumuman tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      status: item.status,
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString().split('T')[0] : ''
    });
    setPreviewUrl(getImageUrl(item.image_url));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', status: 'DRAFT', expires_at: '' });
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';
    return `${baseUrl}/storage/${path}`;
  };

  return (
    <div className="space-y-8 pb-10">
      <Toaster position="top-right" />
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Megaphone size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Megaphone size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Pengumuman & Informasi</h1>
            <DemoLabel />
          </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola broadcast informasi penting untuk seluruh warga RT.
           </p>
         </div>
         <div className="relative z-10 w-full md:w-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Buat Pengumuman
            </button>
         </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm p-4 animate-pulse">
               <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4"></div>
               <div className="space-y-3 px-2">
                 <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                 <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                 <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3"></div>
               </div>
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
            <Megaphone className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Belum ada pengumuman</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Mulai bagikan informasi penting kepada warga dengan membuat pengumuman baru.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 text-emerald-600 font-bold hover:underline"
          >
            + Buat Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {announcements.map((item) => (
            <div key={item.id} className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
              {/* Image Section */}
              <div className="h-52 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                {item.image_url ? (
                  <div
                    className="w-full h-full bg-center bg-cover group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url(${getImageUrl(item.image_url) || ''})` }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 pattern-grid">
                    <ImageIcon className="w-12 h-12 opacity-50" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm backdrop-blur-md border ${
                    item.status === 'PUBLISHED' 
                      ? 'bg-emerald-500/90 text-white border-emerald-400' 
                      : 'bg-amber-500/90 text-white border-amber-400'
                  }`}>
                    {item.status === 'PUBLISHED' ? 'Terbit' : 'Draft'}
                  </span>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <Calendar size={14} />
                  <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                
                <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed mb-6 flex-1">
                  {item.content}
                </p>
                
                {/* Footer Actions */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                  <div className="flex gap-4 text-xs font-medium text-slate-400">
                    {/* Stats placeholder if needed */}
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEdit(item)}
                      className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => confirmDelete(item)}
                      className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- CREATE/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 custom-scrollbar">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {editingId ? <Pencil className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> : <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />}
                {editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
              </h2>
              <button 
                onClick={closeModal} 
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Image Upload Area */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Gambar Utama</label>
                <div className="relative group">
                  <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer relative overflow-hidden ${
                    previewUrl ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    
                    {previewUrl ? (
                      <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-sm">
                        <div
                          className="h-full w-full bg-center bg-cover"
                          style={{ backgroundImage: `url(${previewUrl})` }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <p className="text-white font-bold flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" /> Ganti Gambar
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                           <ImageIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <p className="font-bold text-slate-600 dark:text-slate-300">Klik untuk upload gambar</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Format: JPG, PNG (Max 2MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="Contoh: Kerja Bakti Minggu Ini"
                />
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Status Publikasi</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.status === 'DRAFT' 
                      ? 'border-amber-500 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="status"
                      value="DRAFT"
                      checked={formData.status === 'DRAFT'}
                      onChange={() => setFormData({ ...formData, status: 'DRAFT' })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.status === 'DRAFT' ? 'border-amber-600' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {formData.status === 'DRAFT' && <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />}
                    </div>
                    <div>
                      <span className={`block text-sm font-bold ${formData.status === 'DRAFT' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>Draft</span>
                      <span className="text-xs text-slate-500">Simpan sebagai konsep</span>
                    </div>
                  </label>

                  <label className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.status === 'PUBLISHED' 
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="status"
                      value="PUBLISHED"
                      checked={formData.status === 'PUBLISHED'}
                      onChange={() => setFormData({ ...formData, status: 'PUBLISHED' })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.status === 'PUBLISHED' ? 'border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {formData.status === 'PUBLISHED' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                    </div>
                    <div>
                      <span className={`block text-sm font-bold ${formData.status === 'PUBLISHED' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>Publish</span>
                      <span className="text-xs text-slate-500">Tayangkan ke warga</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tanggal Berakhir (Opsional)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full pl-12 pr-5 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-white"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pengumuman akan otomatis menjadi Draft setelah tanggal ini.</p>
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Isi Pengumuman</label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-5 py-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700 dark:text-slate-200 leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                  placeholder="Tulis detail lengkap pengumuman di sini..."
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {editingId ? 'Simpan Perubahan' : 'Buat Pengumuman'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-500 rounded-full mx-auto mb-6">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">Hapus Pengumuman?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
              Apakah Anda yakin ingin menghapus{' '}
              <span className="font-bold text-slate-800 dark:text-white">{itemToDelete.title}</span>?
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-5 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
