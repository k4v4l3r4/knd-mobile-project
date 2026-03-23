import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { authService } from '../services/auth';

interface MyBansos {
  id: number;
  user_id: number;
  no_kk: string;
  status: 'LAYAK' | 'TIDAK_LAYAK' | 'PENDING';
  notes: string;
  score: number;
  created_at: string;
  histories: BansosHistory[];
}

interface BansosHistory {
  id: number;
  program_name: string;
  date_received: string;
  amount: string | number;
  evidence_photo: string | null;
}

export default function BansosWargaScreen({ onNavigate }: any) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'riwayat'>('status');
  const [myBansos, setMyBansos] = useState<MyBansos | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    alasan: '',
    foto_bukti: null as string | null,
  });

  useEffect(() => {
    fetchMyBansos();
  }, []);

  const fetchMyBansos = async () => {
    try {
      setLoading(true);
      console.log('🔵 [BANSOS WARGA] Fetching my bansos data...');
      
      // Get current user ID
      const user = await authService.getUser();
      if (!user) {
        Alert.alert('Error', 'User tidak ditemukan. Silakan login ulang.');
        setLoading(false);
        return;
      }

      // Fetch my bansos status
      const response = await api.get(`/bansos-recipients?user_id=${user.id}`);
      const data = response.data.data?.data || [];
      
      if (data.length > 0) {
        setMyBansos(data[0]); // Get first record
        console.log('✅ [BANSOS WARGA] My bansos status:', data[0].status);
      } else {
        setMyBansos(null);
        console.log('⚠️ [BANSOS WARGA] No bansos record found');
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('❌ [BANSOS WARGA] Error fetching data:', error);
      setLoading(false);
      Alert.alert('Error', 'Gagal memuat data bansos');
    }
  };

  const pickImage = async () => {
    Alert.alert(
      'Upload Foto Bukti',
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
              setSubmissionForm({ ...submissionForm, foto_bukti: result.assets[0].uri });
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
              setSubmissionForm({ ...submissionForm, foto_bukti: result.assets[0].uri });
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

  const handleSubmitBansos = async () => {
    if (!submissionForm.alasan) {
      Alert.alert('Error', 'Mohon isi alasan pengajuan');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get current user
      const user = await authService.getUser();
      if (!user) {
        Alert.alert('Error', 'User tidak ditemukan');
        return;
      }

      // Submit bansos application
      await api.post('/bansos-recipients', {
        user_id: user.id,
        no_kk: '', // Will be filled by RT or from profile
        status: 'PENDING',
        notes: submissionForm.alasan,
        score: 0,
      });

      Alert.alert('Sukses', 'Pengajuan bansos berhasil dikirim. Tunggu verifikasi dari RT.');
      setShowSubmitModal(false);
      setSubmissionForm({ alasan: '', foto_bukti: null });
      fetchMyBansos(); // Refresh data
    } catch (error: any) {
      console.error('Error submitting bansos:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal mengajukan bansos');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Memuat Data Bansos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate ? onNavigate('HOME') : null} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#10b981" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Status Bansos Saya</Text>
          <Text style={styles.subtitle}>Cek status dan riwayat bantuan Anda</Text>
        </View>
      </View>

      {/* TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'status' && styles.activeTab]}
            onPress={() => setActiveTab('status')}
          >
            <Text style={[styles.tabText, activeTab === 'status' && styles.activeTabText]}>
              Status Saya
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'riwayat' && styles.activeTab]}
            onPress={() => setActiveTab('riwayat')}
          >
            <Text style={[styles.tabText, activeTab === 'riwayat' && styles.activeTabText]}>
              Riwayat
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CONTENT */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'status' ? (
          <View style={styles.statusContent}>
            {myBansos ? (
              <>
                <View style={styles.statusCard}>
                  <View style={styles.statusHeader}>
                    <Ionicons 
                      name={
                        myBansos.status === 'LAYAK' ? 'checkmark-circle' :
                        myBansos.status === 'TIDAK_LAYAK' ? 'close-circle' :
                        'time-outline'
                      } 
                      size={48} 
                      color={getStatusColor(myBansos.status)} 
                    />
                    <View style={styles.statusTextContainer}>
                      <Text style={styles.statusLabel}>Status Verifikasi</Text>
                      <Text style={[styles.statusValue, { color: getStatusColor(myBansos.status) }]}>
                        {myBansos.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.statusInfo}>
                    <View style={styles.infoRow}>
                      <Ionicons name="card-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>No KK: {myBansos.no_kk}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>
                        Terdaftar: {myBansos.created_at ? new Date(myBansos.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </Text>
                    </View>
                    {myBansos.notes && (
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>Catatan: {myBansos.notes}</Text>
                      </View>
                    )}
                  </View>

                  {myBansos.status === 'PENDING' && (
                    <View style={styles.pendingNotice}>
                      <Ionicons name="information-circle-outline" size={20} color="#f59e0b" />
                      <Text style={styles.pendingText}>
                        Pengajuan Anda sedang diverifikasi oleh RT/RW
                      </Text>
                    </View>
                  )}
                </View>

                {myBansos.status === 'PENDING' && (
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={() => setShowSubmitModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#fff" />
                    <Text style={styles.submitButtonText}>Ajukan Bantuan Sosial</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="help-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Belum Ada Data Bansos</Text>
                <Text style={styles.emptyText}>
                  Anda belum terdaftar dalam DTKS.{'\n'}Silakan ajukan bantuan sosial dengan menekan tombol di bawah.
                </Text>
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={() => setShowSubmitModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>Ajukan Bantuan Sosial</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.historyContent}>
            {myBansos && myBansos.histories && myBansos.histories.length > 0 ? (
              myBansos.histories.map((history, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Ionicons name="gift-outline" size={24} color="#10b981" />
                    <View style={styles.historyTextContainer}>
                      <Text style={styles.historyProgram}>{history.program_name}</Text>
                      <Text style={styles.historyDate}>
                        {history.date_received 
                          ? new Date(history.date_received).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                          : '-'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyAmountContainer}>
                    <Text style={styles.historyAmountLabel}>Nilai Bantuan:</Text>
                    <Text style={styles.historyAmount}>
                      {history.amount 
                        ? `Rp ${typeof history.amount === 'string' ? parseInt(history.amount).toLocaleString('id-ID') : history.amount.toLocaleString('id-ID')}`
                        : 'Barang'}
                    </Text>
                  </View>
                  {history.evidence_photo && (
                    <Image 
                      source={{ uri: history.evidence_photo }} 
                      style={styles.evidencePhoto}
                      resizeMode="cover"
                    />
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
                <Text style={styles.emptyText}>
                  Anda belum menerima penyaluran bantuan apapun.{'\n'}Status Anda akan diperbarui setelah diverifikasi RT.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* SUBMIT MODAL */}
      {showSubmitModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajukan Bantuan Sosial</Text>
              <TouchableOpacity onPress={() => setShowSubmitModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Alasan Pengajuan</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Jelaskan kondisi Anda yang membutuhkan bantuan..."
                placeholderTextColor="#999"
                value={submissionForm.alasan}
                onChangeText={(text) => setSubmissionForm({...submissionForm, alasan: text})}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Foto Bukti (Opsional)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                {submissionForm.foto_bukti ? (
                  <Image 
                    source={{ uri: submissionForm.foto_bukti }} 
                    style={styles.previewImage} 
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#999" />
                    <Text style={styles.uploadText}>Pilih Foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                onPress={handleSubmitBansos}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Kirim Pengajuan</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'LAYAK': return '#10b981';
    case 'TIDAK_LAYAK': return '#ef4444';
    case 'PENDING': return '#f59e0b';
    default: return '#999';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 45,
    backgroundColor: '#fff',
  },
  backButton: { padding: 8, marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', fontWeight: '400' },
  
  // Tabs
  tabScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  tabs: { flexDirection: 'row', paddingVertical: 0, paddingHorizontal: 20 },
  tab: { 
    paddingVertical: 14, 
    paddingHorizontal: 8,
    marginHorizontal: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#10b981' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#999' },
  activeTabText: { color: '#10b981' },
  
  // Content
  content: { flex: 1, padding: 20, paddingBottom: 40 },
  statusContent: { paddingBottom: 20 },
  historyContent: { paddingBottom: 20 },
  
  // Status Card
  statusCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusTextContainer: { flex: 1, marginLeft: 16 },
  statusLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  statusValue: { fontSize: 24, fontWeight: 'bold' },
  statusInfo: { borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  infoText: { fontSize: 14, color: '#666', flex: 1 },
  pendingNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff3cd', 
    padding: 12, 
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  pendingText: { color: '#856404', fontSize: 13, flex: 1 },
  
  // Submit Button
  submitButton: { 
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  // Empty State
  emptyState: { 
    alignItems: 'center', 
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  
  // History
  historyCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  historyTextContainer: { flex: 1 },
  historyProgram: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  historyDate: { fontSize: 13, color: '#666' },
  historyAmountContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderTopWidth: 1, 
    borderColor: '#f0f0f0',
    paddingTop: 12,
  },
  historyAmountLabel: { fontSize: 13, color: '#666' },
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  evidencePhoto: { width: '100%', height: 150, borderRadius: 8, marginTop: 12 },
  
  // Modal
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContent: { 
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  formContainer: { paddingVertical: 20, paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  input: { 
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  uploadButton: { 
    height: 150,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadPlaceholder: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  uploadText: { marginTop: 8, color: '#999', fontSize: 14 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  saveButton: { 
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    elevation: 3,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
