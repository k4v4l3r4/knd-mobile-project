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
  Modal,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { authService, User as AuthUser } from '../services/auth';
import { BackButton } from '../components/BackButton';

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
  phone?: string;
  months: Record<string, MonthData>; // "01", "02", ... "12"
  total_year: number;
}

interface IuranResponse {
  users: UserIuran[];
  blocks: Record<string, number>;
  standard_fee: number;
}

// --- Helper Functions ---
const formatCurrency = (amount: number) => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
};

const getMonthName = (monthKey: string) => {
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const index = parseInt(monthKey, 10) - 1;
  return monthNames[index] || monthKey;
};

// --- Components ---

const YearDetailModal = ({ 
  visible, 
  onClose, 
  user, 
  year,
  standardFee
}: { 
  visible: boolean; 
  onClose: () => void; 
  user: UserIuran | null; 
  year: number;
  standardFee: number;
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  if (!user) return null;

  const monthKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('iuran.message.detailInfo', { name: user.name })}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Tahun {year}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {monthKeys.map((key) => {
              const monthData = user.months?.[key];
              const status = monthData?.status || 'UNPAID';
              const paidAmount = monthData?.paid || 0;
              
              let statusColor = '#ef4444'; // Red
              let statusBg = '#fee2e2';
              let statusLabel = t('iuran.status.unpaid');

              if (status === 'PAID') {
                statusColor = '#22c55e'; // Green
                statusBg = '#dcfce7';
                statusLabel = t('iuran.status.paid');
              } else if (status === 'PARTIAL') {
                statusColor = '#eab308'; // Yellow
                statusBg = '#fef9c3';
                statusLabel = t('iuran.status.partial');
              }

              return (
                <View key={key} style={[styles.detailRowItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailMonth, { color: colors.text }]}>{getMonthName(key)}</Text>
                    {status === 'PAID' && monthData?.details?.[0]?.date && (
                       <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                         {monthData.details[0].date}
                       </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.miniBadge, { backgroundColor: statusBg }]}>
                      <Text style={{ color: statusColor, fontSize: 10, fontWeight: 'bold' }}>{statusLabel}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, marginTop: 4 }}>
                      {status === 'PAID' ? formatCurrency(paidAmount) : status === 'PARTIAL' ? formatCurrency(paidAmount) : '-'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
             <TouchableOpacity 
               style={[styles.closeButton, { backgroundColor: colors.primary }]} 
               onPress={onClose}
             >
               <Text style={styles.closeButtonText}>{t('iuran.action.close')}</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const IuranScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<IuranResponse | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserIuran | null>(null);

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
      if (!refreshing) setLoading(true);
      
      const response = await api.get('/reports/dues', { params: { year } });
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setData(null);
      }
    } catch (error: any) {
      console.error('Error fetching contribution report:', error);
      if (error.response?.status === 404) {
         setData(null);
      } else {
         // Silent fail or toast in real app, but alert here for feedback
         // Alert.alert('Error', t('common.error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, refreshing, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Logic
  const isRestrictedRole = useMemo(() => {
    if (!currentUser) return true;
    const role = currentUser.role?.toUpperCase() || 'WARGA';
    return ['WARGA', 'WARGA_TETAP', 'WARGA_KONTRAK'].includes(role);
  }, [currentUser]);

  const processedData = useMemo(() => {
    if (!data?.users) return { summary: { balance: 0, paid: 0, unpaid: 0 }, list: [] };

    let users = data.users;
    
    // Privacy Lock for Warga
    if (isRestrictedRole && currentUser) {
      users = users.filter(u => String(u.id) === String(currentUser.id));
    }

    // Calculate Summary (RT Only)
    const summary = {
      balance: 0, 
      paid: 0,    
      unpaid: 0, 
    };

    const currentMonthKey = (new Date().getMonth() + 1).toString().padStart(2, '0');

    data.users.forEach(user => {
      summary.balance += user.total_year || 0;
      
      const monthData = user.months?.[currentMonthKey];
      if (monthData?.status === 'PAID') {
        summary.paid += 1;
      } else {
        summary.unpaid += 1;
      }
    });

    // Apply Filter
    if (filterStatus === 'PAID') {
      users = users.filter(u => u.months?.[currentMonthKey]?.status === 'PAID');
    } else if (filterStatus === 'UNPAID') {
      users = users.filter(u => u.months?.[currentMonthKey]?.status !== 'PAID');
    }

    return { summary, list: users };
  }, [data, isRestrictedRole, currentUser, filterStatus]);

  const sendWhatsAppReminder = async (user: UserIuran) => {
    try {
      await api.post('/reports/dues/remind', { user_id: user.id });
      Alert.alert('Berhasil', t('iuran.message.reminderSent'));
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        t('common.error');
      Alert.alert('Gagal', msg);
    }
  };

  const handleUploadPayment = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Placeholder logic
        Alert.alert(t('common.info'), t('iuran.message.paymentProofDesc'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.failed'));
    }
  };

  const handleContactRT = () => {
     // Placeholder RT number
     const rtPhone = '6281234567890'; 
     const message = t('iuran.message.contactRTMessage');
     const url = `whatsapp://send?phone=${rtPhone}&text=${encodeURIComponent(message)}`;
     Linking.openURL(url);
  };

  // --- Renderers ---

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <View style={styles.statRow}>
        <TouchableOpacity 
          onPress={() => setFilterStatus(filterStatus === 'PAID' ? 'ALL' : 'PAID')}
          style={[
            styles.statCardSmall, 
            { 
              backgroundColor: colors.card, 
              borderColor: filterStatus === 'PAID' ? colors.primary : colors.border,
              borderWidth: filterStatus === 'PAID' ? 2 : 1,
              opacity: filterStatus === 'UNPAID' ? 0.6 : 1
            }
          ]}
        >
          <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>{t('iuran.status.paid')}</Text>
          <Text style={[styles.statValueSmall, { color: '#166534' }]}>{processedData.summary.paid} Warga</Text>
          <Text style={[styles.statSub, { color: colors.textSecondary }]}>{t('iuran.dashboard.thisMonth')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setFilterStatus(filterStatus === 'UNPAID' ? 'ALL' : 'UNPAID')}
          style={[
            styles.statCardSmall, 
            { 
              backgroundColor: colors.card, 
              borderColor: filterStatus === 'UNPAID' ? '#be123c' : colors.border,
              borderWidth: filterStatus === 'UNPAID' ? 2 : 1,
              opacity: filterStatus === 'PAID' ? 0.6 : 1
            }
          ]}
        >
          <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>{t('iuran.status.unpaid')}</Text>
          <Text style={[styles.statValueSmall, { color: '#be123c' }]}>{processedData.summary.unpaid} Warga</Text>
          <Text style={[styles.statSub, { color: colors.textSecondary }]}>{t('iuran.dashboard.estimate')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWargaView = () => {
    const user = processedData.list[0];
    if (!user) return (
      <View style={[styles.emptyState, { marginTop: 40 }]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('iuran.message.emptyData')}</Text>
      </View>
    );

    const currentMonthKey = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const currentMonthStatus = user.months?.[currentMonthKey]?.status || 'UNPAID';

    return (
      <View style={{ padding: 16 }}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: currentMonthStatus === 'PAID' ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[styles.statusTitle, { color: currentMonthStatus === 'PAID' ? '#166534' : '#991b1b' }]}>
            {t('iuran.status.thisMonth')}
          </Text>
          <Text style={[styles.statusMain, { color: currentMonthStatus === 'PAID' ? '#15803d' : '#b91c1c' }]}>
            {currentMonthStatus === 'PAID' ? t('iuran.status.paid').toUpperCase() : t('iuran.status.unpaid').toUpperCase()}
          </Text>
        </View>

        {/* History List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('iuran.history.title')}</Text>
        <View style={[styles.historyContainer, { backgroundColor: colors.card }]}>
          {Object.entries(user.months || {}).length === 0 ? (
             <Text style={{ padding: 16, color: colors.textSecondary, textAlign: 'center' }}>
               {t('iuran.history.empty')}
             </Text>
          ) : (
            Object.entries(user.months || {})
              .sort((a, b) => b[0].localeCompare(a[0])) // Sort descending by month
              .map(([key, monthData]) => (
                <View key={key} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View>
                    <Text style={[styles.historyMonth, { color: colors.text }]}>{getMonthName(key)}</Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                      {monthData.details?.[0]?.date || '-'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                     <Text style={[styles.historyAmount, { color: colors.text }]}>
                        {monthData.status === 'PAID' ? formatCurrency(monthData.details?.[0]?.amount || data?.standard_fee || 0) : '-'}
                     </Text>
                     <View style={[styles.historyBadge, { 
                       backgroundColor: monthData.status === 'PAID' ? '#dcfce7' : '#fee2e2' 
                     }]}>
                       <Text style={{ fontSize: 10, color: monthData.status === 'PAID' ? '#166534' : '#991b1b' }}>
                         {monthData.status === 'PAID' ? t('iuran.status.paid') : t('iuran.status.unpaid')}
                       </Text>
                     </View>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
           <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleUploadPayment}>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t('iuran.action.reportPayment')}</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleContactRT}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t('iuran.action.contactRT')}</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRTListItem = ({ item }: { item: UserIuran }) => {
    const currentMonthKey = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const status = item.months?.[currentMonthKey]?.status || 'UNPAID';
    
    // Status Color Logic: Hijau (Lunas), Kuning (Sebagian), Merah (Belum Bayar)
    let statusColor = '#ef4444'; 
    let statusBg = '#fee2e2';
    let statusText = t('iuran.status.unpaid');

    if (status === 'PAID') {
      statusColor = '#22c55e'; 
      statusBg = '#dcfce7';
      statusText = t('iuran.status.paid');
    } else if (status === 'PARTIAL') {
      statusColor = '#eab308'; 
      statusBg = '#fef9c3';
      statusText = t('iuran.status.partial');
    }

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
           setSelectedUser(item);
           setModalVisible(true);
        }}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.cardAddress, { color: colors.textSecondary }]}>Rumah No. {item.block}</Text>
          </View>
          <View style={[styles.cardStatus, { backgroundColor: statusBg }]}>
            <Text style={[styles.cardStatusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.whatsAppBtn}
            onPress={() => sendWhatsAppReminder(item)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.whatsAppText}>{t('iuran.action.remind')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.detailBtn}
            onPress={() => {
              setSelectedUser(item);
              setModalVisible(true);
            }}
          >
            <Text style={[styles.detailBtnText, { color: colors.primary }]}>{t('iuran.action.viewDetail')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <BackButton onPress={() => onNavigate('HOME')} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('iuran.title')}</Text>
        <View style={styles.yearFilter}>
           <TouchableOpacity onPress={() => setYear(year - 1)}>
             <Ionicons name="chevron-back" size={20} color={colors.text} />
           </TouchableOpacity>
           <Text style={[styles.yearText, { color: colors.text }]}>{year}</Text>
           <TouchableOpacity onPress={() => setYear(year + 1)}>
             <Ionicons name="chevron-forward" size={20} color={colors.text} />
           </TouchableOpacity>
           {!isRestrictedRole && (
             <TouchableOpacity
               onPress={async () => {
                 try {
                   const filteredIds = processedData.list.map(u => u.id);
                   if (filteredIds.length === 0) {
                     Alert.alert('Info', 'Tidak ada warga dalam daftar filter.');
                     return;
                   }
                   
                   await api.post('/reports/dues/remind-bulk', { 
                     year,
                     user_ids: filteredIds 
                   });
                   Alert.alert('Sukses', 'Blast pengingat iuran telah dikirim sesuai filter.');
                 } catch (error: any) {
                   Alert.alert('Gagal', error?.response?.data?.message || 'Gagal melakukan blast pengingat');
                 }
               }}
               style={{ marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: '#10b981' }}
             >
               <Ionicons name="megaphone-outline" size={18} color="#fff" />
             </TouchableOpacity>
           )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {isRestrictedRole ? (
            <ScrollView 
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              {renderWargaView()}
            </ScrollView>
          ) : (
            <FlatList
              data={processedData.list}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRTListItem}
              ListHeaderComponent={renderDashboard()}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('iuran.message.emptyData')}</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Year Detail Modal */}
      <YearDetailModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        user={selectedUser}
        year={year}
        standardFee={data?.standard_fee || 0}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8, flex: 1 },
  yearFilter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearText: { fontSize: 16, fontWeight: '600' },
  
  // Dashboard
  dashboardContainer: { marginBottom: 20 },
  statCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statLabel: { color: '#fff', opacity: 0.9, fontSize: 14, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statRow: { flexDirection: 'row', gap: 12 },
  statCardSmall: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statLabelSmall: { fontSize: 12, marginBottom: 4 },
  statValueSmall: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statSub: { fontSize: 10 },

  // Warga View
  statusCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  statusMain: { fontSize: 28, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  historyContainer: {
    borderRadius: 16,
    padding: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  historyMonth: { fontSize: 16, fontWeight: '600' },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: 'bold' },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600' },

  // List Item
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold' },
  cardAddress: { fontSize: 14, marginTop: 2 },
  cardStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardStatusText: { fontSize: 12, fontWeight: 'bold' },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  whatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  whatsAppText: { color: '#25D366', fontWeight: '600', fontSize: 14 },
  detailBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  detailBtnText: { fontWeight: '600', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailMonth: { fontSize: 16, fontWeight: '600' },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
  
  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16 },
});

export default IuranScreen;
