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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { BackButton } from '../components/BackButton';
import { settingService } from '../services/setting';

interface WalletSettingsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function WalletSettingsScreen({ onNavigate }: WalletSettingsScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
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

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Peringatan', 'Nama akun harus diisi');
      return;
    }

    try {
      setLoading(true);
      if (editingWallet) {
        await settingService.updateWallet(editingWallet.id, formData);
      } else {
        await settingService.storeWallet(formData);
      }
      setModalVisible(false);
      fetchWallets();
      Alert.alert('Sukses', 'Data berhasil disimpan');
    } catch (error) {
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
    } else {
      setEditingWallet(null);
      setFormData({
        name: '',
        type: 'CASH',
        balance: '0',
        bank_name: '',
        account_number: '',
      });
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
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  walletType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountNumber: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
