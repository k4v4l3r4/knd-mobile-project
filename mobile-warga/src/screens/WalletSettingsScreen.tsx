import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { BackButton } from '../components/BackButton';
import { settingService } from '../services/setting';
import { getStorageUrl } from '../services/api';

interface WalletSettingsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function WalletSettingsScreen({ onNavigate }: WalletSettingsScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired, isTrial } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [qrCodeImage, setQrCodeImage] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CASH',
    balance: '0',
    bank_name: '',
    account_number: '',
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await settingService.getWallets();
      setWallets(response.data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data kas & bank');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setQrCodeImage(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Peringatan', 'Nama akun harus diisi');
      return;
    }

    try {
      setLoading(true);
      
      const data = new FormData();
      data.append('name', formData.name);
      data.append('type', formData.type);
      data.append('balance', formData.balance);
      if (formData.bank_name) data.append('bank_name', formData.bank_name);
      if (formData.account_number) data.append('account_number', formData.account_number);
      
      if (qrCodeImage && qrCodeImage.uri && !qrCodeImage.uri.startsWith('http')) {
        const filename = qrCodeImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        data.append('qr_code', {
          uri: qrCodeImage.uri,
          name: filename || 'qrcode.jpg',
          type,
        } as any);
      }

      if (editingWallet) {
        await settingService.updateWallet(editingWallet.id, data);
      } else {
        await settingService.storeWallet(data);
      }
      setModalVisible(false);
      fetchWallets();
      Alert.alert('Sukses', 'Data berhasil disimpan');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus akun ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await settingService.deleteWallet(id);
              fetchWallets();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const openModal = (wallet: any = null) => {
    if (wallet) {
      setEditingWallet(wallet);
      setFormData({
        name: wallet.name,
        type: wallet.type,
        balance: wallet.balance.toString(),
        bank_name: wallet.bank_name || '',
        account_number: wallet.account_number || '',
      });
      setQrCodeImage(wallet.qr_code_url ? { uri: getStorageUrl(wallet.qr_code_url) } : null);
    } else {
      setEditingWallet(null);
      setFormData({
        name: '',
        type: 'CASH',
        balance: '0',
        bank_name: '',
        account_number: '',
      });
      setQrCodeImage(null);
    }
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.walletCard}>
      <View style={[styles.iconBox, { backgroundColor: item.type === 'CASH' ? '#10b98120' : '#3b82f620' }]}>
        <Ionicons 
          name={item.type === 'CASH' ? 'cash-outline' : 'business-outline'} 
          size={24} 
          color={item.type === 'CASH' ? '#10b981' : '#3b82f6'} 
        />
      </View>
      <View style={styles.walletInfo}>
        <Text style={styles.walletName}>{item.name}</Text>
        <Text style={styles.walletType}>{item.type === 'CASH' ? 'Tunai' : `Bank (${item.bank_name})`}</Text>
        {item.account_number && <Text style={styles.accountNumber}>{item.account_number}</Text>}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
          <Ionicons name="pencil" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => onNavigate('SYSTEM_SETTINGS')} />
        <Text style={styles.headerTitle}>{t('home.menus.financeSettings')}</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && wallets.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={wallets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyText}>Belum ada akun kas atau bank</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingWallet ? 'Edit Akun' : 'Tambah Akun Baru'}</Text>
            
            <ScrollView style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Akun</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Contoh: Kas Utama / Bank BCA"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tipe Akun</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity 
                    style={[styles.typeBtn, formData.type === 'CASH' && styles.typeBtnActive]}
                    onPress={() => setFormData({ ...formData, type: 'CASH' })}
                  >
                    <Text style={[styles.typeBtnText, formData.type === 'CASH' && styles.typeBtnTextActive]}>Tunai</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.typeBtn, formData.type === 'BANK' && styles.typeBtnActive]}
                    onPress={() => setFormData({ ...formData, type: 'BANK' })}
                  >
                    <Text style={[styles.typeBtnText, formData.type === 'BANK' && styles.typeBtnTextActive]}>Bank</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formData.type === 'CASH' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nomor HP/WA (Konfirmasi)</Text>
                    <TextInput
            style={styles.input}
            value={formData.account_number}
            onChangeText={(text) => {
              let val = text;
              if (val.startsWith('0')) val = '62' + val.substring(1);
              setFormData({ ...formData, account_number: val });
            }}
            keyboardType="phone-pad"
            maxLength={15}
            placeholder="628..."
            placeholderTextColor={colors.textSecondary}
          />
                  </View>
              )}

              {formData.type === 'BANK' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nama Bank</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.bank_name}
                      onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                      placeholder="Contoh: BCA / Mandiri"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nomor Rekening</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.account_number}
                      onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                      keyboardType="numeric"
                      placeholder="Nomor rekening bank"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>QR Code (QRIS)</Text>
                    <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
                      {qrCodeImage ? (
                        <Image source={{ uri: qrCodeImage.uri }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Ionicons name="qr-code-outline" size={32} color={colors.textSecondary} />
                          <Text style={styles.placeholderText}>Upload QR Code</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Saldo Awal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.balance}
                  onChangeText={(text) => setFormData({ ...formData, balance: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 64,
  },
  emptyText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 16,
  },
  walletCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  walletType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  accountNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    color: colors.text,
    fontWeight: '500',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  imagePicker: {
    height: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  placeholderImage: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 14,
  },
});