import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Linking,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';

import api, { getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';

interface Letter {
  id: number;
  type: string;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  admin_note?: string;
  file_url?: string;
  user?: {
    name: string;
    phone?: string;
  };
}

interface LetterTypeData {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export default function LetterScreen() {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState('');
  const [purpose, setPurpose] = useState('');
  
  const [letterTypes, setLetterTypes] = useState([
    { label: 'Pengantar KTP', value: 'PENGANTAR_KTP' },
    { label: 'Pengantar KK', value: 'PENGANTAR_KK' },
    { label: 'Surat Domisili', value: 'DOMISILI' },
    { label: 'SKTM', value: 'SKTM' },
    { label: 'Lainnya', value: 'LAINNYA' },
  ]);

  useEffect(() => {
    fetchProfile();
    fetchLetters();
    fetchLetterTypes();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/me');
      const role = response.data.data.role;
      setUserRole(role);
      if (role && (role.toUpperCase() === 'ADMIN_RT' || role.toUpperCase() === 'RT')) {
        setActiveTab('history');
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const fetchLetterTypes = async () => {
    try {
      // @ts-ignore
      const response = await api.get('/letter-types');

      if (response.data.success && response.data.data.length > 0) {
        const types = response.data.data.map((t: LetterTypeData) => ({
            label: t.name,
            value: t.code
        }));
        setLetterTypes(types);
        
        // Set default type if current type is empty
        if (!type && types.length > 0) {
            setType(types[0].value);
        }
      } else if (!type && letterTypes.length > 0) {
          setType(letterTypes[0].value);
      }
    } catch (error) {
      console.error('Fetch letter types error:', error);
      // Fallback to default if fetch fails, ensure type is set
      if (!type && letterTypes.length > 0) {
        setType(letterTypes[0].value);
      }
    }
  };

  const fetchLetters = async () => {
    try {
      // @ts-ignore
      const response = await api.get('/letters');

      if (response.data.success) {
        setLetters(response.data.data);
      }
    } catch (error) {
      console.error('Fetch letters error:', error);
      Alert.alert('Error', 'Gagal memuat daftar surat');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLetters();
  };

  const handleSubmit = async () => {
    if (isExpired) {
      Alert.alert('Akses Terbatas', 'Masa trial RT Anda telah habis. Silakan hubungi admin RT untuk memperbarui langganan.');
      return;
    }
    if (isDemo) {
      Alert.alert('Mode Demo', 'Pengajuan surat tidak dapat dilakukan dalam mode demo.');
      return;
    }

    if (!purpose.trim()) {
      Alert.alert('Validasi', 'Keperluan surat wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      // @ts-ignore
      const response = await api.post('/letters', {
        type,
        purpose
      });

      if (response.data.success) {
        Alert.alert('Sukses', 'Pengajuan surat berhasil dikirim');
        setPurpose('');
        if (letterTypes.length > 0) {
            setType(letterTypes[0].value);
        }
        setActiveTab('history'); // Switch to history tab
        fetchLetters(); // Refresh list
      }
    } catch (error) {
      console.error('Submit letter error:', error);
      Alert.alert('Error', 'Gagal mengajukan surat');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (fileUrl: string) => {
    const fullUrl = getStorageUrl(fileUrl);
    if (!fullUrl) {
        Alert.alert('Error', 'Link file tidak valid');
        return;
    }
    Linking.openURL(fullUrl).catch(err => {
      console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Gagal membuka file surat');
    });
  };

  const handleUpdateStatus = async (id: number, newStatus: 'APPROVED' | 'REJECTED') => {
    if (isDemo) {
      Alert.alert('Mode Demo', 'Aksi ini tidak dapat dilakukan dalam mode demo.');
      return;
    }

    try {
      let confirmMsg = newStatus === 'APPROVED' 
        ? 'Setujui pengajuan surat ini?' 
        : 'Tolak pengajuan surat ini?';

      Alert.alert(
        'Konfirmasi',
        confirmMsg,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya',
            onPress: async () => {
              if (newStatus === 'REJECTED') {
                // Prompt for rejection note
                Alert.prompt(
                  'Alasan Penolakan',
                  'Masukkan alasan mengapa pengajuan ini ditolak:',
                  [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Kirim',
                      onPress: async (note?: string) => {
                        await processUpdateStatus(id, newStatus, note);
                      }
                    }
                  ]
                );
              } else {
                await processUpdateStatus(id, newStatus);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.log('Error update status:', error);
    }
  };

  const processUpdateStatus = async (id: number, status: string, note?: string) => {
    setLoading(true);
    try {
      const response = await api.put(`/letters/${id}`, {
        status,
        admin_note: note
      });

      if (response.data.success) {
        Alert.alert('Sukses', `Surat berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
        fetchLetters();
      }
    } catch (error: any) {
      console.error('Update status error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal memperbarui status surat');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#059669'; // Green
      case 'REJECTED': return '#ef4444'; // Red
      default: return '#f59e0b'; // Yellow/Amber
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Disetujui';
      case 'REJECTED': return 'Ditolak';
      default: return 'Menunggu';
    }
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  const renderItem = ({ item }: { item: Letter }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeContainer}>
          <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5' }]}>
             <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
             <Text style={styles.typeText}>{formatType(item.type)}</Text>
             {item.user && (
               <Text style={styles.requesterText}>Pemohon: {item.user.name}</Text>
             )}
             <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <Text style={styles.purposeLabel}>Keperluan:</Text>
      <Text style={styles.purposeText}>{item.purpose}</Text>

      {item.admin_note && (
        <View style={styles.noteContainer}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
          <View style={{ marginLeft: 8, flex: 1 }}>
             <Text style={styles.noteLabel}>Catatan Admin:</Text>
             <Text style={styles.noteText}>{item.admin_note}</Text>
          </View>
        </View>
      )}

      {item.status === 'APPROVED' && item.file_url && (
        <TouchableOpacity
          onPress={() => handleDownload(item.file_url!)}
          style={[styles.downloadButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 12 }}>
            <MaterialCommunityIcons name="download" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Download Surat (PDF)</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Admin Approval Actions */}
      {(userRole && (userRole.toUpperCase() === 'ADMIN_RT' || userRole.toUpperCase() === 'RT')) && item.status === 'PENDING' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#059669' }]}
            onPress={() => handleUpdateStatus(item.id, 'APPROVED')}
          >
            <Text style={styles.actionButtonText}>Setujui</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
          >
            <Text style={styles.actionButtonText}>Tolak</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Layanan Surat</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity 
            style={[styles.tab, { padding: 0, backgroundColor: activeTab === 'create' ? colors.primary + '20' : 'transparent' }]}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
              Buat Pengajuan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, { padding: 0, backgroundColor: activeTab === 'history' ? colors.primary + '20' : 'transparent' }]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              {(userRole && (userRole.toUpperCase() === 'ADMIN_RT' || userRole.toUpperCase() === 'RT')) ? 'Daftar Pengajuan' : 'Riwayat'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'create' ? (
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                 <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="file-document-edit-outline" size={24} color={colors.primary} />
                 </View>
                 <View>
                    <Text style={styles.sectionTitle}>Formulir Pengajuan</Text>
                    <Text style={styles.sectionSubtitle}>Isi data untuk surat pengantar</Text>
                 </View>
              </View>

              <Text style={styles.label}>Jenis Surat</Text>
              <View style={styles.typeSelector}>
                {letterTypes.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeOption,
                      { 
                        padding: 0, 
                        paddingHorizontal: 16, 
                        paddingVertical: 10, 
                        borderWidth: 1, 
                        borderColor: type === t.value ? colors.primary : colors.border,
                        backgroundColor: type === t.value ? colors.primary + '20' : colors.background
                      }
                    ]}
                    onPress={() => setType(t.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      type === t.value && styles.activeTypeOptionText
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Keperluan</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Contoh: Untuk persyaratan masuk sekolah anak"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                value={purpose}
                onChangeText={setPurpose}
                textAlignVertical="top"
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={[styles.submitButtonWrapper, styles.submitButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitButtonText}>Ajukan Surat</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={letters}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.emptyTitle}>Belum Ada Surat</Text>
                  <Text style={styles.emptyText}>
                    Anda belum pernah mengajukan surat pengantar. Silakan buat pengajuan baru.
                  </Text>
                </View>
              }
            />
          )
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginTop: -25, // Overlap header
    zIndex: 20,
    marginBottom: 10,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    requesterText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  purposeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  purposeText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  noteContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  downloadButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  downloadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.05)' : '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formContent: {
    padding: 20,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTypeOption: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTypeOptionText: {
    color: colors.primary,
  },
  textArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    marginBottom: 32,
    textAlignVertical: 'top',
  },
  submitButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
