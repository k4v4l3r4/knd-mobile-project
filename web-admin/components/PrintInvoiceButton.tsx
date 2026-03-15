'use client';

import React from 'react';

interface PrintInvoiceButtonProps {
  orderId: number;
  orderNumber: string;
}

export default function PrintInvoiceButton({ orderId, orderNumber }: PrintInvoiceButtonProps) {
  const handlePrint = () => {
    // Open invoice in new window for printing
    const printUrl = `${process.env.NEXT_PUBLIC_API_URL}/invoices/${orderId}/print`;
    window.open(printUrl, '_blank');
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <svg 
        className="w-4 h-4 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
        />
      </svg>
      Cetak Invoice
    </button>
  );
}
