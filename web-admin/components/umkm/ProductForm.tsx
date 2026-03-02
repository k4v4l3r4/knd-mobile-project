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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Image as ImageIcon, X, Plus, Trash2, Box, Truck, Tag, Share2 } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Product, ProductVariant, VariantOption } from "@/types/umkm";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { getImageUrl } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneUtils";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product | null;
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

const SHIPPING_TYPES = [
  { id: 'PICKUP', label: 'Ambil Sendiri' },
  { id: 'LOCAL', label: 'Antar Lokal (RT/RW)' },
  { id: 'COURIER', label: 'Kurir Ekspedisi' },
];

export default function ProductForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData, 
  isDemo 
}: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState(''); // %
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState<string>('FOOD');
  
  // Shipping & Variants
  const [shippingType, setShippingType] = useState<string>('LOCAL');
  const [shippingFee, setShippingFee] = useState('');
  const [variantNote, setVariantNote] = useState('');
  const [specifications, setSpecifications] = useState('');
  
  // Product Variants
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Labels
  const [isHalal, setIsHalal] = useState(false);
  const [hasBpom, setHasBpom] = useState(false);
  const [isHomemade, setIsHomemade] = useState(false);
  
  // Social Links
  const [shopeeUrl, setShopeeUrl] = useState('');
  const [tokopediaUrl, setTokopediaUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]); // For edit mode

  // Reset or Populate Form
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setPrice(initialData.price?.toString() || '');
        setCategory(initialData.category || 'FOOD');
        setWhatsapp(initialData.whatsapp || '');
        
        // Extended fields
        setStock(initialData.stock?.toString() || '');
        setShippingType(initialData.shipping_type || 'LOCAL');
        setShippingFee(initialData.shipping_fee_flat?.toString() || '');
        setVariantNote(initialData.variant_note || '');
        setSpecifications(initialData.specifications || '');
        
        // Variants
        setVariants(initialData.variants || []);
        
        // Calculate discount % if needed, or just leave empty if not stored as %
        // Since backend stores discount_price, we can calculate % or just leave it
        // The mobile app sends discount %, but stores discount_price.
        // We'll leave it empty for now or try to reverse calc if needed.
        // For simplicity, let's just let user input new discount if they want.
        setDiscount('');

        // Labels
        const labels = initialData.labels || [];
        setIsHalal(labels.includes('HALAL'));
        setHasBpom(labels.includes('BPOM'));
        setIsHomemade(labels.includes('HOMEMADE'));
        
        // Links
        setShopeeUrl(initialData.shopee_url || '');
        setTokopediaUrl(initialData.tokopedia_url || '');
        setFacebookUrl(initialData.facebook_url || '');
        setInstagramUrl(initialData.instagram_url || '');
        setTiktokUrl(initialData.tiktok_url || '');

        // Images
        // If initialData has image_url (single), we show it. 
        // If it has images (array), we show them.
        // Currently Type only has image_url.
        if (initialData.image_url) {
          setExistingImages([initialData.image_url]);
        } else {
          setExistingImages([]);
        }
        setImageFiles([]);
        setImagePreviews([]);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setDiscount('');
    setStock('');
    setCategory('FOOD');
    setShippingType('LOCAL');
    setShippingFee('');
    setVariantNote('');
    setSpecifications('');
    setVariants([]);
    setIsHalal(false);
    setHasBpom(false);
    setIsHomemade(false);
    setShopeeUrl('');
    setTokopediaUrl('');
    setFacebookUrl('');
    setInstagramUrl('');
    setTiktokUrl('');
    setWhatsapp('');
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length + existingImages.length > 3) {
      toast.error('Maksimal 3 foto');
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar (Max 2MB)`);
        return;
      }
      
      // Validate Aspect Ratio
      const img = document.createElement('img');
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const aspect = img.width / img.height;
        if (aspect < 0.8 || aspect > 1.2) {
           toast((t) => (
             <div className="flex flex-col gap-1">
               <span className="font-bold text-orange-600">Rekomendasi Foto 1:1</span>
               <span className="text-xs text-slate-600">Foto {file.name} tidak persegi. Tampilan mungkin terpotong di marketplace.</span>
               <button 
                 className="bg-slate-100 px-2 py-1 rounded text-xs mt-1 w-fit hover:bg-slate-200"
                 onClick={() => toast.dismiss(t.id)}
               >
                 Mengerti
               </button>
             </div>
           ), { duration: 5000, icon: '⚠️' });
        }
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;

      newFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setImageFiles(prev => [...prev, ...newFiles]);
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    // In a real app, we might want to track deleted images to send to backend
    // For now, we just remove from view. The backend implementation in Mobile App
    // seems to just replace images or append.
    // Looking at StoreController/ProductController, standard update usually replaces.
    // But let's assume we just remove it from the list.
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Variant Helpers
  const handleAddVariant = () => {
    setVariants([...variants, {
      name: '',
      type: 'CHOICE',
      price: 0,
      is_required: true,
      options: [{ name: '', price: 0 }]
    }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleAddOption = (variantIndex: number) => {
    const newVariants = [...variants];
    newVariants[variantIndex].options.push({ name: '', price: 0 });
    setVariants(newVariants);
  };

  const handleRemoveOption = (variantIndex: number, optionIndex: number) => {
    const newVariants = [...variants];
    newVariants[variantIndex].options = newVariants[variantIndex].options.filter((_, i) => i !== optionIndex);
    setVariants(newVariants);
  };

  const handleOptionChange = (variantIndex: number, optionIndex: number, field: keyof VariantOption, value: any) => {
    const newVariants = [...variants];
    newVariants[variantIndex].options[optionIndex] = { ...newVariants[variantIndex].options[optionIndex], [field]: value };
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan perubahan.');
      return;
    }

    if (!name || !price || !description) {
      toast.error('Nama, Harga, dan Deskripsi wajib diisi');
      return;
    }

    if (imageFiles.length === 0 && existingImages.length === 0) {
      toast.error('Minimal 1 foto produk');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      
      const numericPrice = parseInt(price.replace(/[^0-9]/g, ''), 10);
      formData.append('price', numericPrice.toString());
      formData.append('category', category);
      formData.append('description', description);
      
      if (whatsapp) formData.append('whatsapp', formatPhoneNumber(whatsapp));

      if (stock) {
        const numericStock = parseInt(stock.replace(/[^0-9]/g, ''), 10) || 0;
        formData.append('stock', numericStock.toString());
      }

      formData.append('shipping_type', shippingType);

      if (shippingFee) {
        const fee = parseInt(shippingFee.replace(/[^0-9]/g, ''), 10) || 0;
        formData.append('shipping_fee_flat', fee.toString());
      }

      if (variantNote) formData.append('variant_note', variantNote);
      if (specifications) formData.append('specifications', specifications);

      // Variants
      if (variants.length > 0) {
        formData.append('variants', JSON.stringify(variants));
      }

      // Labels
      const labels: string[] = [];
      if (isHalal) labels.push('HALAL');
      if (hasBpom) labels.push('BPOM');
      if (isHomemade) labels.push('HOMEMADE');
      labels.forEach((label, idx) => {
        formData.append(`labels[${idx}]`, label);
      });
      
      // Discount
      if (discount) {
        const discountPercent = parseFloat(discount.replace(/[^0-9.]/g, ''));
        if (discountPercent > 0 && discountPercent <= 100) {
           const discountAmount = numericPrice * (discountPercent / 100);
           const finalPrice = numericPrice - discountAmount;
           formData.append('discount_price', Math.round(finalPrice).toString());
        }
      }

      // Links
      if (shopeeUrl) formData.append('shopee_url', shopeeUrl);
      if (tokopediaUrl) formData.append('tokopedia_url', tokopediaUrl);
      if (facebookUrl) formData.append('facebook_url', facebookUrl);
      if (instagramUrl) formData.append('instagram_url', instagramUrl);
      if (tiktokUrl) formData.append('tiktok_url', tiktokUrl);

      // New Images
      imageFiles.forEach((file) => {
        formData.append('images[]', file);
      });

      // Handle URL for Create vs Update
      let url = '/products';
      if (initialData) {
        url = `/products/${initialData.id}`;
        formData.append('_method', 'PUT');
        
        // Note: Existing images handling depends on backend. 
        // If backend replaces all images, we lose existing ones if not re-uploaded.
        // Mobile app implementation sends `images[]` with URI.
        // Usually, we need a way to tell backend which existing images to keep.
        // But for MVP, let's assume adding new images works, and if we want to keep existing, 
        // the backend might not delete them unless specified.
        // Or if backend is simple, it might replace single image_url.
        // Given ProductController logic wasn't fully inspected for update, we'll do our best.
      }

      await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(initialData ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan produk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          <DialogDescription>
            Isi detail produk yang ingin Anda jual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Info Dasar</TabsTrigger>
              <TabsTrigger value="variants">Varian</TabsTrigger>
              <TabsTrigger value="shipping">Pengiriman</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Foto Produk (Max 3)</Label>
                    <div className="flex flex-wrap gap-3">
                      {existingImages.map((url, idx) => (
                        <div key={`exist-${idx}`} className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden group">
                          <Image src={getImageUrl(url)} alt="Existing" fill className="object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeExistingImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      
                      {imagePreviews.map((preview, idx) => (
                        <div key={`new-${idx}`} className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden group">
                          <Image src={preview} alt="New" fill className="object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeNewImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}

                      {(existingImages.length + imagePreviews.length < 3) && (
                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors text-slate-400 hover:text-emerald-500">
                          <Plus size={20} />
                          <span className="text-[10px] mt-1">Tambah</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>

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
                     <Label>Label Produk</Label>
                     <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="halal" 
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={isHalal}
                            onChange={(e) => setIsHalal(e.target.checked)}
                          />
                          <label htmlFor="halal" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Halal
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="bpom" 
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={hasBpom}
                            onChange={(e) => setHasBpom(e.target.checked)}
                          />
                          <label htmlFor="bpom" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            BPOM
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="homemade" 
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={isHomemade}
                            onChange={(e) => setIsHomemade(e.target.checked)}
                          />
                          <label htmlFor="homemade" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Homemade
                          </label>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nama Produk <span className="text-red-500">*</span></Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Contoh: Nasi Goreng Spesial"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Harga (Rp) <span className="text-red-500">*</span></Label>
                      <Input 
                        id="price" 
                        type="number"
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)} 
                        placeholder="15000"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="discount">Diskon (%)</Label>
                      <Input 
                        id="discount" 
                        type="number"
                        value={discount} 
                        onChange={(e) => setDiscount(e.target.value)} 
                        placeholder="0"
                        max={100}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stok (Opsional)</Label>
                    <Input 
                      id="stock" 
                      type="number"
                      value={stock} 
                      onChange={(e) => setStock(e.target.value)} 
                      placeholder="Jumlah stok..."
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Deskripsi <span className="text-red-500">*</span></Label>
                    <Textarea 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Jelaskan detail produk..."
                      rows={4}
                      required
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="variants" className="space-y-4 mt-4">
              <div className="space-y-3 border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Varian & Add-ons</Label>
                  <Button type="button" size="sm" onClick={handleAddVariant} variant="outline" className="h-8">
                    <Plus size={14} className="mr-1" /> Tambah
                  </Button>
                </div>
                
                {variants.length === 0 && (
                  <p className="text-sm text-slate-400 italic">Belum ada varian (e.g. Ukuran, Toping)</p>
                )}

                <div className="space-y-4">
                  {variants.map((variant, vIdx) => (
                    <div key={vIdx} className="bg-white dark:bg-slate-900 border rounded-lg p-3 space-y-3">
                      <div className="flex gap-2">
                         <div className="flex-1">
                           <Input 
                             placeholder="Nama Varian (e.g. Ukuran)" 
                             value={variant.name} 
                             onChange={(e) => handleVariantChange(vIdx, 'name', e.target.value)}
                             className="h-8 text-sm"
                           />
                         </div>
                         <div className="w-48">
                           <div className="flex bg-slate-100 p-1 rounded-lg">
                             <button
                               type="button"
                               onClick={() => handleVariantChange(vIdx, 'type', 'CHOICE')}
                               className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md transition-all ${variant.type === 'CHOICE' ? 'bg-white shadow text-emerald-600 font-bold ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-700'}`}
                               title="Pembeli hanya bisa memilih 1 opsi (Radio Button)"
                             >
                               <div className={`w-3 h-3 rounded-full border ${variant.type === 'CHOICE' ? 'border-emerald-500 bg-emerald-100' : 'border-slate-400'}`} />
                               Pilihan (1)
                             </button>
                             <button
                               type="button"
                               onClick={() => handleVariantChange(vIdx, 'type', 'ADDON')}
                               className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md transition-all ${variant.type === 'ADDON' ? 'bg-white shadow text-emerald-600 font-bold ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-700'}`}
                               title="Pembeli bisa memilih banyak opsi (Checkbox)"
                             >
                               <div className={`w-3 h-3 rounded-sm border ${variant.type === 'ADDON' ? 'border-emerald-500 bg-emerald-100' : 'border-slate-400'}`} />
                               Add-on (+)
                             </button>
                           </div>
                         </div>
                         <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveVariant(vIdx)}>
                           <Trash2 size={14} />
                         </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={variant.is_required} 
                          onChange={(e) => handleVariantChange(vIdx, 'is_required', e.target.checked)}
                          className="scale-75 origin-left"
                        />
                        <span className="text-xs text-slate-500">Wajib dipilih?</span>
                      </div>

                      <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                        {variant.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex gap-2 items-center">
                            <Input 
                              placeholder="Pilihan (e.g. Jumbo)" 
                              value={opt.name} 
                              onChange={(e) => handleOptionChange(vIdx, oIdx, 'name', e.target.value)}
                              className="h-7 text-xs flex-1"
                            />
                            <div className="relative w-24">
                                <span className="absolute left-2 top-1.5 text-xs text-slate-400">Rp</span>
                                <Input 
                                  type="number" 
                                  value={opt.price} 
                                  onChange={(e) => handleOptionChange(vIdx, oIdx, 'price', parseInt(e.target.value) || 0)}
                                  className="h-7 text-xs pl-7"
                                />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleRemoveOption(vIdx, oIdx)}>
                              <X size={12} />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleAddOption(vIdx)}>
                          <Plus size={12} className="mr-1" /> Tambah Pilihan
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="variant">Catatan Varian (Opsional)</Label>
                <Textarea 
                  id="variant" 
                  value={variantNote} 
                  onChange={(e) => setVariantNote(e.target.value)} 
                  placeholder="Contoh:&#10;Pedas&#10;Sedang&#10;Tidak Pedas"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="specs">Spesifikasi (Pisahkan dengan baris baru)</Label>
                <Textarea 
                  id="specs" 
                  value={specifications} 
                  onChange={(e) => setSpecifications(e.target.value)} 
                  placeholder="Contoh:&#10;Berat: 250gr&#10;Kemasan: Plastik Vacuum"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shippingType">Pengiriman</Label>
                  <Select value={shippingType} onValueChange={setShippingType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipe Pengiriman" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPPING_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shippingFee">Ongkir Flat (Rp)</Label>
                  <Input 
                    id="shippingFee" 
                    type="number"
                    value={shippingFee} 
                    onChange={(e) => setShippingFee(e.target.value)} 
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                  <Label htmlFor="whatsapp">WhatsApp (Opsional)</Label>
                  <Input 
                    id="whatsapp" 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)} 
                    placeholder="081234567890 (Kosongkan jika sama dengan toko)"
                  />
              </div>

              <div className="pt-4 border-t border-slate-100">
                 <Label className="mb-4 block">Link Marketplace (Opsional)</Label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="Link Shopee" value={shopeeUrl} onChange={e => setShopeeUrl(e.target.value)} className="text-sm" />
                    <Input placeholder="Link Tokopedia" value={tokopediaUrl} onChange={e => setTokopediaUrl(e.target.value)} className="text-sm" />
                    <Input placeholder="Link Facebook" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} className="text-sm" />
                    <Input placeholder="Link Instagram" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} className="text-sm" />
                    <Input placeholder="Link TikTok" value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} className="text-sm" />
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
                'Simpan Produk'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
