'use client';

import { useState, useEffect } from 'react';
import { SuperAdminService } from '@/services/super-admin-service';
import { PaymentSettings } from '@/types/super-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Loader2, Save, AlertTriangle, CheckCircle2, Lock, ShieldCheck, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);

  // Simulation state for Calculator Preview
  const [previewAmount, setPreviewAmount] = useState(100000);

  useEffect(() => {
    fetchSettings();
  }, []);

  const withDefaults = (data: PaymentSettings): PaymentSettings => {
    return {
      ...data,
      gateways: {
        subscription: data.gateways?.subscription || 'MANUAL',
        iuran_warga: data.gateways?.iuran_warga || 'MANUAL',
        umkm: data.gateways?.umkm || 'MANUAL',
      },
    };
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await SuperAdminService.getPaymentSettings();
      setSettings(withDefaults(data));
    } catch (error) {
      console.error('Failed to fetch payment settings:', error);
      toast.error('Gagal memuat pengaturan pembayaran');
      // Fallback for UI development if API fails (since backend might not be ready)
      setSettings(withDefaults({
        subscription_mode: 'CENTRALIZED',
        iuran_warga_mode: 'SPLIT',
        umkm_mode: 'SPLIT',
        umkm_scope: 'GLOBAL',
        iuran_warga_config: {
          platform_fee_percent: 5,
        },
        umkm_config: {
          umkm_share_percent: 90,
          platform_fee_percent: 5,
          rt_share_percent: 5,
          is_rt_share_enabled: true,
        },
        gateways: {
          subscription: 'MANUAL',
          iuran_warga: 'MANUAL',
          umkm: 'MANUAL',
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await SuperAdminService.updatePaymentSettings(settings);
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      console.error('Failed to update payment settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section: keyof PaymentSettings, key: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => {
      if (!prev) return null;
      
      if (section === 'iuran_warga_config' || section === 'umkm_config' || section === 'gateways') {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: value
          }
        };
      }
      
      return {
        ...prev,
        [section]: value // For top-level keys like modes
      };
    });
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Payment & Revenue Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Konfigurasi metode pembayaran, pembagian hasil (split), dan provider gateway.
        </p>
      </div>

      {/* GLOBAL PAYMENT MODE */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Global Payment Mode
          </CardTitle>
          <CardDescription>
            Tentukan bagaimana pembayaran diproses untuk setiap fitur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Subscription */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <Label className="text-slate-500 text-xs uppercase tracking-wider font-bold">Subscription (Langganan)</Label>
              <div className="mt-2 font-bold text-slate-800 dark:text-slate-200 text-lg">CENTRALIZED</div>
              <p className="text-xs text-slate-500 mt-1">Dana masuk ke rekening Platform (Super Admin)</p>
            </div>

            {/* Iuran Warga */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Label className="text-slate-500 text-xs uppercase tracking-wider font-bold">Iuran Warga</Label>
              <select 
                className="mt-2 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={settings.iuran_warga_mode}
                onChange={(e) => updateSetting('iuran_warga_mode', '', e.target.value)}
              >
                <option value="SPLIT">SPLIT (Otomatis Bagi Hasil)</option>
                <option value="CENTRALIZED">CENTRALIZED (Platform)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {settings.iuran_warga_mode === 'SPLIT' 
                  ? 'Dana dibagi otomatis antara RT dan Platform' 
                  : 'Dana ditampung Platform lalu dicairkan manual'}
              </p>
            </div>

            {/* UMKM */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Label className="text-slate-500 text-xs uppercase tracking-wider font-bold">UMKM (Jual Beli)</Label>
              <select 
                className="mt-2 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={settings.umkm_mode}
                onChange={(e) => updateSetting('umkm_mode', '', e.target.value)}
              >
                <option value="SPLIT">SPLIT (Otomatis Bagi Hasil)</option>
                <option value="CENTRALIZED">CENTRALIZED (Platform)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {settings.umkm_mode === 'SPLIT' 
                  ? 'Dana dibagi ke Penjual, RT, dan Platform' 
                  : 'Dana ditampung Platform sepenuhnya'}
              </p>

              <div className="mt-4">
                <Label className="text-slate-500 text-xs uppercase tracking-wider font-bold">Scope UMKM Marketplace</Label>
                <select 
                  className="mt-2 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={settings.umkm_scope}
                  onChange={(e) => updateSetting('umkm_scope', '', e.target.value)}
                >
                  <option value="GLOBAL">GLOBAL (Lintas RW)</option>
                  <option value="RW">Hanya RW Saya</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {settings.umkm_scope === 'GLOBAL' 
                    ? 'Warga dapat melihat UMKM dari semua RW selama toko sudah terverifikasi.' 
                    : 'Warga hanya melihat UMKM dari RW mereka sendiri.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DEFAULT PAYMENT GATEWAYS */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Default Payment Gateway</CardTitle>
          <CardDescription>
            Pilih gateway utama yang akan digunakan untuk setiap jenis transaksi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-slate-500 text-xs uppercase tracking-wider font-bold">Langganan (Subscription)</Label>
              <select
                className="mt-2 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={settings.gateways.subscription}
                onChange={(e) => updateSetting('gateways', 'subscription', e.target.value)}
              >
                <option value="MANUAL">Manual Transfer (Bank)</option>
                <option value="DANA">DANA VA / e-wallet</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-500 text-xs uppercase tracking-wider font-bold">Iuran Warga</Label>
              <select
                className="mt-2 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={settings.gateways.iuran_warga}
                onChange={(e) => updateSetting('gateways', 'iuran_warga', e.target.value)}
              >
                <option value="MANUAL">Manual Transfer / Rekening RT</option>
                <option value="DANA">DANA (Otomatis)</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-500 text-xs uppercase tracking-wider font-bold">UMKM Marketplace</Label>
              <select
                className="mt-2 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={settings.gateways.umkm}
                onChange={(e) => updateSetting('gateways', 'umkm', e.target.value)}
              >
                <option value="MANUAL">Manual / Settlement Internal</option>
                <option value="DANA">DANA (Otomatis)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SPLIT CONFIGURATION TABS */}
      <Tabs defaultValue="iuran" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="iuran">Iuran Warga Split</TabsTrigger>
          <TabsTrigger value="umkm">UMKM Split</TabsTrigger>
        </TabsList>
        
        {/* IURAN CONFIG */}
        <TabsContent value="iuran">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Konfigurasi Bagi Hasil Iuran</CardTitle>
              <CardDescription>Atur persentase biaya platform untuk transaksi pembayaran iuran warga.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-4">
                  <div>
                    <Label>Platform Fee (%)</Label>
                    <div className="relative mt-1">
                      <Input 
                        type="number" 
                        value={settings.iuran_warga_config.platform_fee_percent}
                        onChange={(e) => updateSetting('iuran_warga_config', 'platform_fee_percent', parseFloat(e.target.value))}
                        className="pr-8"
                        min={0}
                        max={100}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Persentase yang diambil platform dari setiap transaksi.</p>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Calculator size={18} />
                    <span>Live Preview</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Contoh Transaksi</span>
                      <span className="font-mono font-bold">{formatCurrency(previewAmount)}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Platform Fee ({settings.iuran_warga_config.platform_fee_percent}%)</span>
                        <span className="font-mono text-emerald-600 font-bold">
                          {formatCurrency(previewAmount * (settings.iuran_warga_config.platform_fee_percent / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Diterima RT/RW (Net)</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                          {formatCurrency(previewAmount * ((100 - settings.iuran_warga_config.platform_fee_percent) / 100))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UMKM CONFIG */}
        <TabsContent value="umkm">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Konfigurasi Bagi Hasil UMKM</CardTitle>
              <CardDescription>Atur pembagian pendapatan dari penjualan produk warga.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-4">
                  <div>
                    <Label>Platform Fee (%)</Label>
                    <div className="relative mt-1">
                      <Input 
                        type="number" 
                        value={settings.umkm_config.platform_fee_percent}
                        onChange={(e) => updateSetting('umkm_config', 'platform_fee_percent', parseFloat(e.target.value))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <Label>Share Penjual (%)</Label>
                    <div className="relative mt-1">
                      <Input 
                        type="number" 
                        value={settings.umkm_config.umkm_share_percent}
                        onChange={(e) => updateSetting('umkm_config', 'umkm_share_percent', parseFloat(e.target.value))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="space-y-0.5">
                      <Label className="text-base">RT Share</Label>
                      <p className="text-xs text-slate-500">Berikan komisi ke kas RT dari setiap penjualan</p>
                    </div>
                    {/* Note: Standard Switch doesn't take boolean value directly usually in shadcn, check props */}
                    {/* Assuming standard shadcn Switch: checked={boolean} onCheckedChange={fn} */}
                    <div className="flex items-center gap-2">
                       <input 
                          type="checkbox"
                          checked={settings.umkm_config.is_rt_share_enabled}
                          onChange={(e) => updateSetting('umkm_config', 'is_rt_share_enabled', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                       />
                       <span className="text-sm font-medium">{settings.umkm_config.is_rt_share_enabled ? 'On' : 'Off'}</span>
                    </div>
                  </div>

                  {settings.umkm_config.is_rt_share_enabled && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <Label>RT Share (%)</Label>
                      <div className="relative mt-1">
                        <Input 
                          type="number" 
                          value={settings.umkm_config.rt_share_percent}
                          onChange={(e) => updateSetting('umkm_config', 'rt_share_percent', parseFloat(e.target.value))}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  )}

                  {/* Validation Message */}
                  {(() => {
                    const total = settings.umkm_config.platform_fee_percent + 
                                  settings.umkm_config.umkm_share_percent + 
                                  (settings.umkm_config.is_rt_share_enabled ? settings.umkm_config.rt_share_percent : 0);
                    if (total !== 100) {
                      return (
                        <div className="flex items-center gap-2 text-rose-500 text-sm font-medium bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
                          <AlertTriangle size={16} />
                          Total persentase harus 100% (Saat ini: {total}%)
                        </div>
                      );
                    }
                    return (
                       <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                          <CheckCircle2 size={16} />
                          Konfigurasi valid (Total 100%)
                       </div>
                    );
                  })()}
                </div>

                {/* Preview Section */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Calculator size={18} />
                    <span>Live Preview</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Harga Produk</span>
                      <span className="font-mono font-bold">{formatCurrency(previewAmount)}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Platform Fee ({settings.umkm_config.platform_fee_percent}%)</span>
                        <span className="font-mono text-emerald-600 font-bold">
                          {formatCurrency(previewAmount * (settings.umkm_config.platform_fee_percent / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Diterima Penjual ({settings.umkm_config.umkm_share_percent}%)</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                          {formatCurrency(previewAmount * (settings.umkm_config.umkm_share_percent / 100))}
                        </span>
                      </div>
                      {settings.umkm_config.is_rt_share_enabled && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Kas RT ({settings.umkm_config.rt_share_percent}%)</span>
                          <span className="font-mono text-blue-600 font-bold">
                            {formatCurrency(previewAmount * (settings.umkm_config.rt_share_percent / 100))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PAYMENT PROVIDER SETTINGS (READ ONLY) */}
      <Card className="border-slate-200 dark:border-slate-800 opacity-90">
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>
            Centralized: Manual Transfer & DANA. Split: Xendit sebagai gateway, DANA via Xendit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3">Centralized Mode</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">MANUAL TRANSFER</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-bold">DANA</span>
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3">Split Mode</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold">XENDIT (Gateway)</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-bold">DANA (via Xendit)</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-sm font-bold line-through">MIDTRANS (Coming Soon)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SAFETY RULES */}
      <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Safety Rules Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Perubahan Split Mode hanya berlaku untuk transaksi baru.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Platform Fee minimal 1% untuk menutup biaya gateway.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Akun Xendit harus terverifikasi untuk fitur Split Payment.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* SAVE BUTTON */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 rounded-full px-6 py-6 h-auto"
        >
          {saving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              <Save className="w-6 h-6" />
              <span className="font-bold text-lg">Simpan Perubahan</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
