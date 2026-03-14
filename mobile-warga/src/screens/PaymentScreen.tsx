import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Image,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Clipboard from 'expo-clipboard';
import { paymentService } from '../services/payment';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { StatusBar } from 'expo-status-bar';
import { formatPhoneNumber } from '../utils/phoneUtils';
import api from '../services/api';
import { WebView } from 'react-native-webview';

type PaymentMethod = 'BANK' | 'QRIS' | 'CASH' | 'DANA';

export default function PaymentScreen({ 
  initialData, 
  onSuccess, 
  onBack,
  navigation,
  route
}: { 
  initialData?: any, 
  onSuccess?: () => void, 
  onBack?: () => void,
  navigation?: any,
  route?: any
}) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isDemo, isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  const [activeTab, setActiveTab] = useState<PaymentMethod>('QRIS');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    bank_name?: string;
    bank_code?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    qris_image_url?: string | null;
    cash_contact_name?: string | null;
    cash_contact_phone?: string | null;
    cash_contact_address?: string | null;
    dana_number?: string | null;
    dana_name?: string | null;
  } | null>(null);
  
  // Extract feeIds from initialData if present
  const feeIds: number[] = initialData?.feeIds || initialData?.fee_ids || [];
  const hasFeeIds = feeIds && feeIds.length > 0;
  const [lastInstruction, setLastInstruction] = useState<any | null>(null);

  // DANA WebView states
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

  useEffect(() => {
    if (initialData) {
      if (initialData.amount) {
        setAmount(formatRupiah(String(initialData.amount)));
      }
      if (initialData.description) {
        setDescription(initialData.description);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await paymentService.getConfig();
        setPaymentConfig(data);
      } catch (e) {
        // fallback to hardcoded defaults if needed
      }
    };
    loadConfig();
  }, []);

  // --- DANA WebView Actions ---

  const handleCreateDanaPayment = async () => {
    if (!paymentData?.orderId || !paymentData?.amount) {
      Alert.alert('Error', 'Order ID dan amount wajib diisi');
      return;
    }

    setProcessing(true);
    setLoading(true);

    try {
      console.log('[DANA] Creating payment:', {
        order_id: paymentData.orderId,
        amount: paymentData.amount,
        description: paymentData.description,
      });

      const response = await api.post('/payments/dana/checkout', {
        order_id: paymentData.orderId,
        amount: paymentData.amount,
        description: paymentData.description || 'Pembayaran Ronda Online',
      });

      console.log('[DANA] Response:', response.data);

      if (response.data.success && response.data.data.checkout_url) {
        setCheckoutUrl(response.data.data.checkout_url);
        setPaymentModalVisible(true);
        
        Alert.alert(
          'Sukses',
          'Silakan selesaikan pembayaran di halaman DANA',
          [{ text: 'OK' }]
        );
      } else {
        const errorMsg = response.data.message || 'Gagal membuat pembayaran';
        console.error('[DANA] Failed:', errorMsg);
        Alert.alert('Gagal', errorMsg);
      }
    } catch (error: any) {
      console.error('[DANA] Payment error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Diagnostic alert based on error type
      let diagnosticMessage = '';
      const statusCode = error.response?.status;
      
      if (statusCode === 401) {
        diagnosticMessage = 'Error 401: Unauthorized - Sesi Anda tidak valid. Silakan login ulang.';
      } else if (statusCode === 500) {
        diagnosticMessage = 'Error 500: Server Error - Masalah di server DANA/Laravel.';
      } else if (statusCode === 400) {
        diagnosticMessage = 'Error 400: Bad Request - Data pembayaran tidak valid.';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        diagnosticMessage = 'Timeout: Koneksi ke server DANA terlalu lama. Periksa koneksi internet Anda.';
      } else if (!error.response) {
        diagnosticMessage = 'Network Error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else {
        diagnosticMessage = `Error ${statusCode}: ${error.response?.data?.message || error.message}`;
      }
      
      Alert.alert(
        'Gagal Koneksi DANA',
        diagnosticMessage,
        [{ text: 'OK' }]
      );
    } finally {
      // ALWAYS stop loading regardless of success/failure
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
              if (navigation) {
                navigation.goBack();
              } else if (onBack) {
                onBack();
              }
            }
          }
        ]
      );
    }
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[DANA] WebView error:', nativeEvent);
    
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

  // --- Manual Payment Actions ---

  const handleCopyRekening = async () => {
    if (paymentConfig?.bank_account_number) {
      await Clipboard.setStringAsync(paymentConfig.bank_account_number);
      Alert.alert("Tersalin", "Nomor rekening berhasil disalin ke clipboard.");
    }
  };

  const handleGatewayInfo = () => {
    if (!lastInstruction) {
      Alert.alert(
        'Mode Pembayaran',
        'Pembayaran iuran dapat diproses secara manual oleh RT atau melalui gateway sesuai pengaturan RT.'
      );
      return;
    }

    const paymentMode: string = lastInstruction.payment_mode || 'CENTRALIZED';
    const splitConfig: any = lastInstruction.meta?.split_config || null;

    let message = '';

    if (paymentMode === 'SPLIT') {
      const platformPercent = splitConfig?.platform_fee_percent ?? 0;
      let rtPercent = splitConfig?.rt_share_percent ?? 0;
      let wargaPercent = 100 - platformPercent - rtPercent;

      if (splitConfig?.is_rt_share_enabled === false) {
        rtPercent = 0;
        wargaPercent = 100 - platformPercent;
      }

      message =
        'Mode SPLIT: Gateway membantu membagi hasil secara otomatis.\n\n' +
        `Platform: ${platformPercent}%\n` +
        (rtPercent > 0 ? `Kas RT: ${rtPercent}%\n` : '') +
        `Net ke RT/Warga: ${wargaPercent}%`;
    } else {
      message =
        'Mode CENTRALIZED: Dana ditampung oleh Platform atau rekening utama RT, kemudian pembagian hasil dilakukan manual di luar gateway.';
    }

    Alert.alert('Mode Pembayaran', message);
  };

  const handleContactBendahara = () => {
    const phoneNumber = paymentConfig?.cash_contact_phone;
    if (!phoneNumber) {
        Alert.alert('Info', 'Nomor WhatsApp bendahara belum dikonfigurasi.');
        return;
    }
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const contactName = paymentConfig?.cash_contact_name || 'Bendahara';
    const message = `Halo ${contactName}, saya ingin menyerahkan uang tunai untuk iuran warga.`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url)
      .catch(() => Alert.alert('Error', 'Tidak dapat membuka WhatsApp'));
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.3,
        aspect: [4, 3],
      };

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Izin Ditolak", "Izin kamera diperlukan.");
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Izin Ditolak", "Izin galeri diperlukan.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const originalUri = result.assets[0].uri;
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                originalUri,
                [{ resize: { width: 800 } }],
                { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
            );
            setPhoto(manipResult.uri);
        } catch (manipError) {
            console.log('Compression error:', manipError);
            setPhoto(originalUri);
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
    }
  };

  const formatRupiah = (number: string) => {
    const clean = number.replace(/[^0-9]/g, '');
    if (!clean) return '';
    return 'Rp ' + clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmountChange = (text: string) => {
    setAmount(formatRupiah(text));
  };

  const handleSubmitManual = async () => {
    if (isExpired) {
      Alert.alert('Akses Terbatas', 'Masa trial RT Anda telah habis. Silakan hubungi admin RT untuk memperbarui langganan.');
      return;
    }
    if (isDemo) {
      Alert.alert('Mode Demo', 'Pembayaran tidak dapat dilakukan dalam mode demo.');
      return;
    }

    if (!hasFeeIds && !amount) {
      Alert.alert('Error', 'Mohon isi nominal pembayaran');
      return;
    }
    if (!photo) {
      Alert.alert('Error', 'Mohon upload bukti pembayaran/serah terima');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await paymentService.submitPayment({
        amount,
        payment_method: activeTab,
        description: description || 'Iuran Warga',
        photoUri: photo,
        feeIds,
      });

      if (response.success) {
        const instruction = response.instruction;
        let successMessage = 'Pembayaran berhasil dikirim! Menunggu verifikasi admin.';
        let danaUrl: string | null = null;

        if (instruction) {
          const channelLabel = instruction.channel || 'MANUAL';
          const amountValue = instruction.amount_total ?? '';
          const formattedAmount = amountValue !== '' ? formatRupiah(String(amountValue)) : '';
          const paymentMode: string = instruction.payment_mode || 'CENTRALIZED';
          const splitConfig: any = instruction.meta?.split_config || null;
          const paymentUrl: string | undefined = instruction.meta?.payment_url;

          successMessage += '\n\n';
          successMessage += `Mode Pembayaran: ${paymentMode === 'SPLIT' ? 'SPLIT (Gateway)' : 'CENTRALIZED (Platform)'}`;
          successMessage += `\nChannel Gateway: ${channelLabel}`;
          if (formattedAmount) {
            successMessage += `\nTotal Diproses Gateway: ${formattedAmount}`;
          }

          if (paymentMode === 'SPLIT' && splitConfig) {
            const platformPercent = splitConfig.platform_fee_percent ?? 0;
            let rtPercent = splitConfig.rt_share_percent ?? 0;
            let wargaPercent = 100 - platformPercent - rtPercent;

            if (splitConfig.is_rt_share_enabled === false) {
              rtPercent = 0;
              wargaPercent = 100 - platformPercent;
            }

            successMessage += '\n\nRincian Bagi Hasil (Estimasi):';
            successMessage += `\n• Platform: ${platformPercent}%`;
            if (rtPercent > 0) {
              successMessage += `\n• Kas RT: ${rtPercent}%`;
            }
            successMessage += `\n• Net ke RT/Warga: ${wargaPercent}%`;
          }

          if (instruction.channel === 'DANA' && paymentUrl) {
            danaUrl = paymentUrl;
            successMessage += '\n\nSilakan lanjutkan pembayaran di aplikasi DANA.';
          }

          setLastInstruction(instruction);
        }

        if (danaUrl) {
          Alert.alert(
            'Sukses',
            successMessage,
            [
              {
                text: 'Buka DANA',
                onPress: async () => {
                  try {
                    const supported = await Linking.canOpenURL(danaUrl as string);
                    if (supported) {
                      await Linking.openURL(danaUrl as string);
                    } else {
                      Alert.alert('Error', 'Tidak dapat membuka aplikasi DANA pada perangkat ini.');
                    }
                  } catch {
                    Alert.alert('Error', 'Gagal membuka link pembayaran DANA.');
                  }
                },
              },
              { text: 'Tutup' },
            ]
          );
        } else {
          Alert.alert(
            'Sukses', 
            successMessage,
            [{ text: 'OK' }]
          );
        }
        
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Gagal', response.message || 'Gagal mengirim pembayaran');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const message = error.message || 'Terjadi kesalahan koneksi';
      Alert.alert('Gagal', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Components ---

  const renderTabButton = (type: PaymentMethod, label: string, icon: any) => (
    <TouchableOpacity 
      style={[styles.tabButton, activeTab === type && styles.activeTabButton]}
      onPress={() => setActiveTab(type)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialCommunityIcons 
          name={icon} 
          size={24} 
          color={activeTab === type ? '#fff' : colors.textSecondary} 
        />
        <Text style={[styles.tabText, activeTab === type && styles.activeTabText]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderInfoContent = () => {
    switch (activeTab) {
      case 'BANK':
        const bankName = paymentConfig?.bank_name || '-';
        const bankCode = paymentConfig?.bank_code || 'BANK';
        const accountNumber = paymentConfig?.bank_account_number || '-';
        const accountName = paymentConfig?.bank_account_name || '-';
        
        if (!paymentConfig?.bank_account_number) {
            return (
                <View style={styles.infoCard}>
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
                        <Text style={{ marginTop: 12, color: colors.textSecondary, textAlign: 'center' }}>
                            Informasi transfer bank belum dikonfigurasi oleh admin.
                        </Text>
                    </View>
                </View>
            );
        }

        return (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={styles.bankIcon}>
                <Text style={styles.bankIconText}>{bankCode}</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>{bankName}</Text>
                <Text style={styles.infoValue}>{accountNumber}</Text>
                <Text style={styles.infoSub}>{accountName}</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={handleCopyRekening} 
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Salin Nomor Rekening</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      case 'QRIS':
        if (!paymentConfig?.qris_image_url || !paymentConfig.qris_image_url.startsWith('http')) {
             return (
                <View style={styles.infoCard}>
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
                        <Text style={{ marginTop: 12, color: colors.textSecondary, textAlign: 'center' }}>
                            QRIS belum dikonfigurasi dengan benar oleh admin.
                        </Text>
                    </View>
                </View>
            );
        }
        return (
          <View style={styles.infoCard}>
            <View style={styles.qrisContainer}>
              <Image
                source={{ uri: paymentConfig.qris_image_url }}
                style={styles.qrisImage}
                resizeMode="contain"
              />
              <Text style={styles.qrisInstruction}>
                Scan QRIS di atas menggunakan Gopay, OVO, Dana, atau Mobile Banking
              </Text>
            </View>
          </View>
        );
      case 'DANA':
        return (
          <View style={[styles.infoCard, styles.danaAutoCard]}>
            <View style={styles.danaAutoHeader}>
              <View style={styles.danaLogoLarge}>
                <Text style={styles.danaLogoText}>DANA</Text>
              </View>
              <Text style={styles.danaAutoTitle}>Pembayaran via WebView</Text>
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

            <TouchableOpacity
              onPress={handleCreateDanaPayment}
              disabled={processing || loading}
              style={[
                styles.danaPayButton,
                (processing || loading) && styles.danaPayButtonDisabled
              ]}
              activeOpacity={0.8}
            >
              {processing || loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="wallet" size={24} color="#fff" />
                  <Text style={styles.danaPayButtonText}>Bayar Sekarang via DANA</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.helperCard}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={styles.helperTextDana}>
                • Klik tombol "Bayar Sekarang" untuk membuka halaman pembayaran DANA
              </Text>
              <Text style={styles.helperTextDana}>
                • Login dengan akun DANA Anda di halaman pembayaran
              </Text>
              <Text style={styles.helperTextDana}>
                • Pilih metode pembayaran yang tersedia (Saldo DANA / Bank Transfer)
              </Text>
              <Text style={styles.helperTextDana}>
                • Pembayaran akan diverifikasi otomatis setelah berhasil
              </Text>
            </View>
          </View>
        );
      case 'CASH':
        return (
          <View style={styles.infoCard}>
            <View style={styles.cashContainer}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={32} color="#f59e0b" />
              </View>
              <Text style={styles.cashTitle}>Bayar Tunai ke Bendahara</Text>
              <Text style={styles.cashDesc}>
                Silakan serahkan uang tunai ke {paymentConfig?.cash_contact_name || 'Bendahara'}{paymentConfig?.cash_contact_address ? ` di ${paymentConfig.cash_contact_address}` : ''}. 
                Pastikan meminta foto dokumentasi serah terima.
              </Text>
              <TouchableOpacity
                onPress={handleContactBendahara}
                style={{ borderRadius: 24, width: '100%', backgroundColor: '#22c55e', padding: 12, alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  <Text style={styles.whatsappText}>Hubungi Bendahara</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Premium Header */}
      <View
        style={[
          styles.headerBackground,
          { backgroundColor: isDarkMode ? '#059669' : '#047857' }
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40, justifyContent: 'center' }}>
              {onBack && (
                <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={24} color="#ecfdf5" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Metode Pembayaran</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={handleGatewayInfo} activeOpacity={0.7}>
                <Ionicons name="information-circle-outline" size={22} color="#ecfdf5" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {renderTabButton('BANK', 'Transfer', 'bank-transfer')}
          {renderTabButton('QRIS', 'QRIS', 'qrcode-scan')}
          {renderTabButton('DANA', 'DANA', 'wallet')}
          {renderTabButton('CASH', 'Tunai', 'cash-multiple')}
        </ScrollView>

        {/* Dynamic Content */}
        {renderInfoContent()}

        {/* Common Form for Manual Payments */}
        {activeTab !== 'DANA' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Detail Pembayaran</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nominal (Rp)</Text>
              <TextInput
                style={[styles.input, hasFeeIds && { color: colors.textSecondary }]}
                value={amount}
                onChangeText={handleAmountChange}
                editable={!hasFeeIds}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
              {hasFeeIds && (
                <Text style={styles.helperText}>
                  Nominal di atas dihitung otomatis dari tagihan yang Anda pilih.
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Keterangan</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Contoh: Iuran Januari 2024"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {activeTab === 'CASH' ? 'Foto Serah Terima' : 'Bukti Transfer'}
              </Text>
              
              {photo ? (
                <View style={styles.previewWrapper}>
                  <Image source={{ uri: photo }} style={styles.previewImage} />
                  <TouchableOpacity 
                    onPress={() => setPhoto(null)} 
                    style={styles.removeButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadButtons}>
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={() => pickImage(true)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="camera" size={24} color={colors.primary} />
                      <Text style={styles.uploadText}>Kamera</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={() => pickImage(false)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="image" size={24} color={colors.primary} />
                      <Text style={styles.uploadText}>Galeri</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmitManual}
              disabled={isSubmitting}
              style={[
                styles.submitButton, 
                { opacity: isSubmitting ? 0.7 : 1 }
              ]}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Kirim Konfirmasi</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {__DEV__ && lastInstruction && (
          <View style={styles.debugBanner}>
            <Text style={styles.debugTitle}>Debug Instruction</Text>
            <Text style={styles.debugText}>
              Channel: {String(lastInstruction.channel || 'MANUAL')}
            </Text>
            <Text style={styles.debugText}>
              Amount: {lastInstruction.amount_total != null ? formatRupiah(String(lastInstruction.amount_total)) : '-'}
            </Text>
            <Text style={styles.debugText} numberOfLines={3}>
              Meta: {JSON.stringify(lastInstruction.meta || {})}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* DANA WebView Payment Modal */}
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
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    marginTop: 10,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    flexGrow: 0,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  // Info Card
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danaAutoCard: {
    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  danaAutoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  danaLogoLarge: {
    backgroundColor: '#008CFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  danaLogoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  danaAutoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#ffffff' : '#064e3b',
  },
  featuresList: {
    gap: 12,
    marginBottom: 20,
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
  danaPayButton: {
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
  danaPayButtonDisabled: {
    opacity: 0.6,
  },
  danaPayButtonText: {
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
  helperTextDana: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bankIcon: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  bankIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 4,
  },
  infoSub: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: colors.primary + '10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // QRIS
  qrisContainer: {
    alignItems: 'center',
    padding: 8,
  },
  qrisImage: {
    width: '100%',
    height: 400,
    marginBottom: 20,
    borderRadius: 16,
  },
  qrisInstruction: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  // Cash
  cashContainer: {
    alignItems: 'center',
    padding: 8,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    backgroundColor: colors.warning + '20',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cashTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  cashDesc: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 22,
  },
  whatsappText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  // Form
  formSection: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  helperText: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textSecondary,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 10,
  },
  uploadText: {
    color: colors.primary,
    fontWeight: '600',
  },
  previewWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.background,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.danger,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 12,
  },
  disabledButton: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  debugBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: colors.textSecondary,
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
