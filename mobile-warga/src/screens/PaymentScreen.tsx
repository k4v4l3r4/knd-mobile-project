import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import * as Linking from 'expo-linking';

interface PaymentScreenProps {
  initialData?: {
    orderId?: string;
    amount?: number;
    description?: string;
  } | null;
  onSuccess?: () => void;
  onBack?: () => void;
  // Legacy React Navigation props (kept for backwards compatibility)
  navigation?: any;
  route?: {
    params?: {
      orderId?: string;
      amount?: number;
      description?: string;
    };
  };
}

export default function PaymentScreen({ initialData, onSuccess, onBack, navigation, route }: PaymentScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<{
    orderId?: string;
    amount?: number;
    description?: string;
  } | null>(null);

  useEffect(() => {
    // Prefer initialData prop, then route params, then fallback
    const data = initialData || route?.params || {};
    if (data.orderId && data.amount) {
      setPaymentData(data);
    } else {
      // Fallback - create sample order
      setPaymentData({
        orderId: `ORDER-${Date.now()}`,
        amount: 10000,
        description: 'Pembayaran Ronda Online',
      });
    }
  }, [initialData, route]);

  const handleCreatePayment = async () => {
    if (!paymentData?.orderId || !paymentData?.amount) {
      Alert.alert('Error', 'Order ID dan amount wajib diisi');
      return;
    }

    try {
      setProcessing(true);
      setLoading(true);

      const response = await api.post('/payments/dana/checkout', {
        order_id: paymentData.orderId,
        amount: paymentData.amount,
        description: paymentData.description || 'Pembayaran Ronda Online',
      });

      if (response.data.success && response.data.data.checkout_url) {
        setCheckoutUrl(response.data.data.checkout_url);
        setPaymentModalVisible(true);
        
        Alert.alert(
          'Sukses',
          'Silakan selesaikan pembayaran di halaman DANA',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Gagal', response.data.message || 'Gagal membuat pembayaran');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const message = error.response?.data?.message || 'Gagal memproses pembayaran';
      Alert.alert('Error', message);
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  const handleWebViewNavigation = (navState: any) => {
    const { url } = navState;
    
    // Check for callback URLs
    if (url.includes('success') || url.includes('callback') || url.includes('close')) {
      setPaymentModalVisible(false);
      
      // Show success alert
      Alert.alert(
        'Sukses',
        'Pembayaran sedang diproses. Silakan cek status pembayaran Anda.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to home or show payment status
              navigation.goBack();
            }
          }
        ]
      );
    }
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    
    // Don't show error for SSL issues in sandbox
    if (nativeEvent.code !== -102 && nativeEvent.description !== 'SSL Certificate Error') {
      Alert.alert('Error', 'Terjadi kesalahan saat memuat halaman pembayaran');
    }
  };

  const renderLoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Memuat pembayaran...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran DANA</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Order Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={32} color={colors.primary} />
            <View style={styles.cardTitleSection}>
              <Text style={styles.cardTitle}>Detail Pembayaran</Text>
              <Text style={styles.cardSubtitle}>Silakan selesaikan pembayaran Anda</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="barcode-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>{paymentData?.orderId}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoLabel}>Jumlah Pembayaran:</Text>
            <Text style={styles.infoAmount}>Rp {paymentData?.amount?.toLocaleString('id-ID')}</Text>
          </View>

          {paymentData?.description && (
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Keterangan:</Text>
              <Text style={styles.infoValue}>{paymentData.description}</Text>
            </View>
          )}
        </View>

        {/* Payment Method Card */}
        <View style={[styles.card, styles.paymentMethodCard]}>
          <View style={styles.paymentMethodHeader}>
            <View style={styles.danaLogo}>
              <Text style={styles.danaText}>DANA</Text>
            </View>
            <Text style={styles.paymentMethodTitle}>Pembayaran Digital Wallet</Text>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Transaksi aman & terenkripsi</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="flash" size={20} color="#f59e0b" />
              <Text style={styles.featureText}>Proses instan & otomatis</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="phone-portrait" size={20} color="#3b82f6" />
              <Text style={styles.featureText}>Login langsung di halaman DANA</Text>
            </View>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            processing && styles.payButtonDisabled,
            loading && styles.payButtonDisabled
          ]}
          onPress={handleCreatePayment}
          disabled={processing || loading}
        >
          {processing || loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="wallet" size={24} color="#fff" />
              <Text style={styles.payButtonText}>Bayar Sekarang via DANA</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Helper Text */}
        <View style={styles.helperCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.helperText}>
            • Klik tombol "Bayar Sekarang" untuk membuka halaman pembayaran DANA
          </Text>
          <Text style={styles.helperText}>
            • Login dengan akun DANA Anda di halaman pembayaran
          </Text>
          <Text style={styles.helperText}>
            • Pilih metode pembayaran yang tersedia (Saldo DANA / Bank Transfer)
          </Text>
          <Text style={styles.helperText}>
            • Pembayaran akan diverifikasi otomatis setelah berhasil
          </Text>
        </View>
      </View>

      {/* Payment WebView Modal */}
      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.danaLogoSmall}>
              <Text style={styles.danaTextSmall}>DANA</Text>
            </View>
            <Text style={styles.modalTitle}>Pembayaran DANA</Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Batal',
                  'Apakah Anda yakin ingin membatalkan pembayaran?',
                  [
                    { text: 'Tidak', style: 'cancel' },
                    {
                      text: 'Ya, Batal',
                      style: 'destructive',
                      onPress: () => setPaymentModalVisible(false),
                    },
                  ]
                );
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* WebView */}
          {checkoutUrl && (
            <View style={styles.webViewContainer}>
              {webViewLoading && renderLoadingOverlay()}
              
              <WebView
                source={{ uri: checkoutUrl }}
                style={styles.webView}
                startInLoadingState={true}
                onNavigationStateChange={handleWebViewNavigation}
                onError={handleWebViewError}
                onLoadStart={() => setWebViewLoading(true)}
                onLoadEnd={() => setWebViewLoading(false)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                thirdPartyCookiesEnabled={true}
                sharedCookiesEnabled={true}
                cacheEnabled={false}
                allowsBackForwardNavigationGestures={true}
                mediaPlaybackRequiresUserAction={true}
                automaticallyAdjustContentInsets={false}
                scalesPageToFit={true}
                contentMode={Platform.OS === 'ios' ? 'mobile' : undefined}
                useragent={Platform.OS === 'android' ? 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.162 Mobile Safari/537.36' : undefined}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleSection: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  infoAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  paymentMethodCard: {
    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  danaLogo: {
    backgroundColor: '#008CFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  danaText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#ffffff' : '#064e3b',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: isDarkMode ? '#d1fae5' : '#065f46',
    flex: 1,
  },
  payButton: {
    backgroundColor: '#008CFF',
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    shadowColor: '#008CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helperCard: {
    marginTop: 24,
    padding: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    gap: 8,
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#008CFF',
  },
  danaLogoSmall: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  danaTextSmall: {
    color: '#008CFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
