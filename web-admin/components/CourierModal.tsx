'use client';

import React, { useState } from 'react';

interface CourierModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: {
    courier_info: { name: string; phone: string; type: string };
    tracking_number?: string;
    tracking_link?: string;
  }) => void;
  courierType: 'INSTANT' | 'REGULER' | 'KURIR_TOKO' | 'PICKUP';
}

export default function CourierModal({ visible, onClose, onConfirm, courierType }: CourierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: '',
    tracking_number: '',
    tracking_link: '',
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.phone) {
      alert('Nama kurir dan nomor telepon wajib diisi');
      return;
    }

    // Validate tracking based on courier type
    if (courierType === 'INSTANT' && !formData.tracking_link) {
      alert('Link tracking untuk Instant wajib diisi');
      return;
    }

    if (courierType === 'REGULER' && !formData.tracking_number) {
      alert('Nomor resi untuk Reguler wajib diisi');
      return;
    }

    // Prepare data
    const data: any = {
      courier_info: {
        name: formData.name,
        phone: formData.phone,
        type: courierType,
      },
    };

    if (courierType === 'INSTANT' && formData.tracking_link) {
      data.tracking_link = formData.tracking_link;
    }

    if (courierType === 'REGULER' && formData.tracking_number) {
      data.tracking_number = formData.tracking_number;
    }

    onConfirm(data);
  };

  if (!visible) return null;

  const getModalTitle = () => {
    switch (courierType) {
      case 'INSTANT':
        return '📦 Kirim Pesanan - INSTANT';
      case 'REGULER':
        return '📦 Kirim Pesanan - REGULER';
      case 'KURIR_TOKO':
        return '📦 Kirim Pesanan - KURIR TOKO';
      case 'PICKUP':
        return '📦 Siapkan Pesanan - PICKUP';
      default:
        return 'Informasi Pengiriman';
    }
  };

  const showTrackingNumber = courierType === 'REGULER';
  const showTrackingLink = courierType === 'INSTANT';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Box */}
          <div className={`p-4 rounded-lg ${
            courierType === 'INSTANT' ? 'bg-blue-50 border border-blue-200' :
            courierType === 'REGULER' ? 'bg-green-50 border border-green-200' :
            courierType === 'PICKUP' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-gray-50 border border-gray-200'
          }`}>
            <p className="text-sm text-gray-700">
              {courierType === 'INSTANT' && '💡 Untuk pengiriman Instant (Grab/Gojek/Lalamove), pastikan driver sudah mengambil barang dan berikan link tracking.'}
              {courierType === 'REGULER' && '💡 Untuk pengiriman Reguler (JNE/SPX/dll), masukkan nomor resi yang bisa dilacak.'}
              {courierType === 'KURIR_TOKO' && '💡 Untuk kurir internal toko, masukkan nama staf pengirim.'}
              {courierType === 'PICKUP' && '💡 Untuk pengambilan sendiri, pastikan customer sudah diinformasikan untuk mengambil di lokasi.'}
            </p>
          </div>

          {/* Courier Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {courierType === 'KURIR_TOKO' ? 'Nama Staf Pengirim *' : 
               courierType === 'PICKUP' ? 'Catatan Pengambilan *' :
               'Nama Kurir / Ekspedisi *'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder={
                courierType === 'INSTANT' ? 'Contoh: GrabExpress - Ahmad' :
                courierType === 'REGULER' ? 'Contoh: JNE Regular' :
                courierType === 'KURIR_TOKO' ? 'Contoh: Budi (Kurir Toko)' :
                'Contoh: Siap diambil di Toko A'
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Telepon *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tracking Number (REGULER only) */}
          {showTrackingNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nomor Resi *
              </label>
              <input
                type="text"
                value={formData.tracking_number}
                onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
                placeholder="Contoh: JNE1234567890"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nomor resi akan ditampilkan di aplikasi mobile customer
              </p>
            </div>
          )}

          {/* Tracking Link (INSTANT only) */}
          {showTrackingLink && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link Tracking *
              </label>
              <input
                type="url"
                value={formData.tracking_link}
                onChange={(e) => setFormData({...formData, tracking_link: e.target.value})}
                placeholder="https://gojek.com/tracking/ABC123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Link akan dibuka di aplikasi Grab/Gojek/Lalamove customer
              </p>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            ✓ Konfirmasi Pengiriman
          </button>
        </div>
      </div>
    </div>
  );
}
