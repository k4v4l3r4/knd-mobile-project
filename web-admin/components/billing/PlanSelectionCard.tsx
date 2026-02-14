'use client';

import React from 'react';
import { Plan } from '@/types/billing';
import { Check, Loader2 } from 'lucide-react';

interface PlanSelectionCardProps {
  plan: Plan;
  onSelect: (planId: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  isPopular?: boolean;
}

export const PlanSelectionCard: React.FC<PlanSelectionCardProps> = ({ 
  plan, 
  onSelect, 
  isLoading, 
  disabled = false,
  isPopular = false
}) => {
  return (
    <div className={`relative flex flex-col p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 transition-all duration-300 ${
      isPopular 
        ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 scale-105 z-10' 
        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
    } ${disabled ? 'opacity-60 grayscale' : ''}`}>
      
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          PALING LARIS
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900 dark:text-white">
            Rp {plan.price.toLocaleString('id-ID')}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {plan.type === 'LIFETIME' ? '/ selamanya' : plan.type === 'YEARLY' ? '/ tahun' : '/ bulan'}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
      </div>

      <ul className="flex-1 space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full p-0.5 shrink-0">
              <Check size={10} strokeWidth={3} />
            </div>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isLoading || disabled}
        className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
          isPopular
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
            : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900'
        } disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Pilih Paket'}
      </button>
    </div>
  );
};
