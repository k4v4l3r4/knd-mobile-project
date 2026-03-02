import React from 'react';

interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 10 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm animate-pulse"
        >
          {/* Image placeholder */}
          <div className="aspect-square bg-slate-100 dark:bg-slate-800" />
          
          {/* Content placeholder */}
          <div className="p-3 space-y-3">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
