import React, { useState, useEffect } from 'react';
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
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';

const CATEGORY_OPTIONS = [
  { value: 'Keamanan', labelKey: 'report.categories.security' },
  { value: 'Kebersihan', labelKey: 'report.categories.cleanliness' },
  { value: 'Infrastruktur', labelKey: 'report.categories.infrastructure' },
  { value: 'Lainnya', labelKey: 'report.categories.other' },
];

export default function ReportScreen() {
  const { colors, isDarkMode, setTheme } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Keamanan');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New States for Admin Features
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PROCESSED' | 'DONE' | 'REJECTED'>('ALL');

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchReports();
    }
  }, [activeTab, statusFilter]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/me');
      const role = response.data.data.role;
      setUserRole(role);
      if (role && (role.toUpperCase() === 'ADMIN_RT' || role.toUpperCase() === 'RT')) {
        setActiveTab('list');
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = '/reports';
      if (statusFilter !== 'ALL') {
        url += `?status=${statusFilter}`;
      }
      const response = await api.get(url);
      setReports(response.data.data);
    } catch (error) {
      console.log('Error fetching reports:', error);
      Alert.alert(t('common.error'), t('report.loadFailed'));
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
    try {
      let confirmMsg = t('report.confirmStatusUpdate');
      if (newStatus === 'PROCESSED') confirmMsg = 'Proses laporan ini?';
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
                await api.put(`/reports/${id}`, { status: newStatus });
                Alert.alert(t('common.success'), t('report.statusUpdated'));
                fetchReports();
              } catch (error: any) {
                console.log('Error updating status API:', error);
                Alert.alert(t('common.error'), error.response?.data?.message || t('report.updateFailed'));
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.log('Error updating status:', error);
      Alert.alert(t('common.error'), t('report.updateFailed'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'PROCESSED': 
      case 'PROCESS': return '#3b82f6';
      case 'DONE': 
      case 'RESOLVED': return '#10b981';
      case 'REJECTED': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return t('report.status.pending');
      case 'PROCESSED': 
      case 'PROCESS': return t('report.status.processed');
      case 'DONE': 
      case 'RESOLVED': return t('report.status.done');
      case 'REJECTED': return t('report.status.rejected');
      default: return status;
    }
  };

  const renderReportItem = ({ item }: { item: any }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reporterInfo}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
             <Text style={styles.avatarText}>{item.user?.name?.charAt(0) || '?'}</Text>
          </View>
          <View>
            <Text style={styles.reporterName}>{item.user?.name || 'Warga'}</Text>
            <Text style={styles.reportDate}>{new Date(item.created_at).toLocaleDateString('id-ID')}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.reportTitle}>{item.title}</Text>
      <Text style={styles.reportDescription}>{item.description}</Text>
      
      {item.photo_url && (
        <Image source={{ uri: item.photo_url }} style={styles.reportImage} />
      )}

      {/* Admin Actions */}
      {(userRole && (userRole.toUpperCase() === 'ADMIN_RT' || userRole.toUpperCase() === 'RT')) && (
        <View style={styles.actionButtons}>
          {item.status === 'PENDING' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                onPress={() => handleUpdateStatus(item.id, 'PROCESSED')}
              >
                <Text style={styles.actionButtonText}>Proses</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
              >
                <Text style={styles.actionButtonText}>Tolak</Text>
              </TouchableOpacity>
            </>
          )}
          {(item.status === 'PROCESS' || item.status === 'PROCESSED') && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#10b981' }]}
              onPress={() => handleUpdateStatus(item.id, 'DONE')}
            >
              <Text style={styles.actionButtonText}>Selesai</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const pickImage = async (mode: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (mode === 'camera') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert(t('common.imagePicker.permissionDenied'), t('common.imagePicker.cameraPermission'));
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.5,
          aspect: [4, 3],
        });
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert(t('common.imagePicker.permissionDenied'), t('common.imagePicker.galleryPermission'));
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.5,
          aspect: [4, 3],
        });
      }

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert(t('common.error'), t('market.createStore.pickImageError'));
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      t('common.imagePicker.title'),
      t('common.imagePicker.subtitle'),
      [
        {
          text: t('common.imagePicker.camera'),
          onPress: () => pickImage('camera')
        },
        {
          text: t('common.imagePicker.gallery'),
          onPress: () => pickImage('gallery')
        },
        {
          text: t('common.imagePicker.cancel'),
          style: "cancel"
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('report.demoMode'));
      return;
    }
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpired'));
      return;
    }

    if (!title || !description) {
      Alert.alert(t('common.error'), t('report.validationError'));
      return;
    }

    setIsSubmitting(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);

      if (photo) {
        const filename = photo.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // @ts-ignore
        formData.append('photo', {
          uri: photo,
          name: filename,
          type: type,
        });
      }

      const response = await api.post('/reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = response.data;

      if (responseData.success) {
        setTitle('');
        setDescription('');
        setPhoto(null);
        
        Alert.alert(
          t('report.successTitle'), 
          t('report.successMsg'),
          [{ text: t('common.ok') }]
        );
      } else {
        Alert.alert(t('common.failed'), responseData.message || t('report.failedMsg'));
      }
    } catch (error: any) {
      console.error('Report error:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert(t('report.timeout'), t('report.timeoutMsg'));
      } else {
        Alert.alert(t('common.failed'), t('report.failedMsg'));
      }
    } finally {
      setIsSubmitting(false);
      clearTimeout(timeoutId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Linear Gradient */}
      <View
        style={[
          styles.headerBackground,
          { backgroundColor: isDarkMode ? '#059669' : '#047857' }
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>
                {activeTab === 'create' ? t('report.createTitle') : t('report.listTitle')}
              </Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Admin Tabs */}
          {(userRole && (userRole.toUpperCase() === 'ADMIN_RT' || userRole.toUpperCase() === 'RT')) && (
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
                onPress={() => setActiveTab('create')}
              >
                <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
                  {t('report.createTitle')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
                onPress={() => setActiveTab('list')}
              >
                <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
                  {t('report.listTitle')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>

      {activeTab === 'create' ? (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Main Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                 <View style={styles.iconCircle}>
                    <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
                 </View>
                 <View>
                    <Text style={styles.sectionTitle}>{t('report.form.header')}</Text>
                    <Text style={styles.sectionSubtitle}>{t('report.form.subHeader')}</Text>
                 </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('report.form.category')}</Text>
                <View style={styles.categoryContainer}>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        category === cat.value && styles.categoryChipActive,
                        { paddingVertical: 8, paddingHorizontal: 16 }
                      ]}
                      onPress={() => setCategory(cat.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.categoryText,
                        category === cat.value && styles.categoryTextActive
                      ]}>
                        {t(cat.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                    <Image source={{ uri: photo }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={colors.primary} />
                      <Text style={styles.uploadText}>{t('report.form.uploadText')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={[
                  styles.submitButton, 
                  { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1, marginTop: 10, borderRadius: 16 }
                ]}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('report.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Filters */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, backgroundColor: colors.background }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {['ALL', 'PENDING', 'PROCESSED', 'DONE', 'REJECTED'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    statusFilter === status && styles.filterChipActive,
                    { backgroundColor: statusFilter === status ? colors.primary : (isDarkMode ? '#1e293b' : '#f1f5f9') }
                  ]}
                  onPress={() => setStatusFilter(status as any)}
                >
                  <Text style={[
                    styles.filterText,
                    statusFilter === status && styles.filterTextActive,
                    { color: statusFilter === status ? '#fff' : colors.textSecondary }
                  ]}>
                    {status === 'ALL' ? t('report.filter.all') : getStatusLabel(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={reports}
              renderItem={renderReportItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>{t('report.loadFailed') || 'Tidak ada laporan'}</Text>
                </View>
              }
            />
          )}
        </View>
      )}
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
  content: {
    padding: 16,
    paddingTop: 20, // Add padding to separate from header overlap if needed, or just standard padding
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    marginTop: -40, // Overlap header slightly
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
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.1)' : '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
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
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  categoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  photoButton: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 14,
  },
  submitButtonWrapper: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Admin List Styles
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.8,
  },
  tabTextActive: {
    color: '#059669',
    opacity: 1,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    fontWeight: '700',
  },
  reportCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
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
    gap: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  reporterName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  reportDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#334155' : '#f1f5f9',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});