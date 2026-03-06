import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

import api, { getStorageUrl } from '../services/api';
import { authService } from '../services/auth';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';

const formatPhoneNumber = (phone: string) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

interface Warga {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  ktp_image_path?: string | null;
  address: string | null;
  block: string | null;
  address_rt: string | null;
  address_rw: string | null;
  status_in_family: string;
  role?: string;
  place_of_birth?: string | null;
  date_of_birth?: string | null;
  nik?: string;
  kk_number?: string | null;
  gender?: string | null;
  family?: Warga[];
  marital_status?: string | null;
  religion?: string | null;
  occupation?: string | null;
  data_verified_at?: string | null;
}

interface WargaListScreenProps {
  // Props can be added here if needed
}

const formatDate = (dateString: string | null, language: string) => {
  if (!dateString) return '';
  try {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', options);
  } catch (e) {
    return dateString;
  }
};

const calculateAge = (dateString: string) => {
  if (!dateString) return 0;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getAvatarUrl = (path: string | null) => {
  if (!path) return 'https://ui-avatars.com/api/?name=User&background=random';
  return getStorageUrl(path);
};

// Professional Card Component
const ProfessionalWargaCard = React.memo(({ item, colors, styles, t, language, isFamilyView, onEdit, onDelete }: any) => {
  const isHeadOfFamily = item.status_in_family === 'KEPALA_KELUARGA';
  const isWife = item.status_in_family === 'ISTRI';
  const isChild = item.status_in_family === 'ANAK';
  const isVerified = !!item.data_verified_at;

  const getBadgeColor = () => {
    if (isHeadOfFamily) return { bg: '#d1fae5', text: '#059669' }; // Green
    if (isWife) return { bg: '#fce7f3', text: '#db2777' }; // Pink
    if (isChild) return { bg: '#dbeafe', text: '#2563eb' }; // Blue
    return { bg: colors.surfaceVariant, text: colors.textSecondary }; // Grey
  };

  const badgeColors = getBadgeColor();
  
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <Image 
            source={{ uri: ((item.photo_url && getAvatarUrl(item.photo_url)) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`) as string }} 
            style={styles.avatar} 
          />
          <View style={styles.headerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.name}>{item.name}</Text>
              {isVerified && (
                <MaterialIcons name="verified" size={16} color="#059669" />
              )}
            </View>
            <View style={styles.badgesContainer}>
              <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                <Text style={[styles.badgeText, { color: badgeColors.text }]}>
                  {item.status_in_family?.replace(/_/g, ' ') || item.role?.replace(/_/g, ' ') || '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Button - Top Right */}
        {onEdit && (
          <TouchableOpacity 
            onPress={() => onEdit(item)} 
            style={{ 
              padding: 8, 
              backgroundColor: colors.surfaceVariant, 
              borderRadius: 20,
              marginLeft: 8
            }}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="home-map-marker" size={16} color={colors.textSecondary} style={styles.infoIcon} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Alamat</Text>
            <Text style={styles.infoValue}>
              {[
                  item.block ? `Blok ${item.block}` : null,
                  Number(item.address_rt || 0) > 0 ? `RT ${String(Number(item.address_rt)).padStart(3, '0')}` : null,
                  Number(item.address_rw || 0) > 0 ? `RW ${String(Number(item.address_rw)).padStart(3, '0')}` : null
              ].filter(Boolean).join(', ') || item.address || '-'}
            </Text>
          </View>
        </View>
        
        {isFamilyView && item.nik && (
           <View style={styles.infoRow}>
              <MaterialCommunityIcons name="card-account-details-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
              <View style={styles.infoItem}>
                 <Text style={styles.infoLabel}>NIK</Text>
                 <Text style={styles.infoValue}>{item.nik}</Text>
              </View>
           </View>
        )}

        {(item.place_of_birth || item.date_of_birth) && (
          <View style={styles.infoRow}>
             <MaterialCommunityIcons name="cake-variant-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
             <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tempat, Tanggal Lahir</Text>
                <Text style={styles.infoValue}>
                  {item.place_of_birth || '-'}, {formatDate(item.date_of_birth || null, language)} 
                  {item.date_of_birth ? ` (${calculateAge(item.date_of_birth)} ${t('warga.yearShort')})` : ''}
                </Text>
             </View>
          </View>
        )}
      </View>

      {/* Delete Button - Only show if explicit and NOT in Family View (or per specific logic) */}
      {onDelete && !isFamilyView && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
           <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
           </TouchableOpacity>
        </View>
      )}

    </View>
  );
}, (prev, next) => prev.item === next.item && prev.colors === next.colors && prev.styles === next.styles && prev.language === next.language && prev.isFamilyView === next.isFamilyView && prev.onEdit === next.onEdit && prev.onDelete === next.onDelete);

export default function WargaListScreen({ }: WargaListScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const { isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  // Tabs: 'rt' | 'family'
  const [activeTab, setActiveTab] = useState<'rt' | 'family'>('rt');
  
  // Warga RT Data
  const [wargas, setWargas] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Family Data
  const [familyMembers, setFamilyMembers] = useState<Warga[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [selectedHead, setSelectedHead] = useState<Warga | null>(null);
  const [familyDetailLoading, setFamilyDetailLoading] = useState(false);

  // Admin RT Role
  const [isAdminRT, setIsAdminRT] = useState(false);
  const [isKepalaKeluarga, setIsKepalaKeluarga] = useState(false);
  const [currentUser, setCurrentUser] = useState<Warga | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingWarga, setEditingWarga] = useState<Warga | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    phone: '', 
    nik: '', 
    kk_number: '',
    place_of_birth: '',
    date_of_birth: '',
    gender: 'L',
    religion: 'ISLAM',
    marital_status: 'Kawin',
    status_in_family: 'KEPALA_KELUARGA',
    address_rt: '',
    address_rw: '',
    address: '',
    block: '',
    occupation: '',
    ktp_image: null as any,
    ktp_image_path: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'create' | 'edit'>('create');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Create Warga State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    nik: '',
    kk_number: '',
    phone: '',
    address_rt: '',
    address_rw: '',
    place_of_birth: '',
    date_of_birth: '', // YYYY-MM-DD
    gender: 'L',
    marital_status: 'Kawin',
    religion: 'ISLAM',
    status_in_family: 'KEPALA_KELUARGA',
    address: '',
    block: '',
    occupation: ''
  });

  // Check Role
  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    const hasRole = await authService.hasRole('ADMIN_RT');
    setIsAdminRT(hasRole);
    
    const user = await authService.getUser();
    if (user) {
      setCurrentUser(user as any);
      const isKK = user.status_in_family === 'KEPALA_KELUARGA';
      setIsKepalaKeluarga(isKK);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant camera access to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10], // KTP aspect ratio
      quality: 0.7,
    });

    if (!result.canceled) {
      setEditForm({ ...editForm, ktp_image: result.assets[0] });
      setHasUnsavedChanges(true);
    }
  };

  const handleDeleteWarga = (warga: Warga) => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), isAdminRT ? t('report.trialExpiredAdmin') : t('report.trialExpired'));
      return;
    }

    // RBAC: Only Admin RT can delete
    if (!isAdminRT) {
        Alert.alert(
            "Akses Ditolak", 
            "Penghapusan data anggota keluarga hanya dapat dilakukan melalui Admin RT/RW"
        );
        return;
    }

    Alert.alert(
      'Hapus Warga',
      `Apakah anda yakin ingin menghapus ${warga.name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/warga/${warga.id}`);
              Alert.alert('Sukses', 'Data warga berhasil dihapus');
              fetchWargas(1, searchQuery, true);
              if (activeTab === 'family') fetchFamily();
              
              if (selectedHead && warga.id === selectedHead.id) {
                  setFamilyModalVisible(false);
              } else if (selectedHead) {
                  // Refresh family list if a member was deleted
                  try {
                    const response = await api.get(`/warga/${selectedHead.id}`);
                    if (response.data?.success && response.data.data) {
                      setSelectedHead(response.data.data);
                    }
                  } catch (e) {
                    console.error('Refresh family error', e);
                  }
              } else {
                  setFamilyModalVisible(false);
              }
            } catch (error: any) {
              Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menghapus data');
            }
          }
        }
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      if (datePickerMode === 'create') {
        setCreateForm({ ...createForm, date_of_birth: dateString });
      } else {
        setEditForm({ ...editForm, date_of_birth: dateString });
      }
    }
  };

  const handleEditWarga = (warga: Warga) => {
    // RBAC Check for Edit
    // Admin RT can edit anyone
    // Kepala Keluarga can edit self and family (same KK)
    // Others cannot edit
    
    // Note: The UI button visibility should already filter this, but double check here
    if (!isAdminRT) {
        if (!isKepalaKeluarga) {
             Alert.alert("Akses Ditolak", "Hanya Kepala Keluarga yang dapat mengubah data.");
             return;
        }
        // If isKepalaKeluarga, ensure target is in same family (simple check via KK)
        if (currentUser && warga.kk_number !== currentUser.kk_number) {
             Alert.alert("Akses Ditolak", "Anda hanya dapat mengubah data keluarga anda sendiri.");
             return;
        }
    }

    setEditingWarga(warga);
    setEditForm({
      name: warga.name,
      phone: warga.phone || '',
      nik: warga.nik || '',
      kk_number: warga.kk_number || '',
      place_of_birth: warga.place_of_birth || '',
      date_of_birth: warga.date_of_birth || '',
      gender: warga.gender || 'L',
      religion: warga.religion || 'ISLAM',
      marital_status: warga.marital_status || 'Kawin',
      status_in_family: warga.status_in_family || 'KEPALA_KELUARGA',
      address_rt: warga.address_rt || '',
      address_rw: warga.address_rw || '',
      address: warga.address || '',
      block: warga.block || '',
      occupation: warga.occupation || '',
      ktp_image: null,
      ktp_image_path: warga.ktp_image_path || ''
    });
    setHasUnsavedChanges(false);
    setActiveStep(0);
    setEditModalVisible(true);
  };

  const saveEditWarga = async () => {
    if (!editingWarga) return;
    try {
      setIsSaving(true);
      
      const formData = new FormData();
      Object.keys(editForm).forEach(key => {
          if (key === 'ktp_image' && editForm[key]) {
              const file = editForm[key];
              const filename = file.uri.split('/').pop();
              const match = /\.(\w+)$/.exec(filename);
              const type = match ? `image/${match[1]}` : `image`;
              
              formData.append('ktp_image', { uri: file.uri, name: filename, type } as any);
          } else if (key !== 'ktp_image' && key !== 'ktp_image_path') {
              formData.append(key, (editForm as any)[key]);
          }
      });
      
      // Method spoofing for Laravel PUT with file
      formData.append('_method', 'PUT');

      await api.post(`/warga/${editingWarga.id}`, formData, {
          headers: {
              'Content-Type': 'multipart/form-data',
          }
      });
      
      Alert.alert('Sukses', 'Data warga berhasil diperbarui');
      setEditModalVisible(false);
      setHasUnsavedChanges(false);
      fetchWargas(1, searchQuery, true);
      if (activeTab === 'family') fetchFamily();
      
      // Update selected head if needed
      if (selectedHead) {
          if (selectedHead.id === editingWarga.id) {
             setSelectedHead({ ...selectedHead, ...editForm });
          } else {
             // Refresh family members
             try {
                const response = await api.get(`/warga/${selectedHead.id}`);
                if (response.data?.success && response.data.data) {
                  setSelectedHead(response.data.data);
                }
             } catch (e) {
                console.error('Refresh family error', e);
             }
          }
      }
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), isAdminRT ? t('report.trialExpiredAdmin') : t('report.trialExpired'));
      return;
    }

    setCreateForm({
      name: '',
      nik: '',
      kk_number: '',
      phone: '',
      address_rt: '',
      address_rw: '',
      place_of_birth: '',
      date_of_birth: '',
      gender: 'L',
      marital_status: 'Kawin',
      religion: 'ISLAM',
      status_in_family: 'KEPALA_KELUARGA',
      address: '',
      block: '',
      occupation: ''
    });
    setCreateModalVisible(true);
  };

  const handleCreateWarga = async () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), isAdminRT ? t('report.trialExpiredAdmin') : t('report.trialExpired'));
      return;
    }

    try {
      setIsSaving(true);
      
      // Basic validation
      if (!createForm.name || !createForm.nik || !createForm.kk_number) {
        Alert.alert('Error', 'Mohon lengkapi data wajib (Nama, NIK, No KK)');
        setIsSaving(false);
        return;
      }

      await api.post('/warga', {
        ...createForm,
        phone: formatPhoneNumber(createForm.phone)
      });
      Alert.alert('Sukses', 'Data warga berhasil ditambahkan');
      setCreateModalVisible(false);
      fetchWargas(1, searchQuery, true);
      if (activeTab === 'family') fetchFamily();
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch Warga RT
  const fetchWargas = useCallback(async (pageNumber = 1, search = '', refresh = false) => {
    try {
      if (pageNumber === 1) setLoading(true);
      
      const response = await api.get('/warga', {
        params: {
          page: pageNumber,
          search: search,
          per_page: 20,
          head_only: true
        }
      });

      if (response.data.success) {
        const newData = response.data.data.data;
        
        if (refresh) {
          setWargas(newData);
          if (pageNumber === 1 && !search) {
            AsyncStorage.setItem('warga_list_cache', JSON.stringify(newData)).catch(e => console.log('Cache save error', e));
          }
        } else {
          setWargas(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNewData = newData.filter((item: Warga) => !existingIds.has(item.id));
            return [...prev, ...uniqueNewData];
          });
        }
        setHasMore(response.data.data.next_page_url !== null);
      }
    } catch (error) {
      console.error('Error fetching warga:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Family
  const fetchFamily = useCallback(async () => {
    setFamilyLoading(true);
    try {
      const response = await api.get('/warga/family');

      let family: any = null;

      if (response.data) {
        if (response.data.success) {
          const data = response.data.data;
          if (Array.isArray(data)) {
            family = data;
          } else if (data && Array.isArray(data.data)) {
            family = data.data;
          }
        } else if (Array.isArray(response.data.data)) {
          family = response.data.data;
        } else if (Array.isArray(response.data)) {
          family = response.data;
        }
      }

      if (!family || family.length === 0) {
        try {
          const meResponse = await api.get('/me');
          const meData = meResponse.data?.data;
          if (meData && Array.isArray(meData.family)) {
            family = meData.family;
          }
        } catch (e) {
          // ignore secondary error, main error handled below
        }
      }

      if (family && Array.isArray(family)) {
        setFamilyMembers(family);
      } else {
        setFamilyMembers([]);
      }
    } catch (error) {
      console.error('Error fetching family:', error);
      setFamilyMembers([]);
    } finally {
      setFamilyLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load Initial Data
  useEffect(() => {
    loadCache();
    fetchWargas(1, searchQuery);
    fetchFamily();
  }, []);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem('warga_list_cache');
      if (cached) {
        setWargas(JSON.parse(cached));
      }
    } catch (e) {
      // ignore
    }
  };

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'rt') {
        setPage(1);
        fetchWargas(1, searchQuery, true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Tab Switch Effect
  useEffect(() => {
    if (activeTab === 'family' && familyMembers.length === 0) {
      fetchFamily();
    }
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'rt') {
      setPage(1);
      fetchWargas(1, searchQuery, true);
    } else {
      fetchFamily();
    }
  }, [activeTab, searchQuery]);

  const handleOpenFamilyDetail = useCallback(async (item: Warga) => {
    if (activeTab !== 'rt') return;
    setSelectedHead(item);
    setFamilyModalVisible(true);
    setFamilyDetailLoading(true);
    try {
      const response = await api.get(`/warga/${item.id}`);
      if (response.data?.success && response.data.data) {
        setSelectedHead(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching warga detail:', error);
    } finally {
      setFamilyDetailLoading(false);
    }
  }, [activeTab]);

  const loadMore = () => {
    if (!loading && hasMore && activeTab === 'rt') {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWargas(nextPage, searchQuery);
    }
  };

  const renderItem = useCallback(({ item }: { item: Warga }) => (
    <TouchableOpacity
      activeOpacity={activeTab === 'rt' ? 0.85 : 1}
      onPress={() => handleOpenFamilyDetail(item)}
      disabled={activeTab !== 'rt'}
    >
      <ProfessionalWargaCard 
        item={item} 
        colors={colors} 
        styles={styles} 
        t={t} 
        language={language}
        isFamilyView={activeTab === 'family'}
        onEdit={(isAdminRT || (activeTab === 'family' && isKepalaKeluarga)) ? handleEditWarga : undefined}
        onDelete={isAdminRT ? handleDeleteWarga : undefined}
      />
    </TouchableOpacity>
  ), [colors, styles, t, language, activeTab, handleOpenFamilyDetail, isAdminRT, isKepalaKeluarga]);

  const keyExtractor = useCallback((item: Warga) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {/* Header with Tabs */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={isDarkMode ? ['#059669', '#047857'] : ['#059669', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Data Warga</Text>
            </View>
            
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'rt' && styles.activeTabButton]}
                onPress={() => setActiveTab('rt')}
              >
                <Text style={[styles.tabText, activeTab === 'rt' && styles.activeTabText]}>Warga RT</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'family' && styles.activeTabButton]}
                onPress={() => setActiveTab('family')}
              >
                <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>Data Keluarga</Text>
              </TouchableOpacity>
            </View>

            {/* Search - Only for RT Tab */}
            {activeTab === 'rt' && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={isDarkMode ? '#94a3b8' : '#fff'} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('warga.searchPlaceholder')}
                  placeholderTextColor={isDarkMode ? '#94a3b8' : 'rgba(255,255,255,0.7)'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}
          </SafeAreaView>
        </LinearGradient>
      </View>

      <FlatList
        data={activeTab === 'rt' ? wargas : familyMembers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}

        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={activeTab === 'rt' ? loadMore : null}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && !familyLoading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('warga.noData')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          (loading || familyLoading) && !refreshing ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} /> : null
        }
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {selectedHead && (
        <Modal
          visible={familyModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFamilyModalVisible(false)}
        >
          <View style={styles.familyModalOverlay}>
            <View style={[styles.familyModalContent, { backgroundColor: colors.card }]}>
              <View style={styles.familyModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.familyModalTitle}>{selectedHead.name}</Text>
                  {selectedHead.kk_number && (
                    <Text style={styles.familyModalSubtitle}>
                      Nomor KK: {selectedHead.kk_number}
                    </Text>
                  )}
                </View>
                
                {isAdminRT && (
                  <View style={{ flexDirection: 'row', marginRight: 8, alignItems: 'center' }}>
                     <TouchableOpacity onPress={() => handleEditWarga(selectedHead)} style={{ marginRight: 16 }}>
                        <Ionicons name="create-outline" size={22} color={colors.primary} />
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => handleDeleteWarga(selectedHead)} style={{ marginRight: 16 }}>
                        <Ionicons name="trash-outline" size={22} color="#ef4444" />
                     </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity onPress={() => setFamilyModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.familyModalHint}>
                Anggota keluarga yang terdaftar pada Kartu Keluarga ini.
              </Text>

              {familyDetailLoading ? (
                <View style={styles.familyLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <ScrollView style={styles.familyModalBody} showsVerticalScrollIndicator={false}>
                  {selectedHead.family && selectedHead.family.length > 0 ? (
                    selectedHead.family.map(member => (
                      <ProfessionalWargaCard
                        key={member.id}
                        item={member}
                        colors={colors}
                        styles={styles}
                        t={t}
                        language={language}
                        isFamilyView
                        onEdit={isAdminRT ? handleEditWarga : undefined}
                        onDelete={isAdminRT ? handleDeleteWarga : undefined}
                      />
                    ))
                  ) : (
                    <Text style={styles.familyEmptyText}>
                      Belum ada data anggota keluarga.
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}

      {editModalVisible && (
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => {
              if (hasUnsavedChanges) {
                  Alert.alert(
                      "Konfirmasi",
                      "Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?",
                      [
                          { text: "Batal", style: "cancel" },
                          { text: "Ya, Keluar", style: "destructive", onPress: () => setEditModalVisible(false) }
                      ]
                  );
              } else {
                  setEditModalVisible(false);
              }
          }}
        >
          <View style={styles.familyModalOverlay}>
            <View style={[styles.familyModalContent, { backgroundColor: colors.card, height: '90%' }]}>
              {/* Header */}
              <View style={styles.familyModalHeader}>
                <Text style={styles.familyModalTitle}>Edit Warga</Text>
                <TouchableOpacity onPress={() => {
                    if (hasUnsavedChanges) {
                        Alert.alert(
                            "Konfirmasi",
                            "Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?",
                            [
                                { text: "Batal", style: "cancel" },
                                { text: "Ya, Keluar", style: "destructive", onPress: () => setEditModalVisible(false) }
                            ]
                        );
                    } else {
                        setEditModalVisible(false);
                    }
                }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Stepper Header */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  {['Pribadi', 'Pekerjaan', 'Kontak Darurat'].map((step, index) => (
                      <TouchableOpacity 
                          key={index}
                          onPress={() => setActiveStep(index)}
                          style={{ 
                              flex: 1, 
                              paddingVertical: 12, 
                              alignItems: 'center',
                              borderBottomWidth: 2,
                              borderBottomColor: activeStep === index ? colors.primary : 'transparent'
                          }}
                      >
                          <Text style={{ 
                              color: activeStep === index ? colors.primary : colors.textSecondary,
                              fontWeight: activeStep === index ? 'bold' : 'normal'
                          }}>
                              {step}
                          </Text>
                      </TouchableOpacity>
                  ))}
              </View>

              <ScrollView style={{ padding: 16 }}>
                
                {/* Step 1: Informasi Pribadi */}
                {activeStep === 0 && (
                    <View>
                        {/* Photo Upload */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center' }}>
                                <View style={{ 
                                    width: 100, 
                                    height: 100, 
                                    borderRadius: 50, 
                                    backgroundColor: colors.surfaceVariant, 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    overflow: 'hidden',
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}>
                                    {editForm.ktp_image ? (
                                        <Image source={{ uri: editForm.ktp_image.uri }} style={{ width: '100%', height: '100%' }} />
                                    ) : editingWarga?.ktp_image_path ? (
                                        <Image source={{ uri: getStorageUrl(editingWarga.ktp_image_path) || undefined }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <Ionicons name="camera" size={40} color={colors.textSecondary} />
                                    )}
                                </View>
                                <Text style={{ color: colors.primary, marginTop: 8 }}>Ubah Foto KTP/Profil</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Nama Lengkap*</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                            value={editForm.name}
                            onChangeText={(text) => { setEditForm({...editForm, name: text}); setHasUnsavedChanges(true); }}
                          />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>NIK* {editingWarga?.data_verified_at ? '(Terverifikasi)' : ''}</Text>
                          <TextInput
                            style={{ 
                                borderWidth: 1, 
                                borderColor: colors.border, 
                                borderRadius: 8, 
                                padding: 12, 
                                color: editingWarga?.data_verified_at ? colors.textSecondary : colors.text, 
                                fontSize: 16,
                                backgroundColor: editingWarga?.data_verified_at ? colors.surfaceVariant : 'transparent'
                            }}
                            value={editForm.nik}
                            keyboardType="numeric"
                            maxLength={16}
                            editable={!editingWarga?.data_verified_at}
                            onChangeText={(text) => { setEditForm({...editForm, nik: text}); setHasUnsavedChanges(true); }}
                          />
                          {editingWarga?.data_verified_at && (
                              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                  NIK terkunci karena data telah diverifikasi. Hubungi Admin untuk perubahan.
                              </Text>
                          )}
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Nomor KK*</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                            value={editForm.kk_number}
                            keyboardType="numeric"
                            maxLength={16}
                            onChangeText={(text) => { setEditForm({...editForm, kk_number: text}); setHasUnsavedChanges(true); }}
                          />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Tempat Lahir*</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                            value={editForm.place_of_birth}
                            onChangeText={(text) => { setEditForm({...editForm, place_of_birth: text}); setHasUnsavedChanges(true); }}
                          />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Tanggal Lahir*</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setDatePickerMode('edit');
                              setShowDatePicker(true);
                              setHasUnsavedChanges(true);
                            }}
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 }}
                          >
                            <Text style={{ color: editForm.date_of_birth ? colors.text : colors.textSecondary, fontSize: 16 }}>
                              {editForm.date_of_birth ? formatDate(editForm.date_of_birth, language) : 'Pilih Tanggal'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Jenis Kelamin</Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            {['L', 'P'].map((g) => (
                              <TouchableOpacity
                                key={g}
                                onPress={() => { setEditForm({...editForm, gender: g}); setHasUnsavedChanges(true); }}
                                style={{
                                  flex: 1,
                                  padding: 12,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: editForm.gender === g ? colors.primary : colors.border,
                                  backgroundColor: editForm.gender === g ? colors.primary + '20' : 'transparent',
                                  alignItems: 'center'
                                }}
                              >
                                <Text style={{ color: editForm.gender === g ? colors.primary : colors.text, fontWeight: '600' }}>
                                  {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                    </View>
                )}

                {/* Step 2: Pendidikan & Pekerjaan */}
                {activeStep === 1 && (
                    <View>
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Pekerjaan</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                            value={editForm.occupation}
                            onChangeText={(text) => { setEditForm({...editForm, occupation: text}); setHasUnsavedChanges(true); }}
                          />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Agama</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {[
                              { label: 'Islam', value: 'ISLAM' },
                              { label: 'Kristen', value: 'KRISTEN' },
                              { label: 'Katolik', value: 'KATOLIK' },
                              { label: 'Hindu', value: 'HINDU' },
                              { label: 'Buddha', value: 'BUDDHA' },
                              { label: 'Khonghucu', value: 'KHONGHUCU' }
                            ].map((r) => (
                              <TouchableOpacity
                                key={r.value}
                                onPress={() => { setEditForm({...editForm, religion: r.value}); setHasUnsavedChanges(true); }}
                                style={{
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 20,
                                  backgroundColor: editForm.religion === r.value ? colors.primary : colors.card,
                                  marginRight: 8,
                                  borderWidth: 1,
                                  borderColor: editForm.religion === r.value ? colors.primary : colors.border
                                }}
                              >
                                <Text style={{ color: editForm.religion === r.value ? '#fff' : colors.text, fontSize: 12 }}>{r.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        <View style={{ marginBottom: 24 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Status Perkawinan</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {[
                              { label: 'Kawin', value: 'Kawin' },
                              { label: 'Belum Kawin', value: 'Belum Kawin' },
                              { label: 'Cerai Hidup', value: 'Cerai Hidup' },
                              { label: 'Cerai Mati', value: 'Cerai Mati' }
                            ].map((s) => (
                              <TouchableOpacity
                                key={s.value}
                                onPress={() => { setEditForm({...editForm, marital_status: s.value}); setHasUnsavedChanges(true); }}
                                style={{
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 20,
                                  backgroundColor: editForm.marital_status === s.value ? colors.primary : colors.card,
                                  marginRight: 8,
                                  borderWidth: 1,
                                  borderColor: editForm.marital_status === s.value ? colors.primary : colors.border
                                }}
                              >
                                <Text style={{ color: editForm.marital_status === s.value ? '#fff' : colors.text, fontSize: 12 }}>{s.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Status Hubungan Dalam Keluarga</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {[
                              { label: 'Kepala Keluarga', value: 'KEPALA_KELUARGA' },
                              { label: 'Istri', value: 'ISTRI' },
                              { label: 'Anak', value: 'ANAK' },
                              { label: 'Famili Lain', value: 'FAMILI_LAIN' }
                            ].map((s) => (
                              <TouchableOpacity
                                key={s.value}
                                onPress={() => { setEditForm({...editForm, status_in_family: s.value}); setHasUnsavedChanges(true); }}
                                style={{
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 20,
                                  backgroundColor: editForm.status_in_family === s.value ? colors.primary : colors.card,
                                  marginRight: 8,
                                  borderWidth: 1,
                                  borderColor: editForm.status_in_family === s.value ? colors.primary : colors.border
                                }}
                              >
                                <Text style={{ color: editForm.status_in_family === s.value ? '#fff' : colors.text, fontSize: 12 }}>{s.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                    </View>
                )}

                {/* Step 3: Kontak & Alamat */}
                {activeStep === 2 && (
                    <View>
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Nomor Telepon</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                            value={editForm.phone}
                            keyboardType="phone-pad"
                            placeholder="628..."
                            placeholderTextColor={colors.textSecondary}
                            maxLength={15}
                            onChangeText={(text) => {
                              let val = text;
                              if (val.startsWith('0')) val = '62' + val.substring(1);
                              setEditForm({...editForm, phone: val});
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Alamat Jalan</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                            value={editForm.address}
                            onChangeText={(text) => { setEditForm({...editForm, address: text}); setHasUnsavedChanges(true); }}
                            placeholder="Nama Jalan / Gang"
                            placeholderTextColor={colors.textSecondary}
                          />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Blok</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                            value={editForm.block}
                            onChangeText={(text) => { setEditForm({...editForm, block: text}); setHasUnsavedChanges(true); }}
                            maxLength={10}
                            placeholder="Blok / Nomor Rumah"
                            placeholderTextColor={colors.textSecondary}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>RT*</Text>
                            <TextInput
                              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                              value={editForm.address_rt}
                              keyboardType="numeric"
                              maxLength={3}
                              onChangeText={(text) => { setEditForm({...editForm, address_rt: text}); setHasUnsavedChanges(true); }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>RW*</Text>
                            <TextInput
                              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                              value={editForm.address_rw}
                              keyboardType="numeric"
                              maxLength={3}
                              onChangeText={(text) => { setEditForm({...editForm, address_rw: text}); setHasUnsavedChanges(true); }}
                            />
                          </View>
                        </View>
                    </View>
                )}

                {/* Footer Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40, marginTop: 20 }}>
                    {activeStep > 0 && (
                        <TouchableOpacity
                            onPress={() => setActiveStep(activeStep - 1)}
                            style={{
                                flex: 1,
                                padding: 16,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>Kembali</Text>
                        </TouchableOpacity>
                    )}
                    
                    {activeStep < 2 ? (
                        <TouchableOpacity
                            onPress={() => setActiveStep(activeStep + 1)}
                            style={{
                                flex: 1,
                                backgroundColor: colors.primary,
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lanjut</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                          onPress={saveEditWarga}
                          disabled={isSaving}
                          style={{
                            flex: 1,
                            backgroundColor: colors.primary,
                            padding: 16,
                            borderRadius: 12,
                            alignItems: 'center'
                          }}
                        >
                          {isSaving ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Simpan</Text>
                          )}
                        </TouchableOpacity>
                    )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Create Modal */}
      {createModalVisible && (
        <Modal
          visible={createModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <View style={styles.familyModalOverlay}>
            <View style={[styles.familyModalContent, { backgroundColor: colors.card, height: '90%' }]}>
              <View style={styles.familyModalHeader}>
                <Text style={styles.familyModalTitle}>Tambah Warga</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Nama Lengkap*</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.name}
                    onChangeText={(text) => setCreateForm({...createForm, name: text})}
                    placeholder="Nama Lengkap"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>NIK*</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.nik}
                    keyboardType="numeric"
                    maxLength={16}
                    onChangeText={(text) => setCreateForm({...createForm, nik: text})}
                    placeholder="16 digit NIK"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Nomor KK*</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.kk_number}
                    keyboardType="numeric"
                    maxLength={16}
                    onChangeText={(text) => setCreateForm({...createForm, kk_number: text})}
                    placeholder="16 digit No KK"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Nomor Telepon</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.phone}
                    keyboardType="phone-pad"
                    maxLength={15}
                    onChangeText={(text) => setCreateForm({...createForm, phone: text})}
                    placeholder="08..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Pekerjaan</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.occupation}
                    onChangeText={(text) => setCreateForm({...createForm, occupation: text})}
                    placeholder="Pekerjaan"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Alamat Jalan</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.address}
                    onChangeText={(text) => setCreateForm({...createForm, address: text})}
                    placeholder="Nama Jalan / Gang"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Blok</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.block}
                    onChangeText={(text) => setCreateForm({...createForm, block: text})}
                    maxLength={10}
                    placeholder="Blok / Nomor Rumah"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                 <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>RT*</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                      value={createForm.address_rt}
                      keyboardType="numeric"
                      maxLength={3}
                      onChangeText={(text) => setCreateForm({...createForm, address_rt: text})}
                      placeholder="001"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>RW*</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                      value={createForm.address_rw}
                      keyboardType="numeric"
                      maxLength={3}
                      onChangeText={(text) => setCreateForm({...createForm, address_rw: text})}
                      placeholder="001"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Tempat Lahir*</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 }}
                    value={createForm.place_of_birth}
                    onChangeText={(text) => setCreateForm({...createForm, place_of_birth: text})}
                    placeholder="Kota Lahir"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Tanggal Lahir*</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setDatePickerMode('create');
                      setShowDatePicker(true);
                    }}
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 }}
                  >
                    <Text style={{ color: createForm.date_of_birth ? colors.text : colors.textSecondary, fontSize: 16 }}>
                      {createForm.date_of_birth ? formatDate(createForm.date_of_birth, language) : 'Pilih Tanggal'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Jenis Kelamin</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {['L', 'P'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setCreateForm({...createForm, gender: g})}
                        style={{
                          flex: 1,
                          padding: 12,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: createForm.gender === g ? colors.primary : colors.border,
                          backgroundColor: createForm.gender === g ? colors.primary + '20' : 'transparent',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: createForm.gender === g ? colors.primary : colors.text, fontWeight: '600' }}>
                          {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Agama</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                      { label: 'Islam', value: 'ISLAM' },
                      { label: 'Kristen', value: 'KRISTEN' },
                      { label: 'Katolik', value: 'KATOLIK' },
                      { label: 'Hindu', value: 'HINDU' },
                      { label: 'Buddha', value: 'BUDDHA' },
                      { label: 'Khonghucu', value: 'KHONGHUCU' }
                    ].map((r) => (
                      <TouchableOpacity
                        key={r.value}
                        onPress={() => setCreateForm({...createForm, religion: r.value})}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: createForm.religion === r.value ? colors.primary : colors.card,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: createForm.religion === r.value ? colors.primary : colors.border
                        }}
                      >
                        <Text style={{ color: createForm.religion === r.value ? '#fff' : colors.text, fontSize: 12 }}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Status Hubungan Dalam Keluarga</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                      { label: 'Kepala Keluarga', value: 'KEPALA_KELUARGA' },
                      { label: 'Istri', value: 'ISTRI' },
                      { label: 'Anak', value: 'ANAK' },
                      { label: 'Famili Lain', value: 'FAMILI_LAIN' }
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.value}
                        onPress={() => setCreateForm({...createForm, status_in_family: s.value})}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: createForm.status_in_family === s.value ? colors.primary : colors.card,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: createForm.status_in_family === s.value ? colors.primary : colors.border
                        }}
                      >
                        <Text style={{ color: createForm.status_in_family === s.value ? '#fff' : colors.text, fontSize: 12 }}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Status Perkawinan</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                      { label: 'Kawin', value: 'Kawin' },
                      { label: 'Belum Kawin', value: 'Belum Kawin' },
                      { label: 'Cerai Hidup', value: 'Cerai Hidup' },
                      { label: 'Cerai Mati', value: 'Cerai Mati' }
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.value}
                        onPress={() => setCreateForm({...createForm, marital_status: s.value})}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: createForm.marital_status === s.value ? colors.primary : colors.card,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: createForm.marital_status === s.value ? colors.primary : colors.border
                        }}
                      >
                        <Text style={{ color: createForm.marital_status === s.value ? '#fff' : colors.text, fontSize: 12 }}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  onPress={handleCreateWarga}
                  disabled={isSaving}
                  style={{
                    backgroundColor: colors.primary,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    marginBottom: 40
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Simpan Data</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={
             (datePickerMode === 'create' && createForm.date_of_birth ? new Date(createForm.date_of_birth) : 
             (datePickerMode === 'edit' && editForm.date_of_birth ? new Date(editForm.date_of_birth) : new Date()))
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* FAB for Admin */}
      {isAdminRT && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: colors.primary, // Fallback
  },
  headerGradient: {
    paddingBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerTitleRow: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabText: {
    color: isDarkMode ? '#059669' : '#047857',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  cardBody: {
    padding: 16,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  familyModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  familyModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  familyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  familyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  familyModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  familyModalHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  familyModalBody: {
    marginTop: 4,
  },
  familyLoadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyEmptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#059669',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
