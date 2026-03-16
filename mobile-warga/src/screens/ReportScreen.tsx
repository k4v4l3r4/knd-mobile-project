import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ListRenderItem
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api, { getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import Dropdown from '../components/Dropdown';
import { ImagePickerModal } from '../components/ImagePickerModal';

// --- Types ---
interface User {
  id: number;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
}

interface Report {
  id: number;
  user_id: number;
  rt_id?: number;
  title: string;
  description: string;
  category: string;
  status: 'PENDING' | 'PROCESS' | 'RESOLVED' | 'REJECTED' | 'PROCESSED' | 'DONE';
  photo_url?: string;
  created_at: string;
  updated_at: string;
  user?: User | null; // User can be null if deleted
}

type TabType = 'create' | 'list';
type FilterStatus = 'ALL' | 'PENDING' | 'PROCESS' | 'RESOLVED' | 'REJECTED';

const CATEGORY_OPTIONS = [
  { value: 'Keamanan', labelKey: 'report.categories.security' },
  { value: 'Kebersihan', labelKey: 'report.categories.cleanliness' },
  { value: 'Infrastruktur', labelKey: 'report.categories.infrastructure' },
  { value: 'Lainnya', labelKey: 'report.categories.other' },
];

class ScreenErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    colors: ThemeColors;
    onRetry: () => void;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.log('ReportScreen ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: this.props.colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={56} color={this.props.colors.textSecondary} />
          <Text style={{ marginTop: 12, fontSize: 18, fontWeight: '700', color: this.props.colors.text, textAlign: 'center' }}>
            Halaman Laporan bermasalah
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: this.props.colors.textSecondary, textAlign: 'center' }}>
            Coba muat ulang. Jika masih terjadi, mohon kirimkan log.
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
            style={{ marginTop: 16, backgroundColor: this.props.colors.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Muat Ulang</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ReportScreen() {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Keamanan');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // List State
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  // User Context
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRtId, setUserRtId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('create');

  const runDiagnostics = async () => {
    const logs: string[] = [];
    try {
      const r1 = await api.get('/health');
      logs.push(`GET /health: ${r1.status}`);
    } catch (e: any) {
      if (e?.response) {
        logs.push(`GET /health: ${e.response.status}`);
      } else {
        logs.push(`GET /health: ${e?.message || 'Network Error'}`);
      }
    }
    try {
      await api.post('/health', {});
    } catch (e: any) {
      if (e?.response) {
        logs.push(`POST /health: ${e.response.status}`);
      } else {
        logs.push(`POST /health: ${e?.message || 'Network Error'}`);
      }
    }
    try {
      await api.post('/reports', { title: 'DIAG', description: '', category: 'OTHER' });
    } catch (e: any) {
      if (e?.response) {
        logs.push(`POST /reports: ${e.response.status}`);
      } else {
        logs.push(`POST /reports: ${e?.message || 'Network Error'}`);
      }
    }
    Alert.alert('Diagnostic', logs.join('\n'));
  };
  // --- Effects ---

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Reload reports when tab changes to list or filter changes
  useEffect(() => {
    if (activeTab === 'list') {
      fetchReports();
    }
  }, [activeTab, statusFilter]);

  // --- API Calls ---

  const fetchProfile = async () => {
    try {
      const response = await api.get('/me');
      const data = response.data?.data;
      if (data) {
        setUserRole(data.role);
        setUserRtId(data.rt_id);
        setUserId(data.id);
        
        // Auto-switch to list for admins
        if (data.role && ['ADMIN_RT', 'RT'].includes(data.role.toUpperCase())) {
          setActiveTab('list');
        }
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const fetchReports = async () => {
    try {
      if (!refreshing) setLoading(true); // Don't show full loader on refresh
      
      let url = '/reports';
      if (statusFilter !== 'ALL') {
        url += `?status=${statusFilter}`;
      }
      
      console.log('Fetching reports:', url);
      const response = await api.get(url);
      const payload = response.data?.data;
      const list = Array.isArray(payload) ? payload : payload?.data;
      console.log('Reports data received:', Array.isArray(list) ? list.length : 0);

      if (Array.isArray(list)) {
        setReports(list);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert(t('common.error'), t('report.loadFailed'));
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpired'));
      return;
    }

    let confirmMsg = t('report.confirmStatusUpdate');
    if (newStatus === 'PROCESSED') confirmMsg = 'Setujui laporan ini?';
    if (newStatus === 'DONE') confirmMsg = 'Tandai laporan ini sebagai selesai?';
    if (newStatus === 'REJECTED') confirmMsg = 'Tolak laporan ini?';

    Alert.alert(
      t('common.confirm'),
      confirmMsg,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: async () => {
            setLoading(true);
            try {
              // Use PATCH for status update as requested
              await api.patch(`/reports/${id}/status`, { status: newStatus });
              Alert.alert(t('common.success'), t('report.statusUpdated'));
              fetchReports();
            } catch (error: any) {
              console.error('Error updating status:', error);
              Alert.alert(t('common.error'), error.response?.data?.message || t('report.updateFailed'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteReport = async (id: number) => {
    Alert.alert(
      t('common.confirm'),
      t('report.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete(`/reports/${id}`);
              Alert.alert(t('common.success'), t('report.deletedSuccess'));
              fetchReports();
            } catch (error: any) {
              console.error('Error deleting report:', error);
              Alert.alert(t('common.error'), t('report.deleteFailed') || 'Gagal menghapus laporan');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const processSubmit = async () => {
     if (isDemo) {
      Alert.alert(t('common.demoMode'), t('report.demoMode'));
      return;
    }
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpired'));
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert(t('common.error'), t('report.validationError'));
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      
      // SMART SUBMIT: Use JSON for text-only, FormData for photos
      if (!photo) {
          // JSON Submission (Faster, less error-prone)
          const payload = {
              title: title.trim(),
              description: description.trim(),
              category: category,
              rt_id: userRtId ? userRtId.toString() : undefined
          };
          console.log('Submitting Report (JSON)...', payload);
          response = await api.post('/reports', payload);
      } else {
          // FormData Submission (Only when photo exists)
          const formData = new FormData();
          formData.append('title', title.trim());
          formData.append('description', description.trim());
          formData.append('category', category);
          if (userRtId) formData.append('rt_id', userRtId.toString());

          const filename = photo.split('/').pop() || 'photo.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          
          const photoData = {
            uri: Platform.OS === 'android' ? photo : photo.replace('file://', ''),
            name: filename,
            type: type
          };
          
          // @ts-ignore
          formData.append('photo', photoData);
          
          console.log('Submitting Report (FormData)...');
          response = await api.post('/reports', formData, {
              headers: {
                  'Content-Type': 'multipart/form-data',
              },
          });
      }

      if (response.data?.success || response.status === 201 || response.status === 200) {
        setTitle('');
        setDescription('');
        setPhoto(null);
        Alert.alert(t('report.successTitle'), t('report.successMsg'), [{ text: t('common.ok') }]);
        
        // Switch to list tab to see the new report
        setActiveTab('list');
        fetchReports();
      } else {
        throw new Error(response.data?.message || 'Failed');
      }

    } catch (error: any) {
      console.error('Report submit error:', error);
      const msg = error.response?.data?.message || error.message || t('report.failedMsg');
      Alert.alert(t('common.failed'), msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- UI Helpers ---

  const pickImage = async (mode: 'camera' | 'gallery') => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.3, // Aggressive compression
        aspect: [4, 3],
      };

      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.imagePicker.permissionDenied'), t('common.imagePicker.cameraPermission'));
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.imagePicker.permissionDenied'), t('common.imagePicker.galleryPermission'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Double Compression to avoid Network Error
        const originalUri = result.assets[0].uri;
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                originalUri,
                [{ resize: { width: 800 } }], // Resize to max 800px width
                { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
            );
            setPhoto(manipResult.uri);
        } catch (manipError) {
            console.log('Compression error:', manipError);
            setPhoto(originalUri); // Fallback
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert(t('common.error'), t('market.createStore.pickImageError'));
    }
  };

  const showImagePickerOptions = () => {
    setImagePickerVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b'; // Amber
      case 'PROCESS': return '#3b82f6'; // Blue
      case 'PROCESSED': return '#3b82f6'; // Blue (legacy)
      case 'RESOLVED': return '#10b981'; // Emerald
      case 'DONE': return '#10b981'; // Emerald (legacy)
      case 'REJECTED': return '#ef4444'; // Red
      default: return '#64748b'; // Slate
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return t('report.status.pending') || 'Menunggu';
      case 'PROCESS': return t('report.status.processed') || 'Diproses';
      case 'PROCESSED': return t('report.status.processed') || 'Diproses';
      case 'RESOLVED': return t('report.status.done') || 'Selesai';
      case 'DONE': return t('report.status.done') || 'Selesai';
      case 'REJECTED': return t('report.status.rejected') || 'Ditolak';
      default: return status;
    }
  };

  // --- Renderers ---

  const renderReportItem: ListRenderItem<Report> = ({ item }) => {
    if (!item) return null;

    // Safe accessors
    const userName = item.user?.name || 'Warga';
    const userInitial = userName.charAt(0).toUpperCase();
    const statusColor = getStatusColor(item.status);
    
    // Date formatting
    let dateString = '-';
    try {
        if (item.created_at) {
            dateString = new Date(item.created_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        }
    } catch (e) { dateString = '-'; }

    // Admin Actions Check
    const isAdmin = userRole && ['ADMIN_RT', 'RT'].includes(userRole.toUpperCase());
    const isOwner = userId && item.user_id === userId;
    
    return (
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reporterInfo}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
               <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reporterName} numberOfLines={1}>{userName}</Text>
              <Text style={styles.reportDate}>{dateString} • {item.category}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportDescription}>{item.description}</Text>
        
        {(() => {
          const uri = item.photo_url ? getStorageUrl(item.photo_url) : null;
          if (!uri) return null;
          return <Image source={{ uri }} style={styles.reportImage} resizeMode="cover" />;
        })()}

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.actionButtons}>
            {item.status === 'PENDING' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                  onPress={() => handleUpdateStatus(item.id, 'PROCESS')}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.actionButtonText}>Setujui</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                  onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.actionButtonText}>Tolak</Text>
                </TouchableOpacity>
              </>
            )}
            {(item.status === 'PROCESS' || item.status === 'PROCESSED') && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                onPress={() => handleUpdateStatus(item.id, 'RESOLVED')}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.actionButtonText}>Selesai</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Owner Actions (Delete Pending) */}
        {isOwner && item.status === 'PENDING' && !isAdmin && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
              onPress={() => handleDeleteReport(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderCreateForm = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <View style={styles.iconCircle}>
                <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{t('report.form.header')}</Text>
                <Text style={styles.sectionSubtitle}>{t('report.form.subHeader')}</Text>
             </View>
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label={t('report.form.category')}
              data={CATEGORY_OPTIONS.map(cat => ({
                label: t(cat.labelKey),
                value: cat.value
              }))}
              value={category}
              onSelect={(val) => setCategory(val as string)}
              placeholder={t('report.form.categoryPlaceholder') || 'Pilih Kategori'}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('report.form.title')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('report.form.titlePlaceholder')}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('report.form.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('report.form.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('report.form.photo')}</Text>
            <TouchableOpacity style={styles.photoButton} onPress={showImagePickerOptions} activeOpacity={0.7}>
              {photo ? (
                <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Image source={{ uri: photo }} style={styles.previewImage} />
                    <View style={styles.changePhotoOverlay}>
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={{ color: '#fff', marginLeft: 4, fontWeight: '600' }}>Ubah</Text>
                    </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                  <Text style={styles.uploadText}>{t('report.form.uploadText')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={processSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton, 
              { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }
            ]}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{t('report.submit')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={runDiagnostics}
            style={{ marginTop: 12, alignItems: 'center' }}
            activeOpacity={0.8}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Diagnose Koneksi</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderList = () => (
    <View style={{ flex: 1 }}>
      {/* Filters */}
      <View style={{ paddingVertical: 12, backgroundColor: colors.background, marginTop: 32 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {(['ALL', 'PENDING', 'PROCESS', 'RESOLVED', 'REJECTED'] as FilterStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && { backgroundColor: colors.primary },
                statusFilter !== status && { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderWidth: 1, borderColor: colors.border }
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterText,
                statusFilter === status ? { color: '#fff', fontWeight: '600' } : { color: colors.textSecondary }
              ]}>
                {status === 'ALL' ? t('report.filter.all') : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Memuat laporan...</Text>
        </View>
      ) : (
        <FlatList
          data={reports || []}
          renderItem={renderReportItem}
          keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateTitle}>Belum ada laporan</Text>
              <Text style={styles.emptyStateSubtitle}>
                {statusFilter === 'ALL' 
                  ? 'Laporan yang Anda buat atau terima akan muncul di sini.' 
                  : `Tidak ada laporan dengan status ${getStatusLabel(statusFilter)}.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  return (
    <ScreenErrorBoundary
      colors={colors}
      onRetry={() => {
        fetchProfile();
        if (activeTab === 'list') {
          fetchReports();
        }
      }}
    >
      <View style={styles.container}>
        <View style={[styles.headerBackground, { backgroundColor: isDarkMode ? '#059669' : '#047857' }]}>
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.headerRow}>
              <View style={{ width: 40 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.headerTitle}>{t('home.menus.report') || 'Laporan Warga'}</Text>
                <DemoLabel />
              </View>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
                onPress={() => setActiveTab('create')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
                  {t('report.tabs.create') || 'Buat Laporan'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
                onPress={() => setActiveTab('list')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
                  {t('report.tabs.list') || 'Daftar Laporan'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {activeTab === 'create' ? renderCreateForm() : renderList()}

        <ImagePickerModal
          visible={imagePickerVisible}
          onClose={() => setImagePickerVisible(false)}
          onCamera={() => pickImage('camera')}
          onGallery={() => pickImage('gallery')}
        />
      </View>
    </ScreenErrorBoundary>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackground: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: -16,
    zIndex: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingTop: 32,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderColor: colors.border,
    color: colors.text,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    paddingBottom: 12,
  },
  photoButton: {
    height: 180,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderColor: colors.border,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 0,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reportCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  reporterName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reportDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  reportDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 20,
  },
});
