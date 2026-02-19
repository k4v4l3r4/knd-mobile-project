"use client";

import { useState, useEffect } from "react";
import { Save, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from "js-cookie";

interface FineSetting {
  id?: number;
  fine_type: "TIDAK_HADIR" | "TELAT" | "PULANG_CEPAT";
  amount: number;
  tolerance_minutes: number;
  is_active: boolean;
}

const defaultSettings: FineSetting[] = [
  { fine_type: "TIDAK_HADIR", amount: 50000, tolerance_minutes: 0, is_active: true },
  { fine_type: "TELAT", amount: 10000, tolerance_minutes: 15, is_active: false },
  { fine_type: "PULANG_CEPAT", amount: 20000, tolerance_minutes: 30, is_active: false },
];

export default function PengaturanDendaPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [settings, setSettings] = useState<FineSetting[]>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!status) return;
    fetchSettings();
  }, [status]);

  const fetchSettings = async () => {
    try {
      const adminToken = Cookies.get("admin_token");
      if (isDemo || !adminToken) {
        setSettings(defaultSettings);
        setLoading(false);
        return;
      }
      const response = await api.get("/ronda-fine-settings");
      if (response.data.data && response.data.data.length > 0) {
        const fetched = response.data.data as FineSetting[];
        const merged = defaultSettings.map((def) => {
          const existing = fetched.find((f) => f.fine_type === def.fine_type);
          return existing
            ? { ...existing, is_active: Boolean(existing.is_active) }
            : def;
        });
        setSettings(merged);
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      setSettings(defaultSettings);
      if (!isDemo) {
        console.error("Failed to fetch settings:", error);
        toast.error("Gagal memuat pengaturan denda");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menyimpan pengaturan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    setSaving(true);
    try {
      await api.post("/ronda-fine-settings", { settings });
      toast.success("Pengaturan denda berhasil disimpan");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (
    index: number,
    field: keyof FineSetting,
    value: any
  ) => {
    const newSettings = [...settings];
    newSettings[index] = { ...newSettings[index], [field]: value };
    setSettings(newSettings);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Pengaturan Denda Ronda
            </h1>
            <DemoLabel />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
        <div className="text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-semibold">Catatan Penting:</p>
          <ul className="list-disc ml-4 mt-1 space-y-1">
            <li>Denda hanya akan digenerate saat jadwal ronda <strong>DITUTUP (Close Schedule)</strong>.</li>
            <li>Perubahan nominal denda tidak berlaku surut (hanya untuk jadwal masa depan).</li>
            <li>Pastikan nominal denda telah disepakati dalam rapat warga RT.</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6">
        {settings.map((setting, index) => (
          <div
            key={setting.fine_type}
            className={`p-6 rounded-2xl border transition-all ${
              setting.is_active
                ? "bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800 shadow-sm"
                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={setting.is_active}
                  onChange={(e) =>
                    updateSetting(index, "is_active", e.target.checked)
                  }
                  className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                    {formatLabel(setting.fine_type)}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDescription(setting.fine_type)}
                  </p>
                </div>
              </div>
            </div>

            {setting.is_active && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Denda (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={setting.amount}
                      onChange={(e) =>
                        updateSetting(index, "amount", parseInt(e.target.value) || 0)
                      }
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {setting.fine_type !== "TIDAK_HADIR" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Toleransi Waktu (Menit)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={setting.tolerance_minutes}
                        onChange={(e) =>
                          updateSetting(
                            index,
                            "tolerance_minutes",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full pl-4 pr-12 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-sm">
                        Menit
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {setting.fine_type === "TELAT"
                        ? "Denda berlaku jika telat lebih dari ini."
                        : "Denda berlaku jika pulang lebih awal dari ini."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatLabel(type: string) {
  switch (type) {
    case "TIDAK_HADIR":
      return "Denda Tidak Hadir (Alpha)";
    case "TELAT":
      return "Denda Keterlambatan";
    case "PULANG_CEPAT":
      return "Denda Pulang Cepat";
    default:
      return type;
  }
}

function formatDescription(type: string) {
  switch (type) {
    case "TIDAK_HADIR":
      return "Dikenakan kepada warga yang tidak hadir tanpa keterangan (Alpha).";
    case "TELAT":
      return "Dikenakan kepada warga yang hadir melewati jam mulai ronda + toleransi.";
    case "PULANG_CEPAT":
      return "Dikenakan kepada warga yang melakukan Scan Out sebelum jam selesai ronda.";
    default:
      return "";
  }
}
