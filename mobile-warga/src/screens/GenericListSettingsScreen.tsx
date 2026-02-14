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

type SettingType = 'ACTIVITIES' | 'ROLES' | 'ADMINS' | 'FEES' | 'LETTER_TYPES';

interface GenericListSettingsScreenProps {
  onNavigate: (screen: string) => void;
  type: SettingType;
}

interface SettingField {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: string;
  secureTextEntry?: boolean;
}

interface SettingConfig {
  title: string;
  icon: string;
  fetch: () => Promise<{ data: any[] }>;
  store: (data: any) => Promise<any>;
  update: (id: number, data: any) => Promise<any>;
  delete: (id: number) => Promise<any>;
  fields: SettingField[];
}

export default function GenericListSettingsScreen({ onNavigate, type }: GenericListSettingsScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const config: SettingConfig = {
    ACTIVITIES: {
      title: t('home.menus.activityCategories'),
      icon: 'list-outline',
      fetch: settingService.getActivities,
      store: settingService.storeActivity,
      update: settingService.updateActivity,
      delete: settingService.deleteActivity,
      fields: [
        { key: 'name', label: 'Nama Kategori', placeholder: 'Contoh: Gotong Royong' },
        { key: 'description', label: 'Deskripsi', placeholder: 'Penjelasan kategori...' },
      ]
    },
    ROLES: {
      title: t('home.menus.roleManagement'),
      icon: 'shield-checkmark-outline',
      fetch: settingService.getRoles,
      store: settingService.storeRole,
      update: settingService.updateRole,
      delete: settingService.deleteRole,
      fields: [
        { key: 'name', label: 'Kode Peran (Huruf Besar & Underscore)', placeholder: 'Contoh: SEKRETARIS_RT' },
        { key: 'label', label: 'Nama Tampilan', placeholder: 'Contoh: Sekretaris RT' },
        { key: 'description', label: 'Deskripsi', placeholder: 'Tugas peran ini...' },
      ]
    },
    ADMINS: {
      title: t('home.menus.adminManagement'),
      icon: 'people-outline',
      fetch: settingService.getAdmins,
      store: settingService.storeAdmin,
      update: settingService.updateAdmin,
      delete: settingService.deleteAdmin,
      fields: [
        { key: 'name', label: 'Nama Lengkap', placeholder: 'Nama admin...' },
        { key: 'email', label: 'Email', placeholder: 'email@contoh.com', keyboardType: 'email-address' },
        { key: 'phone', label: 'No. WhatsApp', placeholder: '0812...', keyboardType: 'phone-pad' },
        { key: 'role', label: 'Kode Peran', placeholder: 'Contoh: SEKRETARIS_RT' },
        { key: 'password', label: 'Password', placeholder: 'Kosongkan jika tidak diubah', secureTextEntry: true },
      ]
    },
    FEES: {
      title: t('home.menus.feeManagement'),
      icon: 'cash-outline',
      fetch: settingService.getFees,
      store: settingService.storeFee,
      update: settingService.updateFee,
      delete: settingService.deleteFee,
      fields: [
        { key: 'name', label: 'Nama Iuran', placeholder: 'Contoh: Iuran Keamanan' },
        { key: 'amount', label: 'Nominal', placeholder: '0', keyboardType: 'numeric' },
        { key: 'description', label: 'Deskripsi', placeholder: 'Penjelasan iuran...' },
      ]
    },
    LETTER_TYPES: {
      title: t('home.menus.letterTypes'),
      icon: 'document-text-outline',
      fetch: async () => {
        const res = await settingService.getLetterTypes();
        return { data: res.data.data }; // Unwrap from { success: true, data: [...] }
      },
      store: settingService.storeLetterType,
      update: settingService.updateLetterType,
      delete: settingService.deleteLetterType,
      fields: [
        { key: 'name', label: 'Nama Surat', placeholder: 'Contoh: Surat Pengantar Domisili' },
        { key: 'code', label: 'Kode Surat', placeholder: 'Contoh: SKD' },
        { key: 'description', label: 'Deskripsi', placeholder: 'Kegunaan surat ini...' },
      ]
    }
  }[type];

  useEffect(() => {
    fetchItems();
  }, [type]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await config.fetch();
      setItems(response.data);
    } catch (error) {
      Alert.alert('Error', `Gagal memuat data ${config.title}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editingItem) {
        await config.update(editingItem.id, formData);
      } else {
        await config.store(formData);
      }
      setModalVisible(false);
      fetchItems();
      Alert.alert('Sukses', 'Data berhasil disimpan');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal menyimpan data';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus item ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await config.delete(id);
              fetchItems();
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

  const openModal = (item: any = null) => {
    const initialData: any = {};
    config.fields.forEach(f => {
      initialData[f.key] = item ? (item[f.key]?.toString() || '') : '';
    });
    
    setEditingItem(item);
    setFormData(initialData);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name || item.label || item.role_code}</Text>
        <Text style={styles.itemSub}>{item.description || item.email || item.role}</Text>
      </View>
      <View style={styles.actions}>
        {(!item.is_system) && (
          <>
            <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => onNavigate('SYSTEM_SETTINGS')} />
        <Text style={styles.headerTitle}>{config.title}</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={config.icon as any} size={64} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyText}>Belum ada data</Text>
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
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Data' : 'Tambah Data'}</Text>
            
            <ScrollView style={styles.form}>
              {config.fields.map(field => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData[field.key]}
                    onChangeText={(text) => setFormData({ ...formData, [field.key]: text })}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={field.keyboardType as any}
                    secureTextEntry={field.secureTextEntry}
                  />
                </View>
              ))}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  itemSub: {
    fontSize: 13,
    color: colors.textSecondary,
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
