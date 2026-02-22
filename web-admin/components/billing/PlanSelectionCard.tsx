'use client';

import React from 'react';
import { Plan } from '@/types/billing';
import { Check, Loader2 } from 'lucide-react';

interface PlanSelectionCardProps {
  plan: Plan;
  onSelect: (plan: Plan) => void;
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
    <div className={`relative group flex flex-col h-full p-8 md:p-10 bg-white dark:bg-slate-900 rounded-[28px] border-2 transition-all duration-300 transform ${
      isPopular 
        ? 'border-emerald-500 shadow-2xl shadow-emerald-500/20 scale-105 z-10 group-hover:scale-110 group-hover:-translate-y-3 bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-900/20 dark:to-slate-900'
        : 'border-slate-100 dark:border-slate-800 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/15 hover:-translate-y-3 bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-900 dark:to-slate-950'
    } ${disabled ? 'opacity-60 grayscale cursor-not-allowed' : 'cursor-pointer'}`}>
      
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          PALING LARIS
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {plan.name}
        </h3>
        <div className="mt-3 space-y-1">
          {plan.originalPrice && plan.discountPercent && plan.discountPercent > 0 && (
            <div className="text-xs md:text-sm text-slate-400 line-through">
              Rp {plan.originalPrice.toLocaleString('id-ID')}
            </div>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-none">
              Rp {plan.price.toLocaleString('id-ID')}
            </span>
            <span className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">
              {plan.type === 'LIFETIME' ? '/ selamanya' : plan.type === 'YEARLY' ? '/ tahun' : '/ bulan'}
            </span>
          </div>
          {plan.discountPercent && plan.discountPercent > 0 && plan.originalPrice && (
            <div className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
              Hemat {plan.discountPercent}%
            </div>
          )}
        </div>
        <p className="mt-3 text-sm md:text-base text-slate-500 dark:text-slate-400">
          {plan.description}
        </p>
      </div>

      <ul className="flex-1 space-y-3 md:space-y-4 mb-10">
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
        onClick={() => onSelect(plan)}
        disabled={isLoading || disabled}
        className={`w-full py-3.5 md:py-4 px-5 rounded-2xl font-bold text-sm md:text-base tracking-wide transition-all flex items-center justify-center gap-2 ${
          isPopular
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30'
            : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-lg shadow-slate-900/10'
        } disabled:cursor-not-allowed disabled:opacity-70 active:scale-95`}
      >
        {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Pilih Paket'}
      </button>
    </div>
  );
};
