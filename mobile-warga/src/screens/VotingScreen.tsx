import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import api, { getStorageUrl } from '../services/api';

interface PollOption {
  id: number;
  name: string;
  vote_count: number;
  percentage?: number;
  image_url?: string;
}

interface Poll {
  id: number;
  title: string;
  description: string;
  end_date: string;
  status: string;
  start_date: string;
  options: PollOption[];
  is_voted: boolean;
  total_votes: number;
  voted_option_id?: number | null;
}

const VotingScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { isExpired, isDemo } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Create Poll State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDesc, setNewPollDesc] = useState('');
  const [newPollDuration, setNewPollDuration] = useState('3');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/me');
      console.log('User Profile Data:', response.data.data); // Debug log
      setUserRole(response.data.data.role);
      setUserPermissions(response.data.data.permissions_list || []);
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const isRtOrAdmin = useMemo(() => {
    // Check role
    if (userRole) {
        const role = userRole.toUpperCase();
        if (['RT', 'ADMIN_RT', 'RW', 'ADMIN_RW', 'SUPER_ADMIN', 'SEKRETARIS_RT', 'BENDAHARA_RT'].includes(role)) {
            return true;
        }
    }
    
    // Fallback: Check permissions (proxy for admin rights)
    if (userPermissions && (userPermissions.includes('warga.create') || userPermissions.includes('tenant.manage'))) {
        return true;
    }

    return false;
  }, [userRole, userPermissions]);

  const fetchPolls = async () => {
    try {
      const response = await api.get('/polls');
      setPolls(response.data.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat data voting');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPolls();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchPolls();
  };

  const handleVote = async (pollId: number, optionId: number) => {
    if (isExpired) {
      Alert.alert('Akses Terbatas', 'Masa trial RT Anda telah habis. Silakan hubungi admin RT untuk memperbarui langganan.');
      return;
    }
    if (isDemo) {
      Alert.alert('Mode Demo', 'Voting tidak dapat dilakukan dalam mode demo.');
      return;
    }
    setVotingId(optionId);
    try {
      await api.post(`/polls/${pollId}/vote`, { option_id: optionId });
      
      Alert.alert('Berhasil', 'Terima kasih atas partisipasi Anda!');
      fetchPolls(); // Refresh data to show results
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gagal mengirim vote';
      Alert.alert('Gagal', message);
    } finally {
      setVotingId(null);
    }
  };

  const handleAddOption = () => {
    setNewPollOptions([...newPollOptions, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (newPollOptions.length <= 2) {
      Alert.alert('Info', 'Minimal harus ada 2 opsi pilihan');
      return;
    }
    const newOptions = [...newPollOptions];
    newOptions.splice(index, 1);
    setNewPollOptions(newOptions);
  };

  const handleOptionChange = (text: string, index: number) => {
    const newOptions = [...newPollOptions];
    newOptions[index] = text;
    setNewPollOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!newPollTitle.trim()) {
      Alert.alert('Error', 'Judul voting harus diisi');
      return;
    }
    if (newPollOptions.some(opt => !opt.trim())) {
      Alert.alert('Error', 'Semua opsi pilihan harus diisi');
      return;
    }
    
    const duration = parseInt(newPollDuration);
    if (isNaN(duration) || duration < 1) {
      Alert.alert('Error', 'Durasi harus minimal 1 hari');
      return;
    }

    setCreating(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const payload = {
        title: newPollTitle,
        description: newPollDesc,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'OPEN',
        options: newPollOptions.map(opt => ({ name: opt }))
      };

      await api.post('/polls', payload);
      
      Alert.alert('Berhasil', 'Voting baru berhasil dibuat');
      setCreateModalVisible(false);
      resetForm();
      fetchPolls();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Gagal membuat voting';
      Alert.alert('Gagal', message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewPollTitle('');
    setNewPollDesc('');
    setNewPollDuration('3');
    setNewPollOptions(['', '']);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const renderPollItem = ({ item }: { item: Poll }) => {
    const isExpired = new Date(item.end_date) < new Date();
    const isClosed = item.status === 'CLOSED' || isExpired;
    const canVote = !item.is_voted && !isClosed;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.pollTitle}>{item.title}</Text>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.pollDate}>
                Berakhir: {formatDate(item.end_date)}
              </Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isClosed ? 'rgba(100, 116, 139, 0.1)' : 'rgba(5, 150, 105, 0.1)' }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: isClosed ? '#64748B' : '#059669' }
            ]}>
              {isClosed ? 'Selesai' : 'Aktif'}
            </Text>
          </View>
        </View>

        <Text style={styles.pollDescription}>
          {item.description}
        </Text>

        <View style={styles.divider} />

        <View style={styles.optionsContainer}>
          {item.options.map((option) => {
            const percentage = item.total_votes > 0 
              ? Math.round((option.vote_count / item.total_votes) * 100) 
              : 0;
            const imageUrl = option.image_url ? getStorageUrl(option.image_url) : null;
            
            return (
              <View key={option.id} style={styles.optionWrapper}>
                {canVote ? (
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      votingId === option.id && styles.voteButtonActive,
                      votingId === option.id && { backgroundColor: 'rgba(5, 150, 105, 0.1)' }
                    ]}
                    onPress={() => handleVote(item.id, option.id)}
                    disabled={votingId !== null}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <View style={styles.voteButtonContent}>
                        <View style={[
                          styles.radioButton,
                          votingId === option.id && styles.radioButtonSelected
                        ]}>
                          {votingId === option.id && <View style={styles.radioButtonInner} />}
                        </View>
                        {imageUrl && (
                          <Image 
                            source={{ uri: imageUrl }} 
                            style={styles.optionImage} 
                            resizeMode="cover"
                          />
                        )}
                        <Text style={[
                          styles.voteButtonText, 
                          votingId === option.id && styles.voteButtonTextActive
                        ]}>
                          {option.name}
                        </Text>
                      </View>
                      {votingId === option.id && (
                        <ActivityIndicator size="small" color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.resultContainer}>
                    <View style={styles.resultHeader}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {imageUrl && (
                            <Image 
                              source={{ uri: imageUrl }} 
                              style={[styles.optionImage, { width: 32, height: 32, marginRight: 8 }]} 
                              resizeMode="cover"
                            />
                        )}
                        <Text style={styles.resultText}>
                          {option.name}
                        </Text>
                      </View>
                      <Text style={styles.resultPercentage}>
                        {percentage}%
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                      style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: colors.primary }]}
                    />
                    </View>
                    <Text style={styles.voteCountText}>{option.vote_count} suara</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <View style={styles.totalVotesContainer}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.totalVotes}>
              {item.total_votes} Partisipan
            </Text>
          </View>
          
          {item.is_voted && (
            <View style={[styles.votedBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.votedText}>Sudah Memilih</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View
        style={[styles.headerBackground, { backgroundColor: colors.primary }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={styles.headerTitle}>Voting Warga</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
          <Text style={{color: 'white', fontSize: 10, textAlign: 'center', backgroundColor: 'rgba(255,0,0,0.5)', marginTop: 4, padding: 2}}>
             Debug Role: {userRole ? userRole : 'NULL'} | Perms: {userPermissions?.length || 0}
          </Text>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={polls}
          renderItem={renderPollItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="stats-chart-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Belum ada voting aktif saat ini
              </Text>
            </View>
          }
        />
      )}

      {isRtOrAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Buat Voting</Text>
        </TouchableOpacity>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buat Voting Baru</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Judul Voting</Text>
                <TextInput
                  style={styles.input}
                  value={newPollTitle}
                  onChangeText={setNewPollTitle}
                  placeholder="Contoh: Pemilihan Ketua RT"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Deskripsi</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newPollDesc}
                  onChangeText={setNewPollDesc}
                  placeholder="Jelaskan tujuan voting ini..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Durasi (Hari)</Text>
                <View style={styles.durationContainer}>
                  <TouchableOpacity 
                    style={[styles.durationButton, newPollDuration === '1' && styles.durationButtonActive]}
                    onPress={() => setNewPollDuration('1')}
                  >
                    <Text style={[styles.durationText, newPollDuration === '1' && styles.durationTextActive]}>1 Hari</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.durationButton, newPollDuration === '3' && styles.durationButtonActive]}
                    onPress={() => setNewPollDuration('3')}
                  >
                    <Text style={[styles.durationText, newPollDuration === '3' && styles.durationTextActive]}>3 Hari</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.durationButton, newPollDuration === '7' && styles.durationButtonActive]}
                    onPress={() => setNewPollDuration('7')}
                  >
                    <Text style={[styles.durationText, newPollDuration === '7' && styles.durationTextActive]}>1 Minggu</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Pilihan Jawaban</Text>
                {newPollOptions.map((option, index) => (
                  <View key={index} style={styles.optionInputWrapper}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={option}
                      onChangeText={(text) => handleOptionChange(text, index)}
                      placeholder={`Pilihan ${index + 1}`}
                      placeholderTextColor={colors.textSecondary}
                    />
                    {newPollOptions.length > 2 && (
                      <TouchableOpacity 
                        style={styles.removeOptionButton}
                        onPress={() => handleRemoveOption(index)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addOptionButton} onPress={handleAddOption}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addOptionText}>Tambah Pilihan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleCreatePoll}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Buat Voting</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default VotingScreen;

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: -24,
    zIndex: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 26,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pollDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pollDescription: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 20,
    opacity: 0.5,
  },
  optionsContainer: {
    marginBottom: 8,
  },
  optionWrapper: {
    marginBottom: 16,
  },
  voteButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  voteButtonActive: {
    borderColor: colors.primary,
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.1)' : '#ECFDF5',
  },
  voteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
  voteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  voteButtonTextActive: {
    color: colors.primary,
  },
  resultContainer: {
    marginBottom: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  resultPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: isDarkMode ? '#334155' : '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  voteCountText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  totalVotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalVotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  votedText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999,
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  durationButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  durationTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  optionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  removeOptionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 4,
  },
  addOptionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modalFooter: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
