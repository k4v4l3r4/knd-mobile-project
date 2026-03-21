import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { BackButton } from '../components/BackButton';
import api from '../services/api';

interface CCTVCamera {
  id: number;
  label: string;
  stream_url: string;
  location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CCTVSettingsScreen({ navigation, onNavigate }: any) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cameras, setCameras] = useState<CCTVCamera[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CCTVCamera | null>(null);

  // Form State
  const [formLabel, setFormLabel] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Form Validation Errors
  const [errors, setErrors] = useState<{
    label?: string;
    url?: string;
    location?: string;
  }>({});

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cctv-cameras');
      if (response.data.success) {
        setCameras(response.data.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching cameras:', error);
      Alert.alert('Error', 'Gagal memuat data CCTV');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {
      label?: string;
      url?: string;
      location?: string;
    } = {};

    // Validate Label (required)
    if (!formLabel.trim()) {
      newErrors.label = 'Label wajib diisi';
    } else if (formLabel.length < 3) {
      newErrors.label = 'Label minimal 3 karakter';
    }

    // Validate URL Stream (required & format)
    if (!formUrl.trim()) {
      newErrors.url = 'URL stream wajib diisi';
    } else {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(formUrl)) {
        newErrors.url = 'Format URL tidak valid (harus http:// atau https://)';
      }
      
      // Check if it's a common streaming URL pattern
      const streamPatterns = [
        /m3u8$/,
        /rtsp:\/\//,
        /rtmp:\/\//,
        /http.*\/(hls|stream|live)/,
      ];
      
      const isStreamUrl = streamPatterns.some(pattern => pattern.test(formUrl.toLowerCase()));
      if (!isStreamUrl) {
        newErrors.url = 'URL harus berupa stream (m3u8, rtsp, rtmp, atau hls)';
      }
    }

    // Validate Lokasi (required)
    if (!formLocation.trim()) {
      newErrors.location = 'Lokasi wajib diisi';
    } else if (formLocation.length < 3) {
      newErrors.location = 'Lokasi minimal 3 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenForm = (camera?: CCTVCamera) => {
    if (camera) {
      setEditingCamera(camera);
      setFormLabel(camera.label);
      setFormUrl(camera.stream_url);
      setFormLocation(camera.location);
      setFormIsActive(camera.is_active);
    } else {
      setEditingCamera(null);
      setFormLabel('');
      setFormUrl('');
      setFormLocation('');
      setFormIsActive(true);
      setErrors({});
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCamera(null);
    setErrors({});
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

      fetchCameras();
    } catch (error: any) {
      console.error('Error saving camera:', error);
      const message = error.response?.data?.message || 'Gagal menyimpan data CCTV';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (camera: CCTVCamera) => {
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
              fetchCameras();
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

  const handleToggleStatus = async (camera: CCTVCamera) => {
    try {
      await api.patch(`/cctv-cameras/${camera.id}/toggle-status`, {
        is_active: !camera.is_active,
      });
      fetchCameras();
    } catch (error: any) {
      Alert.alert('Error', 'Gagal mengubah status CCTV');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={[colors.primary, '#064e3b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.headerRow}>
              <BackButton onPress={() => onNavigate ? onNavigate('HOME') : navigation.goBack()} color="#fff" />
              <Text style={styles.headerTitle}>Pengaturan CCTV</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat data CCTV...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, '#064e3b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => onNavigate ? onNavigate('HOME') : navigation.goBack()} color="#fff" />
            <Text style={styles.headerTitle}>Pengaturan CCTV</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => handleOpenForm()}
            >
              <Ionicons name="add-circle" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Tambahkan kamera CCTV untuk monitoring. Pastikan URL stream dapat diakses dari mobile.
          </Text>
        </View>

        {/* Camera List */}
        {cameras.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Belum ada CCTV</Text>
            <Text style={styles.emptySubtitle}>
              Klik tombol + di atas untuk menambahkan kamera CCTV
            </Text>
          </View>
        ) : (
          cameras.map((camera) => (
            <View key={camera.id} style={styles.cameraCard}>
              <View style={styles.cameraHeader}>
                <View style={styles.cameraInfo}>
                  <View style={[styles.statusDot, { backgroundColor: camera.is_active ? '#10b981' : '#ef4444' }]} />
                  <Text style={styles.cameraLabel}>{camera.label}</Text>
                </View>
                <Switch
                  value={camera.is_active}
                  onValueChange={() => handleToggleStatus(camera)}
                  trackColor={{ false: '#94a3b8', true: '#10b981' }}
                  thumbColor="#fff"
                />
              </View>
              
              <View style={styles.cameraDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{camera.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailText, styles.urlText]} numberOfLines={1}>
                    {camera.stream_url}
                  </Text>
                </View>
              </View>

              <View style={styles.cameraActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleOpenForm(camera)}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(camera)}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Form Modal */}
      {showForm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCamera ? 'Edit CCTV' : 'Tambah CCTV Baru'}
              </Text>
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
                  style={[styles.input, errors.label && styles.inputError]}
                  placeholder="Contoh: CCTV Gerbang Utama"
                  placeholderTextColor={colors.textSecondary}
                  value={formLabel}
                  onChangeText={setFormLabel}
                  autoFocus
                />
                {errors.label && (
                  <Text style={styles.errorText}>{errors.label}</Text>
                )}
              </View>

              {/* URL Stream Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  URL Stream <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.url && styles.inputError]}
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
                {errors.url && (
                  <Text style={styles.errorText}>{errors.url}</Text>
                )}
                <View style={styles.hintBox}>
                  <Ionicons name="bulb-outline" size={14} color="#f59e0b" />
                  <Text style={styles.hintText}>
                    Format: m3u8, rtsp://, rtmp://, atau http HLS
                  </Text>
                </View>
              </View>

              {/* Location Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Lokasi <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.location && styles.inputError]}
                  placeholder="Contoh: Gerbang Depan RT"
                  placeholderTextColor={colors.textSecondary}
                  value={formLocation}
                  onChangeText={setFormLocation}
                />
                {errors.location && (
                  <Text style={styles.errorText}>{errors.location}</Text>
                )}
              </View>

              {/* Status Toggle */}
              <View style={styles.fieldGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>Status Aktif</Text>
                  <Switch
                    value={formIsActive}
                    onValueChange={setFormIsActive}
                    trackColor={{ false: '#94a3b8', true: '#10b981' }}
                    thumbColor="#fff"
                  />
                </View>
                <Text style={styles.switchHint}>
                  {formIsActive ? 'Aktif' : 'Nonaktif'} - CCTV akan ditampilkan di monitoring jika aktif
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseForm}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {editingCamera ? 'Update' : 'Simpan'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  cameraCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cameraInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cameraLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  cameraDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  urlText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
  },
  cameraActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#f59e0b',
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
