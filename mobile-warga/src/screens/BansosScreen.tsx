import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

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
    nama?: string; // Optional for compatibility
  };
  created_at: string;
}

interface BansosHistory {
  id: number;
  bansos_recipient_id: number;
  program_name: string;
  date_received: string;
  amount: string | number;
  evidence_photo: string | null;
  recipient: BansosRecipient;
}

interface DistributionRecord {
  id: number;
  program_name: string;
  date: string;
  recipients: number[]; // Array of recipient IDs
  status: 'PENDING' | 'COMPLETED';
}

const BansosScreen = ({ onNavigate }: any) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dtks' | 'penyaluran' | 'riwayat'>('dtks');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [recipients, setRecipients] = useState<BansosRecipient[]>([]);
  const [histories, setHistories] = useState<BansosHistory[]>([]);
  const [wargaList, setWargaList] = useState<any[]>([]);
  
  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [updateStatusModalVisible, setUpdateStatusModalVisible] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<BansosRecipient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    user_id: '',
    no_kk: '',
    status: 'PENDING' as 'LAYAK' | 'TIDAK_LAYAK' | 'PENDING',
    notes: '',
    score: 0
  });
  const [updateStatusForm, setUpdateStatusForm] = useState({
    status: 'PENDING' as 'LAYAK' | 'TIDAK_LAYAK' | 'PENDING',
    notes: '',
    score: 0
  });
  const [wargaSearch, setWargaSearch] = useState('');
  
  // Distribution tab states
  const [distributionProgramName, setDistributionProgramName] = useState('');
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split('T')[0]);
  const [distributionAmount, setDistributionAmount] = useState('');
  const [selectedRecipientsForDist, setSelectedRecipientsForDist] = useState<number[]>([]);

  useEffect(() => {
    console.log('🔴 [BANSOS REBUILD] Component Mounted!');
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      console.log('🔵 [BANSOS REBUILD] Memanggil API Web-Admin... Tab:', activeTab);
      setLoading(true);
      
      if (activeTab === 'dtks') {
        // Fetch recipients and warga list
        const response = await api.get('/bansos-recipients');
        console.log('✅ [BANSOS REBUILD] Data DTKS didapat:', response.data.data?.data?.length || 0);
        setRecipients(response.data.data?.data || []);
        
        // Also fetch warga list for adding new recipients
        try {
          const wargaResponse = await api.get('/warga');
          setWargaList(wargaResponse.data.data?.data || []);
        } catch (error) {
          console.warn('⚠️ Gagal fetch warga list:', error);
          setWargaList([]);
        }
      } else if (activeTab === 'riwayat') {
        // Fetch histories
        const response = await api.get('/bansos-histories');
        console.log('✅ [BANSOS REBUILD] Riwayat didapat:', response.data.data?.data?.length || 0);
        setHistories(response.data.data?.data || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ [BANSOS REBUILD] Gagal ambil data:', error);
      setLoading(false);
      Alert.alert("Error Jaringan", "Gagal sinkronisasi dengan Web-Admin.");
    }
  };

  // Filter recipients based on search query
  const filteredRecipients = recipients.filter(item => {
    const name = (item.user?.name || item.user?.nama || '').toLowerCase();
    const kk = (item.no_kk || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || kk.includes(query);
  });

  // Handle add recipient
  const handleAddRecipient = async () => {
    if (!newRecipient.user_id || !newRecipient.no_kk) {
      Alert.alert('Error', 'Mohon lengkapi data wajib (Warga & No KK)');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/bansos-recipients', newRecipient);
      Alert.alert('Sukses', 'Penerima berhasil ditambahkan');
      setAddModalVisible(false);
      setNewRecipient({
        user_id: '',
        no_kk: '',
        status: 'PENDING',
        notes: '',
        score: 0
      });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error adding recipient:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update status (TAHAP 1: VERIFIKASI)
  const handleUpdateStatus = async () => {
    if (!selectedRecipient) return;

    try {
      setIsSubmitting(true);
      await api.put(`/bansos-recipients/${selectedRecipient.id}`, updateStatusForm);
      Alert.alert('Sukses', `Status berhasil diubah menjadi ${updateStatusForm.status}`);
      setUpdateStatusModalVisible(false);
      setSelectedRecipient(null);
      setUpdateStatusForm({
        status: 'PENDING',
        notes: '',
        score: 0
      });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal memperbarui status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open update status modal
  const openUpdateStatusModal = (recipient: BansosRecipient) => {
    setSelectedRecipient(recipient);
    setUpdateStatusForm({
      status: recipient.status,
      notes: recipient.notes || '',
      score: recipient.score || 0
    });
    setUpdateStatusModalVisible(true);
  };

  // Handle distribution (TAHAP 2: PENYALURAN)
  const handleDistribute = async () => {
    if (!distributionProgramName || selectedRecipientsForDist.length === 0) {
      Alert.alert('Error', 'Mohon lengkapi nama program dan pilih penerima');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Distribute to each selected recipient
      const distributePromises = selectedRecipientsForDist.map(async (recipientId) => {
        const recipient = recipients.find(r => r.id === recipientId);
        if (!recipient) return;

        await api.post(`/bansos-recipients/${recipientId}/distribute`, {
          program_name: distributionProgramName,
          date_received: distributionDate,
          amount: distributionAmount || 0,
        });
      });

      await Promise.all(distributePromises);
      
      Alert.alert('Sukses', `Penyaluran ${distributionProgramName} berhasil dibagikan ke ${selectedRecipientsForDist.length} warga`);
      
      // Reset form
      setDistributionProgramName('');
      setDistributionDate(new Date().toISOString().split('T')[0]);
      setDistributionAmount('');
      setSelectedRecipientsForDist([]);
      
      // Switch to history tab
      setActiveTab('riwayat');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error distributing aid:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyalurkan bantuan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle recipient selection for distribution
  const toggleRecipientSelection = (recipientId: number) => {
    setSelectedRecipientsForDist(prev => 
      prev.includes(recipientId) 
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  // Get eligible recipients for distribution (only LAYAK status)
  const eligibleRecipients = recipients.filter(r => r.status === 'LAYAK');

  // Filter warga based on search
  const filteredWarga = wargaList.filter(w => 
    w.name && w.name.toLowerCase().includes((wargaSearch || '').toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Menarik Data dari Web-Admin...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER - Green Curved with Centered Title & Back Button */}
      <View style={styles.headerBackgroundContainer}>
        <View style={[styles.headerBackground, { backgroundColor: '#10b981' }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              {/* Back Button - Absolute Position (Layer Top) */}
              <TouchableOpacity 
                onPress={() => onNavigate ? onNavigate('HOME') : null} 
                style={styles.backButtonAbsolute}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              {/* Center Content - Absolute Centered */}
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Bantuan Sosial (Bansos)</Text>
                <Text style={styles.headerSubtitle}>Kelola data penerima bantuan</Text>
              </View>
              
              {/* Right Spacer - Visual Balance */}
              <View style={{ width: 40 }} />
            </View>
          </View>
        </View>
      </View>

      {/* TABS - Perfect Symmetry with Flex 1 (NO SCROLL) */}
      <View style={styles.tabScroll}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'dtks' && styles.activeTab]}
            onPress={() => { setActiveTab('dtks'); setSearchQuery(''); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'dtks' && styles.activeTabButtonText]}>
              Data DTKS
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'penyaluran' && styles.activeTab]}
            onPress={() => setActiveTab('penyaluran')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'penyaluran' && styles.activeTabButtonText]}>
              Penyaluran
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'riwayat' && styles.activeTab]}
            onPress={() => { setActiveTab('riwayat'); setSearchQuery(''); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'riwayat' && styles.activeTabButtonText]}>
              Riwayat
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH BAR - Only for DTKS tab */}
      {activeTab === 'dtks' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama warga..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* CONTENT LIST */}
      <FlatList
        data={activeTab === 'dtks' ? filteredRecipients : activeTab === 'riwayat' ? histories : []}
        keyExtractor={(item: any) => item.id?.toString() || 'unknown'}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          activeTab === 'penyaluran' ? (
            <View style={styles.distributionContainer}>
              <Ionicons name="gift-outline" size={64} color="#10b981" />
              <Text style={styles.distributionTitle}>Penyaluran Bantuan</Text>
              <Text style={styles.distributionSubtitle}>
                Buat penyaluran bantuan baru untuk warga yang statusnya LAYAK
              </Text>
              
              {eligibleRecipients.length > 0 ? (
                <TouchableOpacity 
                  style={styles.createDistributionButton}
                  onPress={() => setDistributionProgramName('Sembako Bulan Ini')}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                  <Text style={styles.createDistributionText}>Buat Penyaluran Baru</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noEligibleContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#f59e0b" />
                  <Text style={styles.noEligibleText}>
                    Belum ada warga dengan status LAYAK.{'\n'}
                    Silakan verifikasi data di tab DTKS terlebih dahulu.
                  </Text>
                </View>
              )}
            </View>
          ) : activeTab === 'dtks' ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Belum ada data DTKS.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Belum ada riwayat penyaluran.</Text>
            </View>
          )
        }
        renderItem={({ item }: any) => {
          if (activeTab === 'dtks') {
            const recipientItem = item as BansosRecipient;
            return (
              <TouchableOpacity 
                style={styles.card}
                onPress={() => openUpdateStatusModal(recipientItem)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.avatar, { backgroundColor: getStatusColor(recipientItem.status) }]}>
                      <Text style={styles.avatarText}>
                        {(recipientItem.user?.name || recipientItem.user?.nama || 'U').charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.infoContainer}>
                      <Text style={styles.name}>{recipientItem.user?.name || recipientItem.user?.nama || 'Tanpa Nama'}</Text>
                      <Text style={styles.kk}>KK: {recipientItem.no_kk || '-'}</Text>
                      {recipientItem.notes && (
                        <Text style={styles.notes} numberOfLines={1}>
                          📝 {recipientItem.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getStatusColor(recipientItem.status) }]}>
                    <Text style={styles.badgeText}>{recipientItem.status || 'PENDING'}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={14} color="#888" />
                    <Text style={styles.date}>
                      {recipientItem.created_at ? new Date(recipientItem.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </Text>
                  </View>
                  <View style={styles.editHint}>
                    <Ionicons name="create-outline" size={16} color="#10b981" />
                    <Text style={styles.editHintText}>Ketuk untuk ubah status</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          } else if (activeTab === 'riwayat') {
            const historyItem = item as BansosHistory;
            return (
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyInfo}>
                    <Ionicons name="gift-outline" size={24} color="#10b981" />
                    <View style={styles.historyTextContainer}>
                      <Text style={styles.historyProgram}>{historyItem.program_name || 'Tanpa Nama Program'}</Text>
                      <Text style={styles.historyDate}>
                        {historyItem.date_received 
                          ? new Date(historyItem.date_received).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                          : '-'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyAmount}>
                    {historyItem.amount 
                      ? `Rp ${typeof historyItem.amount === 'string' ? parseInt(historyItem.amount).toLocaleString('id-ID') : historyItem.amount.toLocaleString('id-ID')}`
                      : 'Barang'}
                  </Text>
                </View>
                {historyItem.recipient && (
                  <View style={styles.historyRecipient}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.historyRecipientText}>
                      {historyItem.recipient.user?.name || historyItem.recipient.user?.nama || 'Tidak diketahui'}
                    </Text>
                  </View>
                )}
              </View>
            );
          }
          return null;
        }}
      />

      {/* FLOATING ACTION BUTTON */}
      {activeTab === 'dtks' && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ADD RECIPIENT MODAL */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Penerima Bansos</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Pilih Warga</Text>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari nama warga..."
                  placeholderTextColor="#999"
                  value={wargaSearch}
                  onChangeText={(text) => {
                    setWargaSearch(text);
                    if (text !== wargaSearch) {
                      setNewRecipient({...newRecipient, user_id: ''});
                    }
                  }}
                  autoFocus
                />
              </View>

              {/* Warga Suggestions */}
              {wargaSearch.length > 0 && !newRecipient.user_id && filteredWarga.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {filteredWarga.slice(0, 5).map((w: any) => (
                    <TouchableOpacity 
                      key={w.id} 
                      style={styles.suggestionItem}
                      onPress={() => {
                        setNewRecipient({...newRecipient, user_id: w.id.toString()});
                        setWargaSearch(w.name);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionText}>{w.name}</Text>
                        <Text style={styles.suggestionSubtext}>{w.phone || w.email}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>Nomor KK</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 3201010101010001"
                placeholderTextColor="#999"
                value={newRecipient.no_kk}
                onChangeText={(text) => setNewRecipient({...newRecipient, no_kk: text})}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Status Kelayakan</Text>
              <View style={styles.statusOptions}>
                {['PENDING', 'LAYAK', 'TIDAK_LAYAK'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      newRecipient.status === status && { 
                        backgroundColor: getStatusColor(status as any),
                        borderColor: getStatusColor(status as any)
                      }
                    ]}
                    onPress={() => setNewRecipient({...newRecipient, status: status as any})}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      newRecipient.status === status && { color: '#fff' }
                    ]}>
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Catatan (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Contoh: Keluarga prasejahtera dengan 3 anak"
                placeholderTextColor="#999"
                value={newRecipient.notes}
                onChangeText={(text) => setNewRecipient({...newRecipient, notes: text})}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity 
                style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                onPress={handleAddRecipient}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Simpan Data</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'LAYAK': return '#10b981'; // Green
    case 'TIDAK_LAYAK': return '#ef4444'; // Red
    case 'PENDING': return '#f59e0b'; // Amber
    default: return '#999';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  
  // Header - Green Curved (Matching Voting Screen)
  headerBackgroundContainer: {
    marginBottom: 20,
  },
  headerBackground: {
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 20,  // Consistent 20px rule
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    marginTop: 10,
    position: 'relative',  // For absolute positioning of back button & title
  },
  backButtonAbsolute: {
    position: 'absolute',
    left: 10,              // Safe distance from edge
    zIndex: 10,            // KEY: Top layer for clickability
    padding: 10,           // Touch target enhancement
  },
  headerTitleContainer: {
    position: 'absolute',  // Floats above header row
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60, // WAJIB: Safe distance from Back button
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',   // Force text center in container
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  
  // Tabs - Perfect Symmetry Formula (Flex 1)
  tabScroll: { 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabsContainer: {
    flexDirection: 'row',        // Row layout for horizontal tabs
    width: '100%',               // Full width container
    paddingHorizontal: 20,       // Consistent 20px rule
  },
  tabButton: {
    flex: 1,                     // KEY: Automatic equal distribution
    alignItems: 'center',        // Center horizontally
    justifyContent: 'center',    // Center vertically
    paddingVertical: 15,         // Perfect vertical spacing
    position: 'relative',
    // Indicator attached directly to button wrapper
  },
  activeTab: {
    borderBottomWidth: 3,        // Attached indicator
    borderBottomColor: '#10b981', // Green line appears HERE (attached to text)
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'normal',        // Inactive: normal weight
    color: '#999999',            // Soft gray
  },
  activeTabButtonText: {
    color: '#10b981',
    fontWeight: 'bold',          // Active: bold weight
  },
  
  // Old tab styles (removed - using new names)
  tabs: { flexDirection: 'row', paddingVertical: 0, paddingHorizontal: 20 },
  tab: { 
    flexDirection: 'column', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 8,
    marginHorizontal: 8,
    position: 'relative',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#999' },
  activeTabText: { color: '#10b981' },
  
  // Search - Enhanced with Shadow and Margin
  searchContainer: { 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    backgroundColor: '#fff',
    marginTop: 8,              // Space from tabs
  },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fafafa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,        // Enhanced shadow
    shadowRadius: 4,
    elevation: 3,              // More prominent
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: 0, 
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
  },
  
  // List - Anti Overlapping
  listContent: { padding: 20, paddingBottom: 120 },
  card: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flexDirection: 'row', flex: 1, gap: 12 },
  infoContainer: { flex: 1 },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  kk: { fontSize: 13, color: '#666', marginBottom: 4 },
  notes: { fontSize: 12, color: '#10b981', fontStyle: 'italic', marginTop: 4 },
  badge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center'
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { color: '#888', fontSize: 12 },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editHintText: { color: '#10b981', fontSize: 11, fontWeight: '600' },
  
  // History Card
  historyCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyInfo: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  historyTextContainer: { flex: 1 },
  historyProgram: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  historyDate: { fontSize: 13, color: '#666' },
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  historyRecipient: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
  historyRecipientText: { fontSize: 13, color: '#666', flex: 1 },
  
  // Empty State - Centered
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999', fontSize: 15, lineHeight: 22 },
  
  // Floating Button - Safe Position (Above Bottom Nav)
  floatingButton: {
    position: 'absolute',
    bottom: 110,                 // ← Raised! Safe clearance above Darurat button
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    zIndex: 9999,
  },
  
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
  textArea: { height: 80, textAlignVertical: 'top' },
  
  // Status Options
  statusOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginVertical: 8 },
  statusOption: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fafafa',
  },
  statusOptionText: { fontSize: 13, fontWeight: '600', color: '#666' },
  
  // Save Button
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
  
  // Suggestions
  suggestionsContainer: { 
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  suggestionItem: { 
    paddingVertical: 14, 
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionContent: { flex: 1 },
  suggestionText: { color: '#333', fontSize: 14, fontWeight: '600' },
  suggestionSubtext: { color: '#666', fontSize: 12, marginTop: 2 },
  
  // Distribution Tab Styles
  distributionContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 40,
  },
  distributionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1a1a1a', 
    marginTop: 20,
    marginBottom: 8,
  },
  distributionSubtitle: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createDistributionButton: { 
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 3,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createDistributionText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
  },
  noEligibleContainer: { 
    alignItems: 'center', 
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    width: '100%',
  },
  noEligibleText: { 
    textAlign: 'center', 
    color: '#856404', 
    fontSize: 14, 
    marginTop: 12,
    lineHeight: 22,
  },
});

export default BansosScreen;
