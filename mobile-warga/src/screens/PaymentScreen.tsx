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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { StatusBar } from 'expo-status-bar';

type PaymentMethod = 'BANK' | 'QRIS' | 'CASH';

export default function PaymentScreen({ initialData, onSuccess }: { initialData?: any, onSuccess?: () => void }) {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeTab, setActiveTab] = useState<PaymentMethod>('BANK');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Extract feeIds from initialData if present
  const feeIds: number[] = initialData?.feeIds || initialData?.fee_ids || [];
  const hasFeeIds = feeIds && feeIds.length > 0;
  const [lastInstruction, setLastInstruction] = useState<any | null>(null);

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

  // --- Actions ---

  const handleCopyRekening = () => {
    Alert.alert("Tersalin", "Nomor rekening berhasil disalin ke clipboard.");
  };

  const handleContactBendahara = () => {
    const phoneNumber = '628129876543'; // Admin RT
    const message = 'Halo Pak Budi, saya ingin menyerahkan uang tunai untuk iuran warga.';
    Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`)
      .catch(() => Alert.alert('Error', 'Tidak dapat membuka WhatsApp'));
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Izin Ditolak", "Izin kamera diperlukan.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.2,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.2,
        });
      }

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
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

  const handleSubmit = async () => {
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
      const formData = new FormData();
      const cleanAmount = amount.replace(/[^0-9]/g, '');
      
      if (!hasFeeIds) {
        formData.append('amount', cleanAmount);
      }
      
      // Append payment method
      formData.append('payment_method', activeTab);

      // Append payment method to description if needed, or handle separately
      const methodText = activeTab === 'BANK' ? 'Transfer Bank' : activeTab === 'QRIS' ? 'QRIS' : 'Tunai';
      formData.append('description', `${methodText} - ${description || 'Iuran Warga'}`);

      if (hasFeeIds) {
        feeIds.forEach((id: number) => {
          formData.append('fee_ids[]', String(id));
        });
      }

      const filename = photo.split('/').pop() || 'proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore
      formData.append('proof', {
        uri: photo,
        name: filename,
        type: type,
      });

      const endpoint = hasFeeIds ? '/warga/pay' : '/transactions/confirm';

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const instruction = hasFeeIds ? response.data.instruction : null;
        let successMessage = 'Pembayaran berhasil dikirim! Menunggu verifikasi admin.';

        if (instruction) {
          const channelLabel = instruction.channel || 'MANUAL';
          const amountValue = instruction.amount_total ?? '';
          const formattedAmount = amountValue !== '' ? formatRupiah(String(amountValue)) : '';

          successMessage += '\n\n';
          successMessage += `Channel Gateway: ${channelLabel}`;
          if (formattedAmount) {
            successMessage += `\nTotal Diproses Gateway: ${formattedAmount}`;
          }

          if (__DEV__) {
            console.log('IuranPayment instruction', instruction);
          }
          setLastInstruction(instruction);
        }

        Alert.alert(
          'Sukses', 
          successMessage,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Gagal', response.data.message || 'Gagal mengirim pembayaran');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const message = error.response?.data?.message || 'Terjadi kesalahan koneksi';
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
        return (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={styles.bankIcon}>
                <Text style={styles.bankIconText}>BCA</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Bank Central Asia</Text>
                <Text style={styles.infoValue}>123.456.7890</Text>
                <Text style={styles.infoSub}>a.n Kas RT 01</Text>
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
        return (
          <View style={styles.infoCard}>
            <View style={styles.qrisContainer}>
              <Image
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Qr-Example.png' }}
                style={styles.qrisImage}
                resizeMode="contain"
              />
              <Text style={styles.qrisInstruction}>
                Scan QRIS di atas menggunakan Gopay, OVO, Dana, atau Mobile Banking
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
                Silakan serahkan uang tunai ke Bapak Budi di Blok A No. 1. 
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
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Metode Pembayaran</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Tabs */}
        <View style={styles.tabContainer}>
          {renderTabButton('BANK', 'Transfer', 'bank-transfer')}
          {renderTabButton('QRIS', 'QRIS', 'qrcode-scan')}
          {renderTabButton('CASH', 'Tunai', 'cash-multiple')}
        </View>

        {/* Dynamic Content */}
        {renderInfoContent()}

        {/* Common Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Detail Pembayaran</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nominal (Rp)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
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
            onPress={handleSubmit}
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
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bankIcon: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary + '15', // 15% opacity
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
    backgroundColor: colors.primary + '10', // 10% opacity
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
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
});
