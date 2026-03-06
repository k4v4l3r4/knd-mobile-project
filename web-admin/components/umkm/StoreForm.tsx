'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Image as ImageIcon, X, Clock } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Store } from "@/types/umkm";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";
import { formatPhoneNumber } from '@/lib/phoneUtils';

interface StoreFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Store | null;
  isDemo?: boolean;
}

const STORE_CATEGORIES = [
  { id: 'FOOD', label: 'Kuliner' },
  { id: 'FASHION', label: 'Fashion & Pakaian' },
  { id: 'ELECTRONIC', label: 'Elektronik & Gadget' },
  { id: 'HOUSEHOLD', label: 'Kebutuhan Rumah Tangga' },
  { id: 'SERVICE', label: 'Jasa & Layanan' },
  { id: 'BEAUTY', label: 'Kesehatan & Kecantikan' },
  { id: 'HOBBY', label: 'Hobi & Koleksi' },
  { id: 'AUTOMOTIVE', label: 'Otomotif' },
  { id: 'GOODS', label: 'Barang Lainnya' },
];

const DAYS = [
  { id: 'monday', label: 'Senin' },
  { id: 'tuesday', label: 'Selasa' },
  { id: 'wednesday', label: 'Rabu' },
  { id: 'thursday', label: 'Kamis' },
  { id: 'friday', label: 'Jumat' },
  { id: 'saturday', label: 'Sabtu' },
  { id: 'sunday', label: 'Minggu' },
];

export default function StoreForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData, 
  isDemo 
}: StoreFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('FOOD');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState<Record<string, { open: string; close: string; is_closed: boolean }>>({});
  
  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Reset or Populate Form
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setCategory(initialData.category || 'FOOD');
        setContact(initialData.contact || '');
        setAddress(initialData.address || '');
        setImagePreview(initialData.image_url ? getImageUrl(initialData.image_url) : null);
        
        // Initialize operating hours
        if (initialData.operating_hours) {
          setOperatingHours(initialData.operating_hours);
        } else {
          // Default: 08:00 - 17:00, Open every day
          const defaultHours: Record<string, any> = {};
          DAYS.forEach(day => {
            defaultHours[day.id] = { open: '08:00', close: '17:00', is_closed: false };
          });
          setOperatingHours(defaultHours);
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('FOOD');
    setContact('');
    setAddress('');
    setImageFile(null);
    setImagePreview(null);
    setActiveTab('general');
    
    // Default hours
    const defaultHours: Record<string, any> = {};
    DAYS.forEach(day => {
      defaultHours[day.id] = { open: '08:00', close: '17:00', is_closed: false };
    });
    setOperatingHours(defaultHours);
  };

  const handleHoursChange = (day: string, field: string, value: any) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Ukuran foto maksimal 2MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan perubahan.');
      return;
    }

    if (!name || !contact) {
      toast.error('Nama Toko dan Kontak wajib diisi');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('contact', formatPhoneNumber(contact));
      formData.append('address', address);
      
      formData.append('operating_hours', JSON.stringify(operatingHours));
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      // If editing, we use POST with _method=PUT usually for Laravel multipart, 
      // or just POST if endpoint handles update. 
      // Based on StoreController, `store` method is for creation. 
      // `update` method likely exists but I haven't checked. 
      // Assuming typical Laravel resource controller: PUT /stores/{id}
      // But Laravel PUT with FormData/File upload has issues, so usually use POST with _method=PUT
      
      let url = '/stores';
      if (initialData) {
        url = `/stores/${initialData.id}`;
        formData.append('_method', 'PUT');
      }

      // Check if we are using the correct endpoint. 
      // StoreController.php `store` method is for creation.
      // I should check if there is an update method.
      
      await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(initialData ? 'Toko berhasil diperbarui' : 'Toko berhasil dibuat');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving store:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan data toko');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Toko' : 'Buat Toko Baru'}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Perbarui informasi toko Anda.' 
              : 'Isi informasi di bawah untuk mulai berjualan.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Informasi Umum</TabsTrigger>
              <TabsTrigger value="hours">Jam Operasional</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-6 mt-4">
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden group hover:border-emerald-500 transition-colors">
                  {imagePreview ? (
                    <Image 
                      src={imagePreview} 
                      alt="Preview" 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-xs">Upload Foto</span>
                    </div>
                  )}
                  
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="w-6 h-6 text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <span className="text-xs text-slate-500">
                  Format: JPG, PNG (Max 2MB)
                </span>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama Toko <span className="text-red-500">*</span></Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Contoh: Warung Sembako Berkah"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="contact">Kontak (WA/HP) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="contact" 
                      maxLength={15}
                      value={contact} 
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.startsWith('0')) val = '62' + val.substring(1);
                        setContact(val);
                      }} 
                      placeholder="628..."
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea 
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Alamat lengkap toko..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Deskripsi Singkat</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Jelaskan produk atau layanan Anda..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="hours" className="space-y-4 mt-4">
               <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                     <Clock className="w-4 h-4" />
                     <span>Atur jadwal buka tutup toko otomatis.</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                     {DAYS.map((day) => (
                        <div key={day.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                           <div className="w-24 font-medium">{day.label}</div>
                           
                           <div className="flex items-center gap-2">
                              <input 
                                type="checkbox"
                                id={`closed-${day.id}`}
                                checked={operatingHours[day.id]?.is_closed || false}
                                onChange={(e) => handleHoursChange(day.id, 'is_closed', e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                              />
                              <label htmlFor={`closed-${day.id}`} className="text-sm cursor-pointer select-none">Tutup</label>
                           </div>
                           
                           {!operatingHours[day.id]?.is_closed && (
                             <div className="flex items-center gap-2 ml-auto">
                                <Input 
                                  type="time" 
                                  value={operatingHours[day.id]?.open || '08:00'}
                                  onChange={(e) => handleHoursChange(day.id, 'open', e.target.value)}
                                  className="w-24 h-8"
                                />
                                <span className="text-slate-400">-</span>
                                <Input 
                                  type="time" 
                                  value={operatingHours[day.id]?.close || '17:00'}
                                  onChange={(e) => handleHoursChange(day.id, 'close', e.target.value)}
                                  className="w-24 h-8"
                                />
                             </div>
                           )}
                           
                           {operatingHours[day.id]?.is_closed && (
                             <div className="ml-auto text-sm text-slate-400 italic">
                                Toko Tutup
                             </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Toko'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
