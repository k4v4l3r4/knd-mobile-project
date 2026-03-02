'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Bell, Check, Loader2, MailOpen, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number;
  data: {
    title?: string;
    body?: string;
    message?: string;
    action_url?: string;
    [key: string]: any;
  };
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = async (pageNum: number, refresh = false) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/notifications?page=${pageNum}`);
      const newData = res.data.data || res.data; // Handle pagination or plain array
      
      if (refresh) {
        setNotifications(newData);
      } else {
        setNotifications(prev => [...prev, ...newData]);
      }
      
      // Check if we have more pages (if pagination metadata exists)
      if (res.data.meta) {
        setHasMore(res.data.meta.current_page < res.data.meta.last_page);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Gagal memuat notifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, true);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      toast.success('Ditandai sudah dibaca');
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      toast.success('Semua notifikasi ditandai sudah dibaca');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Gagal menandai semua sudah dibaca');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            Notifikasi
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Lihat semua aktivitas dan pemberitahuan terbaru
          </p>
        </div>
        
        <button
          onClick={handleMarkAllRead}
          disabled={isMarkingAll || notifications.every(n => n.read_at)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isMarkingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Tandai Semua Dibaca
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {notifications.length === 0 && !isLoading ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">Tidak ada notifikasi</h3>
            <p className="text-slate-500 dark:text-slate-400">Anda belum memiliki notifikasi terbaru saat ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4 ${!notification.read_at ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.read_at ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {!notification.read_at ? <Bell className="w-5 h-5" /> : <MailOpen className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-semibold ${!notification.read_at ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      {notification.data.title || 'Notifikasi Baru'}
                    </h4>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                      {format(new Date(notification.created_at), 'dd MMM HH:mm', { locale: id })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {notification.data.body || notification.data.message || 'Tidak ada detail pesan'}
                  </p>
                </div>

                {!notification.read_at && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                    title="Tandai sudah dibaca"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {isLoading && (
          <div className="p-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
          </div>
        )}

        {!isLoading && hasMore && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={loadMore}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Muat Lebih Banyak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
