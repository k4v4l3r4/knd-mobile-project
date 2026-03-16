'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerColor?: 'default' | 'emerald' | 'rose' | 'blue';
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  headerColor = 'default'
}: ModalProps) {
  if (!isOpen) return null;

  const headerColors = {
    default: 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800',
    rose: 'bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800',
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${headerColors[headerColor]}`}>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
