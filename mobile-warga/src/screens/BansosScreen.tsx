import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Dimensions,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import api, { getStorageUrl } from '../services/api';
import { BackButton } from '../components/BackButton';
import { authService } from '../services/auth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BansosRecipient {
  id: number;
  user_id: number;
  no_kk: string;
  status: 'LAYAK' | 'TIDAK_LAYAK' | 'PENDING';
  notes: string;
  score: number;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    photo_url: string | null;
  };
}

interface BansosHistory {
  id: number;
  bansos_recipient_id: number;
  program_name: string;
  date_received: string;
  amount: number;
  evidence_photo: string | null;
  recipient: BansosRecipient;
}

interface User {
  id: number;
  name: string;
  phone: string;
}

export default function BansosScreen({ navigation, onNavigate }: any) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  const [activeTab, setActiveTab] = useState<'recipients' | 'history'>('recipients');
  const [recipients, setRecipients] = useState<BansosRecipient[]>([]);
  const [histories, setHistories] = useState<BansosHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdminRT, setIsAdminRT] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  // Recipient Form State
  const [recipientModalVisible, setRecipientModalVisible] = useState(false);
  const [wargaList, setWargaList] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [recipientForm, setRecipientForm] = useState({
    user_id: '',
    no_kk: '',
    status: 'PENDING',
    notes: ''
  });
  const [wargaSearch, setWargaSearch] = useState('');

  // Distribution Form State
  const [distributeModalVisible, setDistributeModalVisible] = useState(false);
  const [distributeForm, setDistributeForm] = useState({
    program_name: '',
    amount: '',
    recipient_id: 0,
    evidence_photo: null as string | null
  });

  const pickImage = async () => {
    Alert.alert(
      'Pilih Foto Bukti',
      'Ambil foto baru atau pilih dari galeri?',
      [
        {
          text: 'Kamera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Maaf', 'Kami membutuhkan izin kamera untuk fitur ini');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
            });

            if (!result.canceled) {
              setDistributeForm({ ...distributeForm, evidence_photo: result.assets[0].uri });
            }
          }
        },
        {
          text: 'Galeri',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
            });

            if (!result.canceled) {
              setDistributeForm({ ...distributeForm, evidence_photo: result.assets[0].uri });
            }
          }
        },
        {
          text: 'Batal',
          style: 'cancel'
        }
      ]
    );
  };

  useEffect(() => {
    checkRole();
    fetchData();
  }, [activeTab]);

  // BackHandler for modals
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (recipientModalVisible) {
          setRecipientModalVisible(false);
          return true;
        }
        if (distributeModalVisible) {
          setDistributeModalVisible(false);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        subscription.remove();
      };
    }, [recipientModalVisible, distributeModalVisible])
  );

  // Reset modal states when leaving screen
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Cleanup when screen loses focus
        setRecipientModalVisible(false);
        setDistributeModalVisible(false);
        setIsEditing(false);
        setSelectedRecipientId(null);
      };
    }, [])
  );

  const checkRole = async () => {
    try {
      // Fetch fresh user data to ensure role is up to date
      const response = await api.get('/me');
      const user = response.data.data;
      setIsAdminRT(user.role === 'ADMIN_RT');
      if (user.role === 'ADMIN_RT') {
        fetchWarga();
      }
    } catch (error) {
      console.log('Error checking role:', error);
      // Fallback to local storage
      const hasRole = await authService.hasRole('ADMIN_RT');
      setIsAdminRT(hasRole);
      if (hasRole) {
        fetchWarga();
      }
    }
  };

  const fetchWarga = async () => {
    try {
      const response = await api.get('/warga');
      if (response.data.success) {
        setWargaList(response.data.data.data);
      }
    } catch (error) {
      console.log('Error fetching warga:', error);
    }
  };

  // HELPER: Ensure HTTPS URL for images (from Web Admin fix)
  const ensureHttpsUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string') return null;
    
    if (url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    
    return `https://${url}`;
  };

  // ULTRA-DEFENSIVE: Fetch data with error handling
  const fetchData = async () => {
    try {
      setLoading(true);
      setScreenError(null);
      
      if (activeTab === 'recipients') {
        const response = await api.get('/bansos-recipients');
        
        // ULTRA-DEFENSIVE: Handle ANY payload structure
        const extractedData = response?.data?.data?.data || response?.data?.data || response?.data || [];
        const validatedData = Array.isArray(extractedData) ? extractedData : [];
        
        // Validate each recipient object
        const safeRecipients = validatedData.map((item: any, idx: number) => {
          if (!item || typeof item !== 'object') {
            console.warn(`Invalid recipient at index ${idx}, replacing with placeholder`);
            return { id: idx, user_id: 0, no_kk: '-', status: 'PENDING', notes: '', score: 0, user: null };
          }
          return {
            ...item,
            user: item.user || null,
            no_kk: item.no_kk || '-',
            status: item.status || 'PENDING',
          };
        });
        
        setRecipients(safeRecipients);
      } else {
        const response = await api.get('/bansos-histories');
        
        // ULTRA-DEFENSIVE: Handle ANY payload structure
        const extractedData = response?.data?.data?.data || response?.data?.data || response?.data || [];
        const validatedData = Array.isArray(extractedData) ? extractedData : [];
        
        // Validate each history object
        const safeHistories = validatedData.map((item: any, idx: number) => {
          if (!item || typeof item !== 'object') {
            console.warn(`Invalid history at index ${idx}, replacing with placeholder`);
            return { id: idx, bansos_recipient_id: 0, program_name: '-', date_received: '-', amount: 0, evidence_photo: null, recipient: null };
          }
          return {
            ...item,
            program_name: item.program_name || '-',
            date_received: item.date_received || '-',
            amount: item.amount || 0,
            recipient: item.recipient || null,
          };
        });
        
        setHistories(safeHistories);
      }
    } catch (error: any) {
      console.error('CRITICAL ERROR fetching bansos data:', error);
      setScreenError(error.response?.status === 500 
        ? 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
        : 'Gagal memuat data. Periksa koneksi internet Anda.');
      setRecipients([]);
      setHistories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSaveRecipient = async () => {
    if (!recipientForm.user_id || !recipientForm.no_kk) {
      Alert.alert('Error', 'Mohon lengkapi data wajib (Warga & No KK)');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && selectedRecipientId) {
        await api.put(`/bansos-recipients/${selectedRecipientId}`, recipientForm);
        Alert.alert('Sukses', 'Data penerima diperbarui');
      } else {
        await api.post('/bansos-recipients', recipientForm);
        Alert.alert('Sukses', 'Penerima berhasil ditambahkan');
      }
      setRecipientModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipient = (id: number) => {
    Alert.alert(
      'Konfirmasi',
      'Hapus data penerima ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            if (isExpired) {
              Alert.alert(t('report.accessLimited'), t('report.trialExpiredAdmin'));
              return;
            }
            try {
              setLoading(true);
              await api.delete(`/bansos-recipients/${id}`);
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', 'Gagal menghapus data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const openDistributeModal = (recipient: BansosRecipient) => {
    setDistributeForm({
      program_name: '',
      amount: '',
      recipient_id: recipient.id,
      evidence_photo: null
    });
    setDistributeModalVisible(true);
  };

  const handleDistribute = async () => {
    if (!distributeForm.program_name || !distributeForm.amount) {
      Alert.alert('Error', 'Mohon lengkapi nama program dan jumlah bantuan');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/bansos-recipients/${distributeForm.recipient_id}/distribute`, {
        program_name: distributeForm.program_name,
        date_received: new Date().toISOString().split('T')[0],
        amount: parseInt(distributeForm.amount),
        // evidence_photo logic would go here
      });
      Alert.alert('Sukses', 'Bantuan berhasil disalurkan');
      setDistributeModalVisible(false);
      // Switch to history tab to show result
      setActiveTab('history');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyalurkan bantuan');
      setLoading(false);
    }
  };

  const openEditModal = (recipient: BansosRecipient) => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpiredAdmin'));
      return;
    }
    setIsEditing(true);
    setSelectedRecipientId(recipient.id);
    setRecipientForm({
      user_id: recipient.user_id.toString(),
      no_kk: recipient.no_kk,
      status: recipient.status,
      notes: recipient.notes || ''
    });
    setWargaSearch(recipient.user?.name || '');
    setRecipientModalVisible(true);
  };

  const openAddModal = () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpiredAdmin'));
      return;
    }
    setIsEditing(false);
    setSelectedRecipientId(null);
    setRecipientForm({
      user_id: '',
      no_kk: '',
      status: 'PENDING',
      notes: ''
    });
    setWargaSearch('');
    setRecipientModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LAYAK': return '#10b981'; // Green
      case 'TIDAK_LAYAK': return '#ef4444'; // Red
      case 'PENDING': return '#f59e0b'; // Amber
      default: return colors.textSecondary;
    }
  };

  const renderRecipientItem = ({ item }: { item: BansosRecipient }) => {
    // CRITICAL NULL CHECK - prevent crash on invalid data
    if (!item || typeof item !== 'object') {
      console.warn('Invalid recipient item:', item);
      return null;
    }

    try {
      // ULTRA-DEFENSIVE: Protect ALL nested property access
      const userAny = item.user as any;
      const userName = userAny?.name ?? userAny?.nama ?? 'Unknown';
      const userPhoto = ensureHttpsUrl(userAny?.photo_url ?? userAny?.avatar);
      
      // Type-safe string operations
      const safeUserName = typeof userName === 'string' ? userName : 'Unknown';
      const userInitial = (safeUserName && safeUserName.length > 0) ? safeUserName.charAt(0) : '?';
      const noKk = typeof item.no_kk === 'string' ? item.no_kk : '-';
      const notes = typeof item.notes === 'string' ? item.notes : '';
      
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                  {userInitial}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{safeUserName}</Text>
                <Text style={styles.userKk}>KK: {noKk}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status || 'PENDING'}
              </Text>
            </View>
          </View>
          
          {notes && notes.trim().length > 0 && (
            <Text style={styles.notes} numberOfLines={2}>
              Catatan: {notes}
            </Text>
          )}

          {isAdminRT && (
            <View style={styles.actionRow}>
              {item.status === 'LAYAK' && (
                <TouchableOpacity 
                    style={[styles.actionButton, styles.distributeButton]}
                    onPress={() => openDistributeModal(item)}
                >
                    <Ionicons name="gift-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Salurkan</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: colors.background }]}
                  onPress={() => openEditModal(item)}
              >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: '#fee2e2' }]}
                  onPress={() => handleDeleteRecipient(item.id)}
              >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error('CRITICAL ERROR rendering recipient item:', error, item);
      return null;
    }
  };

  const renderHistoryItem = ({ item }: { item: BansosHistory }) => {
    // CRITICAL NULL CHECK - prevent crash on invalid data
    if (!item || typeof item !== 'object') {
      console.warn('Invalid history item:', item);
      return null;
    }

    try {
      // ULTRA-DEFENSIVE: Protect ALL nested property access
      const programName = typeof item.program_name === 'string' ? item.program_name : 'Tidak ada nama program';
      const dateReceived = typeof item.date_received === 'string' ? item.date_received : '-';
      const amount = typeof item.amount === 'number' ? item.amount : 0;
      const evidencePhoto = ensureHttpsUrl(item.evidence_photo);
      
      // CRITICAL: Nested recipient -> user access with null safety
      const recipientAny = item.recipient as any;
      const recipientName = recipientAny?.user?.name ?? recipientAny?.nama ?? 'Tidak diketahui';
      const safeRecipientName = typeof recipientName === 'string' ? recipientName : 'Tidak diketahui';
      
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.programName}>{programName}</Text>
              <Text style={styles.date}>{dateReceived}</Text>
            </View>
            <Text style={styles.amount}>
              {amount ? `Rp ${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'Barang'}
            </Text>
          </View>
          <Text style={styles.recipientName}>Penerima: {safeRecipientName}</Text>
          {evidencePhoto && (
            <Image 
              source={{ uri: evidencePhoto }} 
              style={styles.evidencePhoto}
              resizeMode="cover"
            />
          )}
        </View>
      );
    } catch (error) {
      console.error('CRITICAL ERROR rendering history item:', error, item);
      return null;
    }
  };

  const filteredWarga = useMemo(() => {
    if (!wargaList || wargaList.length === 0) return [];
    return wargaList.filter(w => 
      w.name && w.name.toLowerCase().includes((wargaSearch || '').toLowerCase())
    );
  }, [wargaList, wargaSearch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[colors.primary, '#064e3b']} // Emerald 600 to 900
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => onNavigate ? onNavigate('HOME') : navigation?.goBack()} color="#fff" />
            <Text style={styles.headerTitle}>Bantuan Sosial</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ERROR BOUNDARY UI - Show error instead of white screen */}
      {screenError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Oops! Terjadi Kesalahan</Text>
          <Text style={styles.errorMessage}>{screenError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setScreenError(null);
              fetchData();
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {!screenError && (
        <>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'recipients' && styles.activeTab]}
              onPress={() => setActiveTab('recipients')}
            >
              <Text style={[styles.tabText, activeTab === 'recipients' && styles.activeTabText]}>
                Penerima
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'history' && styles.activeTab]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                Riwayat
              </Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : activeTab === 'recipients' ? (
            <FlatList
              data={recipients || []}
              renderItem={renderRecipientItem}
              keyExtractor={(item) => item?.id?.toString() || 'unknown'}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Belum ada data penerima</Text>
                  {isAdminRT && (
                    <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                      <Text style={styles.emptyButtonText}>Tambah Penerima</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          ) : (
            <FlatList
              data={histories || []}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item?.id?.toString() || 'unknown'}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Belum ada riwayat</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Recipient Modal */}
      <Modal
        visible={recipientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRecipientModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Penerima' : 'Tambah Penerima'}
              </Text>
              <TouchableOpacity onPress={() => setRecipientModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formContainer}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Pilih Warga</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={styles.input}
                  placeholder="Cari nama warga..."
                  placeholderTextColor={colors.textSecondary}
                  value={wargaSearch}
                  onChangeText={(text) => {
                    setWargaSearch(text);
                    // Clear selection when user types
                    if (text !== wargaSearch) {
                      setRecipientForm({...recipientForm, user_id: ''});
                    }
                  }}
                  autoFocus
                />
                {/* Suggestions Dropdown */}
                {wargaSearch.length > 0 && !recipientForm.user_id && filteredWarga.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {filteredWarga.slice(0, 5).map((w, index) => (
                      <TouchableOpacity 
                        key={w.id} 
                        style={[
                          styles.suggestionItem,
                          index === filteredWarga.slice(0, 5).length - 1 && { borderBottomWidth: 0 }
                        ]}
                        onPress={() => {
                          setRecipientForm({...recipientForm, user_id: w.id.toString()});
                          setWargaSearch(w.name);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>{w.name}</Text>
                        <Text style={styles.suggestionSubtext}>{w.phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={styles.label}>Nomor KK</Text>
              <TextInput
                style={styles.input}
                placeholder="Nomor Kartu Keluarga"
                placeholderTextColor={colors.textSecondary}
                value={recipientForm.no_kk}
                onChangeText={(text) => setRecipientForm({...recipientForm, no_kk: text})}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Status Kelayakan</Text>
              <View style={styles.statusOptions}>
                {['LAYAK', 'TIDAK_LAYAK', 'PENDING'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      recipientForm.status === status && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setRecipientForm({...recipientForm, status: status as any})}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      recipientForm.status === status && { color: '#fff' }
                    ]}>
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Catatan</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Catatan tambahan..."
                placeholderTextColor={colors.textSecondary}
                value={recipientForm.notes}
                onChangeText={(text) => setRecipientForm({...recipientForm, notes: text})}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveRecipient}
              >
                <Text style={styles.saveButtonText}>Simpan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Distribution Modal */}
      <Modal
        visible={distributeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDistributeModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { zIndex: 9999 }]}
        >
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Salurkan Bantuan</Text>
              <TouchableOpacity onPress={() => setDistributeModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formContainer}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Nama Program</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: BLT Januari 2026"
                placeholderTextColor={colors.textSecondary}
                value={distributeForm.program_name}
                onChangeText={(text) => setDistributeForm({...distributeForm, program_name: text})}
              />

              <Text style={styles.label}>Jumlah (Rp)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={distributeForm.amount}
                onChangeText={(text) => setDistributeForm({...distributeForm, amount: text})}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Bukti Foto (Opsional)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                {distributeForm.evidence_photo ? (
                  <Image 
                    source={{ uri: distributeForm.evidence_photo }} 
                    style={styles.previewImage} 
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                    <Text style={styles.uploadText}>Pilih Foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleDistribute}
              >
                <Text style={styles.saveButtonText}>Konfirmasi Penyaluran</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
  },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerAddButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  uploadButton: {
    height: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
  },
  uploadText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userKk: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  notes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distributeButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  recipientName: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
  },
  evidencePhoto: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  formContainer: {
    flexGrow: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionText: {
    fontSize: 12,
    color: colors.text,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: 4,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  suggestionSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  // Error Boundary Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
