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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    user_id: '',
    no_kk: '',
    status: 'PENDING' as 'LAYAK' | 'TIDAK_LAYAK' | 'PENDING',
    notes: '',
    score: 0
  });
  const [wargaSearch, setWargaSearch] = useState('');

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
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate ? onNavigate('HOME') : null} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#10b981" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Bantuan Sosial (Bansos)</Text>
          <Text style={styles.subtitle}>Kelola data penerima bantuan</Text>
        </View>
      </View>

      {/* TABS - Like Web Admin */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'dtks' && styles.activeTab]}
            onPress={() => { setActiveTab('dtks'); setSearchQuery(''); }}
          >
            <Ionicons 
              name={activeTab === 'dtks' ? 'people' : 'people-outline'} 
              size={20} 
              color={activeTab === 'dtks' ? '#fff' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'dtks' && styles.activeTabText]}>
              Data DTKS
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'penyaluran' && styles.activeTab]}
            onPress={() => setActiveTab('penyaluran')}
          >
            <Ionicons 
              name={activeTab === 'penyaluran' ? 'gift' : 'gift-outline'} 
              size={20} 
              color={activeTab === 'penyaluran' ? '#fff' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'penyaluran' && styles.activeTabText]}>
              Penyaluran
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'riwayat' && styles.activeTab]}
            onPress={() => { setActiveTab('riwayat'); setSearchQuery(''); }}
          >
            <Ionicons 
              name={activeTab === 'riwayat' ? 'time' : 'time-outline'} 
              size={20} 
              color={activeTab === 'riwayat' ? '#fff' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'riwayat' && styles.activeTabText]}>
              Riwayat
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
          <View style={styles.emptyState}>
            <Ionicons 
              name={activeTab === 'dtks' ? 'people-outline' : activeTab === 'riwayat' ? 'document-text-outline' : 'git-pull-request-outline'} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'dtks' 
                ? 'Belum ada data DTKS.' 
                : activeTab === 'riwayat'
                ? 'Belum ada riwayat penyaluran.'
                : 'Fitur penyaluran akan segera hadir.'}
            </Text>
          </View>
        }
        renderItem={({ item }: any) => {
          if (activeTab === 'dtks') {
            const recipientItem = item as BansosRecipient;
            return (
              <View style={styles.card}>
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
                </View>
              </View>
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
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e5e5e5'
  },
  backButton: { padding: 8, marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  
  // Tabs
  tabScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e5e5' },
  tabs: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12 },
  tab: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    gap: 8
  },
  activeTab: { backgroundColor: '#10b981' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  
  // Search
  searchContainer: { padding: 16, backgroundColor: '#fff' },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5'
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333'
  },
  
  // List
  listContent: { padding: 16, paddingBottom: 100 },
  card: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { color: '#888', fontSize: 12 },
  
  // History Card
  historyCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyInfo: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  historyTextContainer: { flex: 1 },
  historyProgram: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  historyDate: { fontSize: 13, color: '#666' },
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  historyRecipient: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
  historyRecipientText: { fontSize: 13, color: '#666', flex: 1 },
  
  // Empty State
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { textAlign: 'center', marginTop: 16, color: '#999', fontSize: 14 },
  
  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  // Modal
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContent: { 
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  input: { 
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  // Status Options
  statusOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusOption: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#f5f5f5',
  },
  statusOptionText: { fontSize: 13, fontWeight: '600', color: '#666' },
  
  // Save Button
  saveButton: { 
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  // Suggestions
  suggestionsContainer: { 
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: { 
    padding: 12, 
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionContent: { flex: 1 },
  suggestionText: { color: '#333', fontSize: 14, fontWeight: '600' },
  suggestionSubtext: { color: '#666', fontSize: 12, marginTop: 2 },
});

export default BansosScreen;
