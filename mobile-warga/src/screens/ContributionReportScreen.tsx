import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { BackButton } from '../components/BackButton';
import api, { BASE_URL } from '../services/api';
import { authService, User as AuthUser } from '../services/auth';

// --- Interfaces ---
interface IuranDetail {
  date: string;
  amount: number;
  category: string;
  desc: string;
}

interface MonthData {
  paid: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  details: IuranDetail[];
}

interface UserIuran {
  id: number;
  name: string;
  block: string;
  photo_url: string | null;
  role: string;
  months: Record<string, MonthData>; // "01", "02", etc.
  total_year: number;
}

interface IuranResponse {
  users: UserIuran[];
  blocks: Record<string, number>;
  standard_fee: number;
}

// --- Components ---

const DetailModal = ({ 
  visible, 
  onClose, 
  data, 
  monthLabel, 
  userName,
  colors 
}: { 
  visible: boolean; 
  onClose: () => void; 
  data: MonthData | null; 
  monthLabel: string;
  userName: string;
  colors: ThemeColors;
}) => {
  if (!data) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Detail Iuran: {monthLabel}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Warga: {userName}</Text>

          <View style={[styles.statusBadge, { 
            backgroundColor: data.status === 'PAID' ? '#dcfce7' : data.status === 'PARTIAL' ? '#fef3c7' : '#ffe4e6',
            borderColor: data.status === 'PAID' ? '#bbf7d0' : data.status === 'PARTIAL' ? '#fde68a' : '#fecdd3'
          }]}>
            <Text style={[styles.statusText, { 
              color: data.status === 'PAID' ? '#166534' : data.status === 'PARTIAL' ? '#92400e' : '#be123c' 
            }]}>
              Status: {data.status === 'PAID' ? 'LUNAS' : data.status === 'PARTIAL' ? 'SEBAGIAN' : 'BELUM BAYAR'}
            </Text>
          </View>

          {data.details && data.details.length > 0 ? (
            <ScrollView style={{ maxHeight: 200 }}>
              {data.details.map((detail, index) => (
                <View key={index} style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tanggal:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detail.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Jumlah:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, fontWeight: 'bold' }]}>
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(detail.amount)}
                    </Text>
                  </View>
                  {detail.desc ? (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Catatan:</Text>
                      <Text style={[styles.detailValue, { color: colors.text, flex: 1, textAlign: 'right' }]} numberOfLines={2}>{detail.desc}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyDetail}>
              <Text style={{ color: colors.textSecondary }}>Belum ada data pembayaran.</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: colors.primary }]} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ContributionReportScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<IuranResponse | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState<MonthData | null>(null);
  const [selectedMonthLabel, setSelectedMonthLabel] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');

  // Load User
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authService.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/reports/dues', { params: { year } });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching contribution report:', error);
      Alert.alert('Error', 'Gagal mengambil data laporan iuran.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadReport = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;
      const url = `${BASE_URL}/reports/dues/pdf?token=${token}&year=${year}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Error', 'Tidak dapat membuka link download.');
    } catch (error) {
      Alert.alert('Error', 'Gagal mendownload laporan.');
    }
  };

  const handleMonthPress = (monthData: MonthData, label: string, userName: string) => {
    setSelectedMonthData(monthData);
    setSelectedMonthLabel(label);
    setSelectedUserName(userName);
    setModalVisible(true);
  };

  // Role Logic
  const isRestrictedRole = useMemo(() => {
    const userRole = currentUser?.role?.toUpperCase() || '';
    const allowedRoles = ['ADMIN_RT', 'RT', 'ADMIN_RW', 'RW', 'SECRETARY', 'SEKRETARIS', 'TREASURER', 'BENDAHARA', 'OFFICER', 'PENGURUS'];
    return !allowedRoles.includes(userRole);
  }, [currentUser]);

  // Filtering
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter(user => {
      if (isRestrictedRole && String(user.id) !== String(currentUser?.id)) return false;
      const matchBlock = selectedBlock === 'ALL' || user.block === selectedBlock;
      const matchSearch = user.name.toLowerCase().includes(search.toLowerCase());
      return matchBlock && matchSearch;
    });
  }, [data?.users, isRestrictedRole, currentUser?.id, selectedBlock, search]);

  // Stats
  const totalCollected = useMemo(() => filteredUsers.reduce((sum, user) => sum + (user.total_year || 0), 0), [filteredUsers]);
  const totalExpected = useMemo(() => (data?.standard_fee ? filteredUsers.length * data.standard_fee * 12 : 0), [filteredUsers, data?.standard_fee]);
  const percentageCollected = useMemo(() => (totalExpected === 0 ? 0 : Math.round((totalCollected / totalExpected) * 100)), [totalCollected, totalExpected]);

  // Months Config
  const months = useMemo(() => [
    { key: '01', label: 'Jan' }, { key: '02', label: 'Feb' }, { key: '03', label: 'Mar' }, { key: '04', label: 'Apr' },
    { key: '05', label: 'Mei' }, { key: '06', label: 'Jun' }, { key: '07', label: 'Jul' }, { key: '08', label: 'Agu' },
    { key: '09', label: 'Sep' }, { key: '10', label: 'Okt' }, { key: '11', label: 'Nov' }, { key: '12', label: 'Des' },
  ], []);

  // Render Item (Grid Layout)
  const renderItem = useCallback(({ item }: { item: UserIuran }) => {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <View style={styles.blockBadge}>
                <Text style={styles.blockBadgeText}>Blok {item.block}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(item.total_year)}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Month Grid (4 columns x 3 rows) */}
        <View style={styles.monthGrid}>
          {months.map((month) => {
            const monthData = item.months?.[month.key];
            const status = monthData?.status || 'UNPAID';
            
            let bg = colors.card;
            let text = colors.textSecondary;
            let border = colors.border;
            
            if (status === 'PAID') {
              bg = '#dcfce7'; text = '#166534'; border = '#bbf7d0';
            } else if (status === 'PARTIAL') {
              bg = '#fef3c7'; text = '#92400e'; border = '#fde68a';
            } else {
              bg = '#ffe4e6'; text = '#be123c'; border = '#fecdd3';
            }

            return (
              <TouchableOpacity 
                key={month.key} 
                style={[styles.monthItem, { backgroundColor: bg, borderColor: border }]}
                onPress={() => handleMonthPress(monthData, month.label, item.name)}
              >
                <Text style={[styles.monthText, { color: text }]}>{month.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }, [months, colors, isDarkMode]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={[styles.headerGradient, { backgroundColor: colors.primary, paddingTop: Platform.OS === 'android' ? 40 : 60 }]}>
        <View style={styles.headerContent}>
          <BackButton onPress={() => onNavigate('HOME')} color="#fff" />
          <Text style={styles.headerTitle}>Laporan Iuran</Text>
          <TouchableOpacity onPress={handleDownloadReport} style={styles.downloadButton}>
            <Ionicons name="cloud-download-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryContainer}>
          <View>
            <Text style={styles.summaryLabel}>Total Terkumpul ({year})</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalCollected)}</Text>
            <Text style={styles.summarySubtext}>
              {percentageCollected}% dari estimasi {formatCurrency(totalExpected)}
            </Text>
          </View>
          <View style={styles.yearBadge}>
            <TouchableOpacity onPress={() => setYear(year - 1)}>
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.yearBadgeText, { color: colors.primary }]}>{year}</Text>
            <TouchableOpacity onPress={() => setYear(year + 1)}>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}

      <View style={styles.contentContainer}>
        {!isRestrictedRole && (
          <View style={styles.controlsSection}>
            <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Cari nama warga..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {data?.blocks && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {['ALL', ...Object.keys(data.blocks).sort()].map((block) => (
                  <TouchableOpacity
                    key={block}
                    style={[
                      styles.filterChip, 
                      { backgroundColor: selectedBlock === block ? colors.primary : (isDarkMode ? '#1e293b' : '#f8fafc'), borderColor: selectedBlock === block ? colors.primary : colors.border }
                    ]}
                    onPress={() => setSelectedBlock(block)}
                  >
                    <Text style={[styles.filterChipText, { color: selectedBlock === block ? '#fff' : colors.textSecondary }]}>
                      {block === 'ALL' ? 'Semua Blok' : `Blok ${block}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            loading ? (
              <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Memuat data...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="documents-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Tidak ada data</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {isRestrictedRole ? 'Data iuran Anda tidak ditemukan.' : 'Coba ubah filter atau kata kunci pencarian.'}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            <View style={styles.legendContainer}>
              <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>Keterangan Warna:</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Lunas</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Sebagian</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ffe4e6', borderColor: '#fecdd3' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Belum Bayar</Text>
                </View>
              </View>
            </View>
          }
        />
      </View>

      <DetailModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        data={selectedMonthData} 
        monthLabel={selectedMonthLabel}
        userName={selectedUserName}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    marginBottom: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  downloadButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  summaryContainer: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  summarySubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  yearBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
    marginTop: 0, // Removed negative margin to prevent overlap
  },
  controlsSection: {
    paddingHorizontal: 20,
    paddingTop: 20, // Add top padding for spacing from header
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
  },
  filterScroll: {
    marginBottom: 4,
  },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: { borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  blockBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  blockBadgeText: { fontSize: 10, color: '#475569', fontWeight: '600' },
  totalLabel: { fontSize: 12, marginBottom: 2 },
  totalAmount: { fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 12 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  monthItem: { width: '23%', aspectRatio: 1.5, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginBottom: 8 },
  monthText: { fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptyText: { textAlign: 'center', paddingHorizontal: 40 },
  legendContainer: { padding: 16, alignItems: 'center', marginTop: 16 },
  legendTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  legendRow: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  legendText: { fontSize: 12 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 16 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  detailItem: { paddingVertical: 12, borderBottomWidth: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14 },
  emptyDetail: { padding: 20, alignItems: 'center' },
  closeButton: { padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default ContributionReportScreen;
