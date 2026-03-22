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
  console.log('🔵 [BANSOS SCREEN] Component initializing...');
  
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  console.log('🔵 [BANSOS SCREEN] Hooks initialized, state setting up...');
  
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

  // EMERGENCY FIX: Wrap entire useEffect in try-catch
  useEffect(() => {
    console.log('🔵 [BANSOS SCREEN] useEffect triggered');
    try {
      console.log('🔵 [BANSOS SCREEN] About to call checkRole() and fetchData()');
      checkRole();
      fetchData();
      console.log('🔵 [BANSOS SCREEN] Functions called successfully');
    } catch (error: any) {
      console.error('❌ [BANSOS SCREEN] CRITICAL ERROR in useEffect:', error);
      setScreenError('Gagal memuat halaman. Silakan restart aplikasi.');
      setLoading(false);
    }
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

  // EMERGENCY FIX: Wrap checkRole in try-catch
  const checkRole = async () => {
    console.log('🔵 [CHECK ROLE] Starting...');
    try {
      console.log('🔵 [CHECK ROLE] Fetching /me endpoint...');
      const response = await api.get('/me');
      console.log('✅ [CHECK ROLE] Response received:', response.data?.success);
      const user = response.data.data;
      console.log('🔵 [CHECK ROLE] User role:', user.role);
      setIsAdminRT(user.role === 'ADMIN_RT');
      if (user.role === 'ADMIN_RT') {
        console.log('🔵 [CHECK ROLE] User is ADMIN_RT, fetching warga...');
        try {
          fetchWarga();
        } catch (error) {
          console.log('⚠️ [CHECK ROLE] Error fetching warga (non-critical):', error);
        }
      } else {
        console.log('🔵 [CHECK ROLE] User is WARGA, skipping warga fetch');
      }
    } catch (error: any) {
      console.log('⚠️ [CHECK ROLE] Error checking role (using fallback):', error.message);
      // Fallback to local storage
      try {
        const hasRole = await authService.hasRole('ADMIN_RT');
        console.log('🔵 [CHECK ROLE] Fallback role check:', hasRole);
        setIsAdminRT(hasRole);
        if (hasRole) {
          fetchWarga();
        }
      } catch (authError) {
        console.log('❌ [CHECK ROLE] Auth service error:', authError);
        setIsAdminRT(false); // Default to Warga role for safety
      }
    }
  };

  // EMERGENCY FIX: Wrap fetchWarga in try-catch
  const fetchWarga = async () => {
    console.log('🔵 [FETCH WARGA] Starting...');
    try {
      console.log('🔵 [FETCH WARGA] Fetching /warga endpoint...');
      const response = await api.get('/warga');
      console.log('✅ [FETCH WARGA] Response received:', response.data?.success);
      if (response.data.success) {
        const wargaData = response.data.data.data || [];
        console.log('🔵 [FETCH WARGA] Loaded', wargaData.length, 'users');
        setWargaList(wargaData);
      } else {
        console.log('⚠️ [FETCH WARGA] Response not successful');
        setWargaList([]);
      }
    } catch (error: any) {
      console.log('❌ [FETCH WARGA] Error:', error.message);
      setWargaList([]); // Prevent crash, just use empty list
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

  // EMERGENCY FIX: Wrap fetchData in comprehensive try-catch with null checks
  const fetchData = async () => {
    console.log('🔵 [FETCH DATA] Starting... activeTab:', activeTab);
    try {
      setLoading(true);
      setScreenError(null);
      
      if (activeTab === 'recipients') {
        console.log('🔵 [FETCH DATA] Fetching recipients...');
        const response = await api.get('/bansos-recipients');
        console.log('✅ [FETCH DATA] Recipients response status:', response.status);
        console.log('📦 [FETCH DATA] Response structure:', {
          hasData: !!response.data,
          hasSuccess: !!response.data?.success,
          hasDataArray: Array.isArray(response.data?.data),
          nestedDataLength: response.data?.data?.data?.length || 0
        });
        
        // ULTRA-DEFENSIVE: Handle ANY payload structure
        const extractedData = response?.data?.data?.data || response?.data?.data || response?.data || [];
        const validatedData = Array.isArray(extractedData) ? extractedData : [];
        console.log('🔵 [FETCH DATA] Validated data count:', validatedData.length);
        
        // Validate each recipient object
        const safeRecipients = validatedData.map((item: any, idx: number) => {
          try {
            if (!item || typeof item !== 'object') {
              console.warn('⚠️ [FETCH DATA] Invalid recipient at index', idx);
              return { id: idx, user_id: 0, no_kk: '-', status: 'PENDING', notes: '', score: 0, user: null };
            }
            return {
              ...item,
              user: item.user || null,
              no_kk: item.no_kk || '-',
              status: item.status || 'PENDING',
            };
          } catch (err) {
            console.warn('❌ [FETCH DATA] Error validating recipient at index', idx, err);
            return { id: idx, user_id: 0, no_kk: '-', status: 'PENDING', notes: '', score: 0, user: null };
          }
        });
        
        console.log('✅ [FETCH DATA] Setting', safeRecipients.length, 'recipients');
        setRecipients(safeRecipients);
      } else {
        console.log('🔵 [FETCH DATA] Fetching histories...');
        const response = await api.get('/bansos-histories');
        console.log('✅ [FETCH DATA] Histories response status:', response.status);
        
        // ULTRA-DEFENSIVE: Handle ANY payload structure
        const extractedData = response?.data?.data?.data || response?.data?.data || response?.data || [];
        const validatedData = Array.isArray(extractedData) ? extractedData : [];
        
        // Validate each history object
        const safeHistories = validatedData.map((item: any, idx: number) => {
          try {
            if (!item || typeof item !== 'object') {
              console.warn('⚠️ [FETCH DATA] Invalid history at index', idx);
              return { id: idx, bansos_recipient_id: 0, program_name: '-', date_received: '-', amount: 0, evidence_photo: null, recipient: null };
            }
            return {
              ...item,
              program_name: item.program_name || '-',
              date_received: item.date_received || '-',
              amount: item.amount || 0,
              recipient: item.recipient || null,
            };
          } catch (err) {
            console.warn('❌ [FETCH DATA] Error validating history at index', idx, err);
            return { id: idx, bansos_recipient_id: 0, program_name: '-', date_received: '-', amount: 0, evidence_photo: null, recipient: null };
          }
        });
        
        console.log('✅ [FETCH DATA] Setting', safeHistories.length, 'histories');
        setHistories(safeHistories);
      }
    } catch (error: any) {
      console.error('❌ [FETCH DATA] CRITICAL ERROR:', error.message);
      console.error('🔍 [FETCH DATA] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        config: {
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          fullUrl: `${error.config?.baseURL}${error.config?.url}`
        }
      });
      setScreenError(error.response?.status === 500 
        ? 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
        : 'Gagal memuat data. Periksa koneksi internet Anda.');
      setRecipients([]);
      setHistories([]);
    } finally {
      console.log('🔵 [FETCH DATA] Finally block - setting loading false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // EMERGENCY FIX: Wrap all action handlers in try-catch
  const handleSaveRecipient = async () => {
    try {
      if (!recipientForm.user_id || !recipientForm.no_kk) {
        Alert.alert('Error', 'Mohon lengkapi data wajib (Warga & No KK)');
        return;
      }

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
      console.error('Error saving recipient:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipient = (id: number) => {
    try {
      Alert.alert(
        'Konfirmasi',
        'Hapus data penerima ini?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: async () => {
              try {
                if (isExpired) {
                  Alert.alert(t('report.accessLimited'), t('report.trialExpiredAdmin'));
                  return;
                }
                setLoading(true);
                await api.delete(`/bansos-recipients/${id}`);
                fetchData();
              } catch (error: any) {
                console.error('Error deleting recipient:', error);
                Alert.alert('Error', 'Gagal menghapus data');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in delete handler:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat menghapus');
    }
  };

  const openDistributeModal = (recipient: BansosRecipient) => {
    try {
      setDistributeForm({
        program_name: '',
        amount: '',
        recipient_id: recipient?.id || 0,
        evidence_photo: null
      });
      setDistributeModalVisible(true);
    } catch (error) {
      console.error('Error opening distribute modal:', error);
      Alert.alert('Error', 'Gagal membuka form penyaluran');
    }
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

  // EMERGENCY FIX: Wrap modal openers in try-catch with null checks
  const openEditModal = (recipient: BansosRecipient) => {
    try {
      if (!recipient || typeof recipient !== 'object') {
        console.error('Invalid recipient object for edit');
        Alert.alert('Error', 'Data penerima tidak valid');
        return;
      }

      if (isExpired) {
        Alert.alert(t('report.accessLimited'), t('report.trialExpiredAdmin'));
        return;
      }
      setIsEditing(true);
      setSelectedRecipientId(recipient.id || 0);
      setRecipientForm({
        user_id: recipient.user_id?.toString() || '',
        no_kk: recipient.no_kk || '',
        status: recipient.status || 'PENDING',
        notes: recipient.notes || ''
      });
      setWargaSearch(recipient.user?.name || '');
      setRecipientModalVisible(true);
    } catch (error) {
      console.error('Error opening edit modal:', error);
      Alert.alert('Error', 'Gagal membuka form edit');
    }
  };

  const openAddModal = () => {
    try {
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
    } catch (error) {
      console.error('Error opening add modal:', error);
      Alert.alert('Error', 'Gagal membuka form tambah');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LAYAK': return '#10b981'; // Green
      case 'TIDAK_LAYAK': return '#ef4444'; // Red
      case 'PENDING': return '#f59e0b'; // Amber
      default: return colors.textSecondary;
    }
  };

  // EMERGENCY FIX: Ultra-defensive rendering with strict role checks
  const renderRecipientItem = ({ item }: { item: BansosRecipient }) => {
    try {
      // CRITICAL NULL CHECK - prevent crash on invalid data
      if (!item || typeof item !== 'object') {
        console.warn('Invalid recipient item:', item);
        return null;
      }

      // ULTRA-DEFENSIVE: Protect ALL nested property access
      const userAny = item.user as any;
      const userName = userAny?.name ?? userAny?.nama ?? 'Unknown';
      const userPhoto = ensureHttpsUrl(userAny?.photo_url ?? userAny?.avatar);
      
      // Type-safe string operations
      const safeUserName = typeof userName === 'string' ? userName : 'Unknown';
      const userInitial = (safeUserName && safeUserName.length > 0) ? safeUserName.charAt(0) : '?';
      const noKk = typeof item.no_kk === 'string' ? item.no_kk : '-';
      const notes = typeof item.notes === 'string' ? item.notes : '';
      const itemId = typeof item.id === 'number' ? item.id : 0;
      const itemStatus = typeof item.status === 'string' ? item.status : 'PENDING';
      
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
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(itemStatus) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(itemStatus) }]}>
                {itemStatus}
              </Text>
            </View>
          </View>
          
          {notes && notes.trim().length > 0 && (
            <Text style={styles.notes} numberOfLines={2}>
              Catatan: {notes}
            </Text>
          )}

          {/* EMERGENCY FIX: STRICT ROLE-BASED RENDERING - ONLY RT CAN SEE ADMIN BUTTONS */}
          {isAdminRT === true && (
            <View style={styles.actionRow}>
              {itemStatus === 'LAYAK' && (
                <TouchableOpacity 
                    style={[styles.actionButton, styles.distributeButton]}
                    onPress={() => {
                      try {
                        openDistributeModal(item);
                      } catch (error) {
                        console.error('Error in distribute button:', error);
                        Alert.alert('Error', 'Gagal membuka form penyaluran');
                      }
                    }}
                >
                    <Ionicons name="gift-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Salurkan</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: colors.background }]}
                  onPress={() => {
                    try {
                      openEditModal(item);
                    } catch (error) {
                      console.error('Error in edit button:', error);
                      Alert.alert('Error', 'Gagal membuka form edit');
                    }
                  }}
              >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: '#fee2e2' }]}
                  onPress={() => {
                    try {
                      handleDeleteRecipient(itemId);
                    } catch (error) {
                      console.error('Error in delete button:', error);
                      Alert.alert('Error', 'Gagal menghapus data');
                    }
                  }}
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

  // EMERGENCY FIX: Wrap filteredWarga in try-catch to prevent crashes
  const filteredWarga = useMemo(() => {
    try {
      if (!wargaList || wargaList.length === 0) return [];
      return wargaList.filter(w => 
        w.name && w.name.toLowerCase().includes((wargaSearch || '').toLowerCase())
      );
    } catch (error) {
      console.error('Error filtering warga:', error);
      return []; // Return empty list on error instead of crashing
    }
  }, [wargaList, wargaSearch]);

  // CRITICAL: Early return for error state to prevent blank screen
  if (screenError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Main Content */}
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
              <Ionicons name="help-circle-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {isAdminRT === true 
                  ? 'Belum ada data penerima bantuan. Klik tombol + untuk menambah.'
                  : 'Belum ada bantuan tersedia untuk Anda.'
                }
              </Text>
              {isAdminRT === true && (
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
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {isAdminRT === true
                  ? 'Belum ada riwayat penyaluran bantuan.'
                  : 'Belum ada riwayat bantuan yang Anda terima.'
                }
              </Text>
            </View>
          }
        />
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
    </SafeAreaView>
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
