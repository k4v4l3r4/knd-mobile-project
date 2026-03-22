import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, StatusBar, Platform, TouchableOpacity, Alert, TextInput, Switch, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import api, { BASE_URL, getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CctvData {
  id: number;
  label: string;
  stream_url: string;
  location?: string;
  is_active: boolean;
}

interface CameraFormData {
  label: string;
  stream_url: string;
  location: string;
  is_active: boolean;
}

interface Props {
}

export default function CctvScreen() {
  const { colors, isDarkMode, setTheme } = useTheme();
  const { isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [cctvs, setCctvs] = useState<CctvData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CctvData | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{label?: string; url?: string; location?: string}>({});

  useEffect(() => {
    checkRoleAccess();
  }, []);

  const checkRoleAccess = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        // Only allow RT Admin, RT, or Super Admin roles
        const allowedRoles = ['ADMIN_RT', 'RT', 'admin_rt', 'super_admin', 'SUPER_ADMIN'];
        setHasAccess(allowedRoles.includes(user.role));
        setUserRole(user.role || '');
      }
    } catch (e) {
      console.error('Failed to check role access:', e);
      setHasAccess(false);
    }
  };

  const fetchCctvs = async () => {
    try {
      const response = await api.get('/cctvs');
      if (response.data.success) {
        setCctvs(response.data.data.filter((c: CctvData) => c.is_active));
      }
    } catch (error) {
      console.error('Error fetching CCTVs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCctvs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCctvs();
  };

  // Check if user can edit (RT/Admin roles only)
  const canEdit = useMemo(() => {
    const allowedRoles = ['ADMIN_RT', 'RT', 'admin_rt', 'super_admin', 'SUPER_ADMIN'];
    return allowedRoles.includes(userRole.toUpperCase());
  }, [userRole]);

  // Form Handlers
  const handleOpenForm = (camera?: CctvData) => {
    if (camera) {
      setEditingCamera(camera);
      setFormLabel(camera.label);
      setFormUrl(camera.stream_url);
      setFormLocation(camera.location || '');
      setFormIsActive(camera.is_active);
    } else {
      setEditingCamera(null);
      setFormLabel('');
      setFormUrl('');
      setFormLocation('');
      setFormIsActive(true);
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCamera(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: {label?: string; url?: string; location?: string} = {};

    if (!formLabel.trim()) {
      newErrors.label = 'Label wajib diisi';
    } else if (formLabel.length < 3) {
      newErrors.label = 'Label minimal 3 karakter';
    }

    if (!formUrl.trim()) {
      newErrors.url = 'URL stream wajib diisi';
    } else {
      const urlPattern = /^(https?:\/\/)?([\ da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(formUrl)) {
        newErrors.url = 'Format URL tidak valid (harus http:// atau https://)';
      }
    }

    if (!formLocation.trim()) {
      newErrors.location = 'Lokasi wajib diisi';
    } else if (formLocation.length < 3) {
      newErrors.location = 'Lokasi minimal 3 karakter';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Mohon perbaiki kesalahan pada form');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        label: formLabel.trim(),
        stream_url: formUrl.trim(),
        location: formLocation.trim(),
        is_active: formIsActive,
      };

      if (editingCamera) {
        // Update existing camera
        await api.put(`/cctv-cameras/${editingCamera.id}`, payload);
        Alert.alert('Sukses', 'CCTV berhasil diupdate', [
          { text: 'OK', onPress: () => handleCloseForm() },
        ]);
      } else {
        // Create new camera
        await api.post('/cctv-cameras', payload);
        Alert.alert('Sukses', 'CCTV berhasil ditambahkan', [
          { text: 'OK', onPress: () => handleCloseForm() },
        ]);
      }

      // Refresh the list immediately
      fetchCctvs();
    } catch (error: any) {
      console.error('Error saving camera:', error);
      const message = error.response?.data?.message || 'Gagal menyimpan data CCTV';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (camera: CctvData) => {
    Alert.alert(
      'Hapus CCTV',
      `Apakah Anda yakin ingin menghapus CCTV "${camera.label}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await api.delete(`/cctv-cameras/${camera.id}`);
              Alert.alert('Sukses', 'CCTV berhasil dihapus');
              fetchCctvs();
            } catch (error: any) {
              Alert.alert('Error', 'Gagal menghapus CCTV');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: CctvData }) => {
    const videoRef = useRef<Video>(null);
    
    return (
      <View style={styles.card}>
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: item.stream_url }}
            useNativeControls
            isLooping
            shouldPlay
            resizeMode={ResizeMode.COVER}
            onError={(error) => {
              console.log(`Video error for ${item.label}:`, error);
            }}
          />
          
          {/* Overlay */}
          <View style={styles.overlay}>
              <View style={styles.headerRow}>
                  <View style={styles.liveBadge}>
                      <View style={styles.dot} />
                      <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.timeText}>
                      {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
              </View>
              
              <View style={styles.footerRow}>
                  <View style={styles.labelContainer}>
                      <Text style={styles.labelText}>{item.label}</Text>
                      {item.location && <Text style={styles.locationText}>{item.location}</Text>}
                  </View>
              </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header */}
      <View
        style={[styles.headerBackground, { backgroundColor: colors.primary }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRowWrapper}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Monitoring CCTV</Text>
              <DemoLabel />
            </View>
            {canEdit && (
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => handleOpenForm()}
              >
                <Ionicons name="settings" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {!canEdit && <View style={{ width: 40 }} />}
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={isDarkMode ? '#059669' : '#059669'} />
        </View>
      ) : !hasAccess ? (
        <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed-outline" size={64} color={colors.primary} />
            <Text style={styles.accessDeniedTitle}>Akses Ditolak</Text>
            <Text style={styles.accessDeniedText}>
                Maaf, fitur Monitoring CCTV hanya tersedia untuk Pengurus RT/Admin.
            </Text>
            <TouchableOpacity 
                style={[styles.backButton, { backgroundColor: colors.primary }]}
                onPress={() => {}}
            >
                <Ionicons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Kembali ke Dashboard</Text>
            </TouchableOpacity>
        </View>
      ) : isExpired ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Layanan Tidak Tersedia</Text>
            <Text style={[styles.emptyText, { fontSize: 14, marginTop: 4 }]}>
                Masa aktif sistem telah habis. Hubungi Admin.
            </Text>
        </View>
      ) : (
        <FlatList
          data={cctvs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={[isDarkMode ? '#059669' : '#059669']} 
                tintColor={isDarkMode ? '#059669' : '#059669'}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="videocam-off-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Tidak ada CCTV aktif</Text>
                {canEdit && (
                  <Text style={[styles.emptyText, { fontSize: 14, marginTop: 8, color: colors.primary }]}>
                    Klik tombol ⚙️ untuk menambahkan CCTV
                  </Text>
                )}
            </View>
          }
        />
      )}

      {/* Settings Modal - Form Tambah/Edit CCTV */}
      {showForm && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={handleCloseForm}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons 
                    name={editingCamera ? 'create-outline' : 'add-circle-outline'} 
                    size={24} 
                    color={colors.primary} 
                  />
                  <Text style={styles.modalTitle}>
                    {editingCamera ? 'Edit CCTV' : 'Tambah CCTV Baru'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCloseForm}>
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.formContainer}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Label Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Label Kamera <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.label && styles.inputError]}
                    placeholder="Contoh: CCTV Gerbang Utama"
                    placeholderTextColor={colors.textSecondary}
                    value={formLabel}
                    onChangeText={setFormLabel}
                    autoFocus
                  />
                  {formErrors.label && (
                    <Text style={styles.errorText}>{formErrors.label}</Text>
                  )}
                </View>

                {/* URL Stream Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    URL Stream <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea, formErrors.url && styles.inputError]}
                    placeholder="Contoh: http://192.168.1.100:8080/hls/stream.m3u8"
                    placeholderTextColor={colors.textSecondary}
                    value={formUrl}
                    onChangeText={setFormUrl}
                    multiline
                    numberOfLines={3}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  {formErrors.url && (
                    <Text style={styles.errorText}>{formErrors.url}</Text>
                  )}
                  <Text style={styles.fieldHint}>
                    Format: http:// atau https:// (m3u8, rtsp, rtmp)
                  </Text>
                </View>

                {/* Lokasi Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Lokasi <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.location && styles.inputError]}
                    placeholder="Contoh: Gerbang Depan RT"
                    placeholderTextColor={colors.textSecondary}
                    value={formLocation}
                    onChangeText={setFormLocation}
                  />
                  {formErrors.location && (
                    <Text style={styles.errorText}>{formErrors.location}</Text>
                  )}
                </View>

                {/* Status Toggle */}
                <View style={styles.fieldGroup}>
                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.fieldLabel}>Status Aktif</Text>
                      <Text style={styles.fieldHint}>Nyalakan untuk menampilkan CCTV</Text>
                    </View>
                    <Switch
                      value={formIsActive}
                      onValueChange={setFormIsActive}
                      trackColor={{ false: '#94a3b8', true: '#10b981' }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCloseForm}
                  disabled={submitting}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.submitButton, submitting && { opacity: 0.5 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonTextWhite}>
                        {editingCamera ? 'Update' : 'Simpan'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingVertical: 12,
  },
  headerRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
    gap: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: isDarkMode ? '#1e293b' : '#cbd5e1',
  },
  video: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  labelContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    // backdropFilter: 'blur(10px)', // Not supported in React Native directly
  },
  labelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  accessDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.card,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  formContainer: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#475569' : '#cbd5e1',
    backgroundColor: isDarkMode ? '#334155' : '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
