import React from 'react';

interface WargaSkeletonProps {
  count?: number;
}

export function WargaSkeleton({ count = 5 }: WargaSkeletonProps) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <tr key={index} className="animate-pulse border-b border-slate-100 dark:border-slate-800">
          <td className="px-8 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
              </div>
            </div>
          </td>
          <td className="px-8 py-5">
            <div className="space-y-2">
              <div className="h-5 w-28 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          </td>
          <td className="px-8 py-5">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          </td>
          <td className="px-8 py-5">
            <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          </td>
          <td className="px-8 py-5 text-right">
            <div className="flex justify-end gap-2">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
