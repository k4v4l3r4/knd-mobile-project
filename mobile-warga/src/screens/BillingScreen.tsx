import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { useTenant } from '../context/TenantContext';

interface BillingScreenProps {
  onBack: () => void;
}

interface Subscription {
  id: number;
  plan_name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  remaining_days: number | null;
}

interface Invoice {
  id: number;
  invoice_number: string;
  status: string;
  amount: number;
  due_date: string;
  payment_channel: string | null;
}

interface BillingSummary {
  tenant_status: string;
  billing_mode: string;
  subscription: Subscription | null;
  pending_invoice: Invoice | null;
  can_subscribe: boolean;
  message: string | null;
}

export default function BillingScreen({ onBack }: BillingScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { refreshStatus } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<BillingSummary | null>(null);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const response = await api.get('/billing/current');
      if (response.data) {
        setSummary(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching billing:', error);
      Alert.alert('Error', 'Gagal memuat data billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handlePay = () => {
    // For now, redirect to web admin or show instruction
    // Since mobile payment for billing isn't fully implemented in mobile-warga yet
    // We can show an alert or open a browser
    Alert.alert(
      'Pembayaran Tagihan',
      'Untuk saat ini, silakan lakukan pembayaran melalui Web Admin atau hubungi Administrator.',
      [{ text: 'OK' }]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10b981'; // emerald-500
      case 'TRIAL': return '#3b82f6'; // blue-500
      case 'EXPIRED': return '#ef4444'; // red-500
      case 'DEMO': return '#f59e0b'; // amber-500
      default: return '#64748b'; // slate-500
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 16,
    },
    content: {
      padding: 16,
    },
    card: {
      backgroundColor: isDarkMode ? '#1e293b' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    value: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#fff',
    },
    button: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 12,
    },
    buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
    },
    invoiceAmount: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
      marginVertical: 8,
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Langganan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Status Akun</Text>
            <View style={[styles.badge, { backgroundColor: getStatusColor(summary?.tenant_status || '') }]}>
              <Text style={styles.badgeText}>{summary?.tenant_status || '-'}</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Mode Billing</Text>
            <Text style={styles.value}>{summary?.billing_mode === 'RW' ? 'Terpusat (RW)' : 'Mandiri (RT)'}</Text>
          </View>
        </View>

        {/* Subscription Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Langganan Aktif</Text>
            <MaterialCommunityIcons name="crown-outline" size={20} color={colors.primary} />
          </View>

          {summary?.subscription ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Paket</Text>
                <Text style={styles.value}>{summary.subscription.plan_name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tipe</Text>
                <Text style={styles.value}>{summary.subscription.type}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Mulai</Text>
                <Text style={styles.value}>{formatDate(summary.subscription.start_date)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Berakhir</Text>
                <Text style={styles.value}>
                  {summary.subscription.end_date ? formatDate(summary.subscription.end_date) : 'Selamanya'}
                </Text>
              </View>
              {summary.subscription.remaining_days !== null && (
                <View style={[styles.row, { marginTop: 8 }]}>
                  <Text style={[styles.label, { color: getStatusColor(summary.tenant_status) }]}>
                    Sisa Waktu
                  </Text>
                  <Text style={[styles.value, { color: getStatusColor(summary.tenant_status) }]}>
                    {summary.subscription.remaining_days} Hari
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', padding: 16 }}>
              <Text style={{ color: colors.textSecondary }}>Belum ada langganan aktif</Text>
            </View>
          )}
        </View>

        {/* Pending Invoice Card */}
        {summary?.pending_invoice && (
          <View style={[styles.card, { borderColor: '#f59e0b', borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Tagihan Belum Dibayar</Text>
              <Ionicons name="alert-circle" size={20} color="#f59e0b" />
            </View>
            
            <Text style={styles.label}>Nomor Invoice</Text>
            <Text style={styles.value}>{summary.pending_invoice.invoice_number}</Text>
            
            <Text style={styles.invoiceAmount}>
              Rp {Math.floor(Number(summary.pending_invoice.amount)).toLocaleString('id-ID')}
            </Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Jatuh Tempo</Text>
              <Text style={styles.value}>{formatDate(summary.pending_invoice.due_date)}</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={handlePay}>
              <Text style={styles.buttonText}>Bayar Sekarang</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Message if any */}
        {summary?.message && (
          <View style={[styles.card, { backgroundColor: '#f0f9ff', padding: 12 }]}>
             <Text style={{ color: '#0369a1', fontSize: 13, textAlign: 'center' }}>
               {summary.message}
             </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
