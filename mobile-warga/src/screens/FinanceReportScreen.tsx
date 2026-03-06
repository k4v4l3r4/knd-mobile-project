import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { BackButton } from '../components/BackButton';
import api, { BASE_URL } from '../services/api';
import { settingService } from '../services/setting';
import { formatPhoneNumber } from '../utils/phoneUtils';

interface KasSummary {
  balance: number;
  total_in: number;
  total_out: number;
  breakdown?: Record<string, number>;
}

interface Transaction {
  id: number;
  created_at: string;
  direction: 'IN' | 'OUT';
  amount: number;
  description: string;
  source_type: string;
  origin: string;
  account_id?: number | null;
  user?: {
    id: number;
    name: string;
    block: string;
  };
  wallet?: {
    id: number;
    name: string;
  };
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface Fee {
  id: number;
  name: string;
  is_mandatory: boolean;
}

interface ActivityCategory {
  id: number;
  name: string;
}

interface DuesMonth {
  paid: number;
  pending: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  details: any[];
}

interface DuesUser {
  id: number;
  name: string;
  block: string;
  photo_url: string | null;
  role: string;
  phone: string | null;
  status_in_family: string;
  is_kepala_keluarga: boolean;
  months: Record<string, DuesMonth>;
  total_year: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const FinanceReportScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired } = useTenant();
  const styles = getStyles(colors, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<KasSummary>({ balance: 0, total_in: 0, total_out: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [userRole, setUserRole] = useState<string>('WARGA');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Advanced Filters
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string>('ALL');
  
  // Transaction Action State
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'IN' | 'OUT' | 'TRANSFER'>('IN');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [activities, setActivities] = useState<ActivityCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [feeNature, setFeeNature] = useState<'WAJIB' | 'SUKARELA'>('WAJIB');
  
  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    sourceType: '',
    accountId: '',
    fromAccountId: '',
    toAccountId: ''
  });

  // Check if user has admin privileges for finance
  const isAdmin = ['ADMIN_RT', 'ADMIN_RW', 'BENDAHARA_RT', 'RT', 'RW'].includes(userRole);

  // Tab State
  const [activeTab, setActiveTab] = useState<'FINANCE' | 'DUES'>('FINANCE');

  // Dues Monitoring State
  const [duesData, setDuesData] = useState<{ users: DuesUser[]; monthly_totals: any } | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [loadingDues, setLoadingDues] = useState(false);

  const fetchDuesRecap = async () => {
    if (!isAdmin) return;
    setLoadingDues(true);
    try {
      const res = await settingService.getDuesRecap(selectedYear);
      if (res.data.success) {
        setDuesData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching dues recap:', error);
    } finally {
      setLoadingDues(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DUES' && isAdmin) {
      fetchDuesRecap();
    }
  }, [activeTab, selectedYear, isAdmin]);

  const fetchUserData = useCallback(async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('user_data');
      if (jsonValue != null) {
        const userData = JSON.parse(jsonValue);
        const role = userData.role || 'WARGA';
        setUserRole(role);
        return role;
      }
    } catch (e) {
      console.error('Failed to load user data', e);
    }
    return 'WARGA';
  }, []);

  const fetchData = useCallback(async (roleArg?: string) => {
    try {
      // Determine admin status based on passed role or current state
      const targetRole = roleArg || userRole;
      const checkIsAdmin = ['ADMIN_RT', 'ADMIN_RW', 'BENDAHARA_RT'].includes(targetRole);

      // Fetch sequentially to avoid concurrency issues with dev server
      const summaryRes = await api.get('/rt/kas/summary');
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }

      const transactionsRes = await api.get('/rt/kas/transactions');
      if (transactionsRes.data.success) {
        setTransactions(transactionsRes.data.data.data || []);
      }

      if (checkIsAdmin) {
        const pendingRes = await api.get('/rt/kas/pending');
        if (pendingRes.data.success) {
          setPendingTransactions(pendingRes.data.data || []);
        }
      }

    } catch (error: any) {
      console.error('Error fetching finance report:', error);
      if (error.message === 'Network Error') {
        Alert.alert(
          'Gagal Terhubung',
          `Tidak dapat menghubungi server. Pastikan HP dan Laptop terhubung ke Wi-Fi yang sama.\n\nURL: ${BASE_URL}`
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userRole]); // Depend on userRole for refreshes

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/rt/finance-accounts');
      if (res.data.success) {
        setAccounts(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const [feesRes, activitiesRes] = await Promise.all([
        settingService.getFees(),
        settingService.getActivities(),
      ]);

      const feeData = feesRes?.data?.data || feesRes?.data || [];
      const activityData = activitiesRes?.data?.data || activitiesRes?.data || [];

      setFees(Array.isArray(feeData) ? feeData : []);
      setActivities(Array.isArray(activityData) ? activityData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchUserData().then((role) => fetchData(role));
    fetchAccounts();
    fetchCategories();
  }, [fetchUserData, fetchData]);

  useEffect(() => {
    setSelectedCategory('ALL');
  }, [filterType]);

  useEffect(() => {
    setSelectedSourceAccountId('ALL');
  }, [filterType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchAccounts();
    fetchCategories();
  };

  const handleDownloadReport = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;

      const url = `${BASE_URL}/rt/kas/export/pdf?token=${token}`;
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Tidak dapat membuka link download.');
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal mendownload laporan.');
    }
  };

  const openActionModal = (type: 'IN' | 'OUT' | 'TRANSFER') => {
    setActionType(type);
    const defaultAccountId = accounts.length > 0 ? String(accounts[0].id) : '';
    setFormData({
      amount: '',
      description: '',
      sourceType: '',
      accountId: defaultAccountId,
      fromAccountId: '',
      toAccountId: ''
    });
    setFeeNature('WAJIB');
    setShowCategoryDropdown(false);
    setModalVisible(true);
    
    fetchAccounts();
    fetchCategories();
  };

  const modalCategories = (() => {
    if (actionType === 'IN') {
      const shouldBeMandatory = feeNature === 'WAJIB';
      const feeNames = fees
        .filter((f) => Boolean(f.is_mandatory) === shouldBeMandatory)
        .map((f) => f.name)
        .filter((n) => typeof n === 'string' && n.trim() !== '');
      
      const activityNames = activities
        .map((a) => a.name)
        .filter((n) => typeof n === 'string' && n.trim() !== '');
        
      return [...feeNames, ...activityNames];
    }
    if (actionType === 'OUT') {
      return activities
        .map((a) => a.name)
        .filter((n) => typeof n === 'string' && n.trim() !== '');
    }
    return [];
  })();

  useEffect(() => {
    if (!modalVisible) return;
    if (actionType === 'TRANSFER') return;
    if (!formData.accountId && accounts.length > 0) {
      setFormData(prev => ({ ...prev, accountId: String(accounts[0].id) }));
    }
  }, [accounts, modalVisible, actionType, formData.accountId]);

  useEffect(() => {
    if (!modalVisible) return;
    if (actionType !== 'IN') return;
    if (formData.sourceType && !modalCategories.includes(formData.sourceType)) {
      setFormData(prev => ({ ...prev, sourceType: '' }));
    }
  }, [feeNature, fees, modalVisible, actionType, formData.sourceType, modalCategories]);

  const handleSubmit = async () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), isAdmin ? t('report.trialExpiredAdmin') : t('report.trialExpired'));
      return;
    }
    if (!formData.amount || !formData.description) {
      Alert.alert('Error', 'Mohon lengkapi data');
      return;
    }

    if (actionType === 'TRANSFER') {
      if (!formData.fromAccountId || !formData.toAccountId) {
        Alert.alert('Error', 'Pilih akun asal dan tujuan');
        return;
      }
      if (formData.fromAccountId === formData.toAccountId) {
        Alert.alert('Error', 'Akun asal dan tujuan tidak boleh sama');
        return;
      }
    } else {
      if (!formData.accountId) {
        Alert.alert('Error', 'Pilih sumber kas (Kas & Bank)');
        return;
      }
      if (!formData.sourceType) {
        Alert.alert('Error', 'Pilih kategori transaksi');
        return;
      }
    }

    setSubmitting(true);
    try {
      let endpoint = '/rt/kas/transactions';
      let payload: any = {
        amount: parseFloat(formData.amount.replace(/[^0-9]/g, '')),
        description: formData.description
      };

      if (actionType === 'TRANSFER') {
        endpoint = '/rt/kas/transfer';
        payload = {
          ...payload,
          from_account_id: formData.fromAccountId,
          to_account_id: formData.toAccountId
        };
      } else {
        payload = {
          ...payload,
          account_id: Number(formData.accountId),
          direction: actionType,
          source_type: formData.sourceType
        };
      }

      const response = await api.post(endpoint, payload);
      
      if (response.data.success) {
        Alert.alert('Sukses', response.data.message || 'Transaksi berhasil disimpan');
        setModalVisible(false);
        onRefresh();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal menyimpan transaksi';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setLoading(true);
      const response = await api.post(`/transactions/${id}/verify`);
      if (response.data.success) {
        Alert.alert('Sukses', 'Transaksi berhasil disetujui');
        onRefresh();
      }
    } catch (error: any) {
        const msg = error.response?.data?.message || 'Gagal menyetujui transaksi';
        Alert.alert('Error', msg);
    } finally {
        setLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    Alert.alert(
        'Konfirmasi',
        'Apakah Anda yakin ingin menolak transaksi ini?',
        [
            { text: 'Batal', style: 'cancel' },
            { 
                text: 'Tolak', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        setLoading(true);
                        const response = await api.post(`/transactions/${id}/reject`);
                        if (response.data.success) {
                            Alert.alert('Sukses', 'Transaksi berhasil ditolak');
                            onRefresh();
                        }
                    } catch (error: any) {
                        const msg = error.response?.data?.message || 'Gagal menolak transaksi';
                        Alert.alert('Error', msg);
                    } finally {
                        setLoading(false);
                    }
                }
            }
        ]
    );
  };

  const filteredTransactions = transactions.filter(t => {
    // Type Filter
    if (filterType !== 'ALL' && t.direction !== filterType) return false;

    // Source (Wallet) Filter
    if (selectedSourceAccountId !== 'ALL') {
      const tAccountId = t.wallet?.id ?? t.account_id ?? null;
      if (!tAccountId) return false;
      if (String(tAccountId) !== selectedSourceAccountId) return false;
    }

    // Category Filter
    if (selectedCategory !== 'ALL' && t.source_type !== selectedCategory) return false;

    // Date Range Filter
    const tDate = new Date(t.created_at || new Date());
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (tDate < start) return false;
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (tDate > end) return false;
    }

    return true;
  });

  // Group transactions by Date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const dateObj = new Date(transaction.created_at || new Date());
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const renderGroup = ({ item: date }: { item: string }) => {
    const dayTransactions = groupedTransactions[date];
    const dateLabel = new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <View style={styles.groupContainer}>
        <Text style={styles.groupTitle}>{dateLabel}</Text>
        {dayTransactions.map(transaction => {
            const isIncome = transaction.direction === 'IN';
            return (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={[styles.iconContainer, { backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons 
                    name={isIncome ? 'arrow-down' : 'arrow-up'} 
                    size={20} 
                    color={isIncome ? '#10b981' : '#ef4444'} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc} numberOfLines={1}>{transaction.description}</Text>
                  <Text style={styles.transactionCategory}>{transaction.source_type}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: isIncome ? '#10b981' : '#ef4444' }]}>
                  {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </View>
            );
        })}
      </View>
    );
  };

  const renderDuesTab = () => {
    if (loadingDues && !duesData) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      );
    }

    const months = [
      { id: '01', name: 'Jan' }, { id: '02', name: 'Feb' }, { id: '03', name: 'Mar' },
      { id: '04', name: 'Apr' }, { id: '05', name: 'Mei' }, { id: '06', name: 'Jun' },
      { id: '07', name: 'Jul' }, { id: '08', name: 'Agt' }, { id: '09', name: 'Sep' },
      { id: '10', name: 'Okt' }, { id: '11', name: 'Nov' }, { id: '12', name: 'Des' },
    ];

    const filteredUsers = duesData?.users.filter(u => u.is_kepala_keluarga) || [];

    return (
      <View style={styles.listContent}>
        {/* Year Filter */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16, alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            onPress={() => setSelectedYear((parseInt(selectedYear) - 1).toString())}
            style={{ padding: 8, backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>Tahun {selectedYear}</Text>
          <TouchableOpacity 
            onPress={() => setSelectedYear((parseInt(selectedYear) + 1).toString())}
            style={{ padding: 8, backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: 8 }}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Month Filter */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {months.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: selectedMonth === m.id ? '#10b981' : (isDarkMode ? '#334155' : '#f1f5f9'),
                  borderRadius: 20,
                  marginRight: 8,
                }}
                onPress={() => setSelectedMonth(m.id)}
              >
                <Text style={{ 
                  color: selectedMonth === m.id ? '#fff' : colors.text,
                  fontWeight: selectedMonth === m.id ? 'bold' : 'normal'
                }}>
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Users List */}
        {filteredUsers.map((user) => {
          const monthData = user.months[selectedMonth];
          const isPaid = monthData?.status === 'PAID';
          const isPartial = monthData?.status === 'PARTIAL';
          
          return (
            <View key={user.id} style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#fff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: isDarkMode ? '#334155' : '#f1f5f9'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                 <View style={{
                    width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', 
                    marginRight: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center'
                 }}>
                    {user.photo_url ? (
                      <Image source={{ uri: user.photo_url }} style={{ width: 40, height: 40 }} />
                    ) : (
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#64748b' }}>
                        {user.name.charAt(0)}
                      </Text>
                    )}
                 </View>
                 <View style={{ flex: 1 }}>
                   <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{user.name}</Text>
                   <Text style={{ fontSize: 12, color: colors.textSecondary }}>Blok {user.block}</Text>
                 </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                  backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.2)' : (isPartial ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                }}>
                  <Text style={{ 
                    fontSize: 10, fontWeight: 'bold', 
                    color: isPaid ? '#10b981' : (isPartial ? '#f59e0b' : '#ef4444')
                  }}>
                    {isPaid ? 'LUNAS' : (isPartial ? 'CICIL' : 'BELUM')}
                  </Text>
                </View>

                {!isPaid && user.phone && (
                  <TouchableOpacity 
                    onPress={() => {
                      const phone = formatPhoneNumber(user.phone);
                      Linking.openURL(`whatsapp://send?phone=${phone}&text=Halo Bapak/Ibu ${user.name}, mohon maaf mengganggu. Mengingatkan untuk pembayaran iuran bulan ini. Terima kasih.`);
                    }}
                    style={{
                      width: 36, height: 36, borderRadius: 18, backgroundColor: '#25D366',
                      justifyContent: 'center', alignItems: 'center'
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        
        {filteredUsers.length === 0 && (
          <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>
            Tidak ada data warga.
          </Text>
        )}
        
        <View style={{ height: 100 }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <BackButton onPress={() => onNavigate('HOME')} />
            <Text style={styles.headerTitle}>{t('home.menus.bills') || 'Laporan Kas'}</Text> 
            <View style={{ width: 40 }} />
          </View>

          {isAdmin && (
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 8 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  paddingVertical: 12, 
                  borderBottomWidth: 2, 
                  borderBottomColor: activeTab === 'FINANCE' ? '#10b981' : 'transparent',
                  alignItems: 'center'
                }}
                onPress={() => setActiveTab('FINANCE')}
              >
                <Text style={{ 
                  fontWeight: activeTab === 'FINANCE' ? 'bold' : 'normal',
                  color: activeTab === 'FINANCE' ? '#10b981' : colors.textSecondary,
                  fontSize: 14
                }}>Laporan Kas</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  paddingVertical: 12, 
                  borderBottomWidth: 2, 
                  borderBottomColor: activeTab === 'DUES' ? '#10b981' : 'transparent',
                  alignItems: 'center'
                }}
                onPress={() => setActiveTab('DUES')}
              >
                <Text style={{ 
                  fontWeight: activeTab === 'DUES' ? 'bold' : 'normal',
                  color: activeTab === 'DUES' ? '#10b981' : colors.textSecondary,
                  fontSize: 14
                }}>Monitoring Iuran</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>

      {activeTab === 'FINANCE' ? (
      <FlatList
        data={sortedDates}
        renderItem={renderGroup}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.summaryContainer}>
            {/* Main Balance Card */}
            <LinearGradient
              colors={isDarkMode ? ['#059669', '#047857'] : ['#059669', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View>
                <Text style={styles.balanceLabel}>Saldo Kas RT</Text>
                <Text style={styles.balanceValue}>{formatCurrency(summary.balance)}</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity onPress={handleDownloadReport} style={styles.downloadButton}>
                  <Ionicons name="document-text-outline" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </LinearGradient>

            {/* Admin Action Buttons */}
            {isAdmin && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
                  onPress={() => openActionModal('IN')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
                    <Ionicons name="arrow-down" size={20} color="#fff" />
                  </View>
                  <Text style={[styles.actionText, { color: '#059669' }]}>Pemasukan</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                  onPress={() => openActionModal('OUT')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#ef4444' }]}>
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                  </View>
                  <Text style={[styles.actionText, { color: '#dc2626' }]}>Pengeluaran</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                  onPress={() => openActionModal('TRANSFER')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#3b82f6' }]}>
                    <Ionicons name="swap-horizontal" size={20} color="#fff" />
                  </View>
                  <Text style={[styles.actionText, { color: '#2563eb' }]}>Transfer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pending Transactions Section */}
            {isAdmin && pendingTransactions.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Perlu Verifikasi ({pendingTransactions.length})</Text>
                {pendingTransactions.map((t) => (
                  <View key={t.id} style={styles.pendingCard}>
                    <View style={styles.pendingHeader}>
                        <View>
                            <Text style={styles.pendingUser}>{t.user?.name || 'Warga'}</Text>
                            <Text style={styles.pendingBlock}>{t.user?.block ? `Blok ${t.user.block}` : '-'}</Text>
                        </View>
                        <Text style={styles.pendingAmount}>{formatCurrency(t.amount)}</Text>
                    </View>
                    <Text style={styles.pendingDesc}>{t.description}</Text>
                    <Text style={styles.pendingDate}>{new Date(t.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    
                    <View style={styles.pendingActions}>
                        <TouchableOpacity 
                            style={[styles.pendingButton, styles.rejectButton]} 
                            onPress={() => handleReject(t.id)}
                        >
                            <Text style={styles.rejectText}>Tolak</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.pendingButton, styles.approveButton]} 
                            onPress={() => handleApprove(t.id)}
                        >
                            <Text style={styles.approveText}>Terima</Text>
                        </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Income Breakdown for Admin */}
            {isAdmin && summary.breakdown && Object.keys(summary.breakdown).length > 0 && (
              <View style={styles.walletsContainer}>
                <Text style={[styles.sectionTitle, { marginLeft: 0, fontSize: 14, marginBottom: 8 }]}>Kategori Pemasukan</Text>
                {Object.entries(summary.breakdown).map(([name, amount], index) => (
                  <View key={index} style={styles.walletItem}>
                    <View style={styles.walletIcon}>
                       <Ionicons name="trending-up-outline" size={18} color="#10b981" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.walletName}>{name}</Text>
                    </View>
                    <Text style={styles.walletBalance}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Income/Expense Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { marginRight: 8 }]}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="arrow-down" size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Pemasukan</Text>
                  <Text style={[styles.statValue, { color: '#10b981' }]}>{formatCurrency(summary.total_in || 0)}</Text>
                </View>
              </View>
              
              <View style={[styles.statCard, { marginLeft: 8 }]}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="arrow-up" size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Pengeluaran</Text>
                  <Text style={[styles.statValue, { color: '#ef4444' }]}>{formatCurrency(summary.total_out || 0)}</Text>
                </View>
              </View>
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                <TouchableOpacity 
                    style={[styles.filterButton, filterType === 'ALL' && styles.filterActive]} 
                    onPress={() => setFilterType('ALL')}
                >
                    <Text style={[styles.filterText, filterType === 'ALL' && styles.filterTextActive]}>Semua</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.filterButton, filterType === 'IN' && styles.filterActive]} 
                    onPress={() => setFilterType('IN')}
                >
                    <Text style={[styles.filterText, filterType === 'IN' && styles.filterTextActive]}>Masuk</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.filterButton, filterType === 'OUT' && styles.filterActive]} 
                    onPress={() => setFilterType('OUT')}
                >
                    <Text style={[styles.filterText, filterType === 'OUT' && styles.filterTextActive]}>Keluar</Text>
                </TouchableOpacity>
            </View>

            {/* Advanced Filters */}
            <View style={styles.advancedFilters}>
                <View style={styles.sourceLabelRow}>
                    <Text style={styles.sourceLabel}>Sumber:</Text>
                    <Text style={styles.sourceValue}>
                      {selectedSourceAccountId === 'ALL'
                        ? 'Semua'
                        : accounts.find((a) => String(a.id) === selectedSourceAccountId)?.name || '-'}
                    </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceFilterScroll}>
                    <TouchableOpacity 
                        style={[styles.sourceChip, selectedSourceAccountId === 'ALL' && styles.sourceChipActive]}
                        onPress={() => setSelectedSourceAccountId('ALL')}
                    >
                        <Text style={[styles.sourceChipText, selectedSourceAccountId === 'ALL' && styles.sourceChipTextActive]}>Semua</Text>
                    </TouchableOpacity>
                    {accounts.map((acc) => (
                        <TouchableOpacity 
                            key={acc.id}
                            style={[styles.sourceChip, selectedSourceAccountId === String(acc.id) && styles.sourceChipActive]}
                            onPress={() => setSelectedSourceAccountId(String(acc.id))}
                        >
                            <Text style={[styles.sourceChipText, selectedSourceAccountId === String(acc.id) && styles.sourceChipTextActive]}>{acc.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Date Range */}
                <View style={styles.dateFilterRow}>
                    <TouchableOpacity 
                        style={[styles.dateButton, startDate && styles.dateButtonActive]} 
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={16} color={startDate ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.dateButtonText, startDate && styles.dateButtonTextActive]}>
                            {startDate ? startDate.toLocaleDateString('id-ID') : 'Mulai'}
                        </Text>
                    </TouchableOpacity>
                    <Text style={{ marginHorizontal: 8, color: colors.textSecondary }}>-</Text>
                    <TouchableOpacity 
                        style={[styles.dateButton, endDate && styles.dateButtonActive]} 
                        onPress={() => setShowEndPicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={16} color={endDate ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.dateButtonText, endDate && styles.dateButtonTextActive]}>
                            {endDate ? endDate.toLocaleDateString('id-ID') : 'Sampai'}
                        </Text>
                    </TouchableOpacity>
                    {(startDate || endDate) && (
                        <TouchableOpacity 
                            style={styles.clearDateButton}
                            onPress={() => { setStartDate(null); setEndDate(null); }}
                        >
                            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceFilterScroll}>
                    <TouchableOpacity 
                        style={[styles.sourceChip, selectedCategory === 'ALL' && styles.sourceChipActive]}
                        onPress={() => setSelectedCategory('ALL')}
                    >
                        <Text style={[styles.sourceChipText, selectedCategory === 'ALL' && styles.sourceChipTextActive]}>Semua</Text>
                    </TouchableOpacity>
                    {Array.from(
                        new Set(
                            transactions
                                .filter((t) => (filterType === 'ALL' ? true : t.direction === filterType))
                                .map((t) => t.source_type)
                                .filter((v) => typeof v === 'string' && v.trim() !== '')
                        )
                    ).map((cat) => (
                        <TouchableOpacity 
                            key={cat}
                            style={[styles.sourceChip, selectedCategory === cat && styles.sourceChipActive]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.sourceChipText, selectedCategory === cat && styles.sourceChipTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            
            <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
              <Text style={styles.emptyText}>Belum ada transaksi</Text>
            </View>
          ) : null
        }
      />
      ) : (
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={loadingDues} onRefresh={fetchDuesRecap} tintColor={colors.primary} />
          }
        >
          {renderDuesTab()}
        </ScrollView>
      )}
      
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {(showStartPicker || showEndPicker) && (
        Platform.OS === 'ios' ? (
             <Modal
                transparent={true}
                animationType="fade"
                visible={true}
                onRequestClose={() => { setShowStartPicker(false); setShowEndPicker(false); }}
             >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: isDarkMode ? '#1e293b' : 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Batal</Text>
                            </TouchableOpacity>
                            <Text style={{ fontWeight: 'bold', color: colors.text }}>
                                Pilih {showStartPicker ? 'Tanggal Mulai' : 'Tanggal Akhir'}
                            </Text>
                            <TouchableOpacity onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }}>
                                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Selesai</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={showStartPicker ? (startDate || new Date()) : (endDate || new Date())}
                            mode="date"
                            display="spinner"
                            onChange={(event, date) => {
                                if (date) {
                                    if (showStartPicker) setStartDate(date);
                                    else setEndDate(date);
                                }
                            }}
                            textColor={colors.text}
                            themeVariant={isDarkMode ? 'dark' : 'light'}
                        />
                    </View>
                </View>
             </Modal>
        ) : (
             <DateTimePicker
                value={showStartPicker ? (startDate || new Date()) : (endDate || new Date())}
                mode="date"
                display="default"
                onChange={(event, date) => {
                    const isStart = showStartPicker;
                    setShowStartPicker(false);
                    setShowEndPicker(false);
                    if (event.type === 'set' && date) {
                        if (isStart) setStartDate(date);
                        else setEndDate(date);
                    }
                }}
             />
        )
      )}

      {/* Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1e293b' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {actionType === 'IN' ? 'Tambah Pemasukan' : 
                 actionType === 'OUT' ? 'Tambah Pengeluaran' : 'Transfer Kas'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nominal (Rp)</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={formData.amount}
                  onChangeText={(text) => setFormData({...formData, amount: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Keterangan</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Contoh: Iuran Bulanan"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                />
              </View>

              {actionType !== 'TRANSFER' ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Sumber (Kas & Bank)</Text>
                    {accounts.length > 0 ? (
                      <View style={styles.accountList}>
                        {accounts.map(acc => (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.accountOption,
                              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                              formData.accountId === String(acc.id) && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                            ]}
                            onPress={() => setFormData({ ...formData, accountId: String(acc.id) })}
                          >
                            <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
                            <Text style={styles.accountBalance}>{formatCurrency(acc.balance)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Belum ada akun kas. Hubungi Admin.</Text>
                    )}
                  </View>

                  {actionType === 'IN' && (
                    <View style={styles.formGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>Sifat Iuran</Text>
                      <View style={styles.natureRow}>
                        <TouchableOpacity
                          style={[
                            styles.natureOption,
                            feeNature === 'WAJIB' && styles.natureOptionActive
                          ]}
                          onPress={() => setFeeNature('WAJIB')}
                        >
                          <Text style={[styles.natureText, feeNature === 'WAJIB' && styles.natureTextActive]}>Wajib</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.natureOption,
                            feeNature === 'SUKARELA' && styles.natureOptionActive
                          ]}
                          onPress={() => setFeeNature('SUKARELA')}
                        >
                          <Text style={[styles.natureText, feeNature === 'SUKARELA' && styles.natureTextActive]}>Sukarela</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Kategori</Text>
                    
                    <TouchableOpacity 
                      style={[styles.dropdownButton, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                      onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      disabled={modalCategories.length === 0}
                    >
                      <Text style={[styles.dropdownButtonText, { color: colors.text }]}>
                        {formData.sourceType ? formData.sourceType : modalCategories.length > 0 ? 'Pilih kategori' : 'Belum ada kategori'}
                      </Text>
                      <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {showCategoryDropdown && (
                      <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1e293b' : '#fff', maxHeight: 300 }]}>
                        <ScrollView nestedScrollEnabled={true}>
                        {actionType === 'IN' ? (
                          <>
                            <Text style={{ 
                              color: colors.textSecondary, 
                              fontSize: 12, 
                              fontWeight: 'bold', 
                              paddingHorizontal: 12, 
                              paddingTop: 8, 
                              paddingBottom: 4 
                            }}>
                              IURAN & PEMASUKAN ({feeNature})
                            </Text>
                            {fees
                              .filter(f => Boolean(f.is_mandatory) === (feeNature === 'WAJIB'))
                              .map((fee) => (
                                <TouchableOpacity
                                  key={`fee-${fee.id}`}
                                  style={[
                                    styles.dropdownItem,
                                    formData.sourceType === fee.name && { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' },
                                    { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                  ]}
                                  onPress={() => {
                                    setFormData({ ...formData, sourceType: fee.name });
                                    setShowCategoryDropdown(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.dropdownItemText, 
                                    { color: colors.text },
                                    formData.sourceType === fee.name && { color: '#10b981', fontWeight: 'bold' }
                                  ]}>
                                    {fee.name}
                                  </Text>
                                  {formData.sourceType === fee.name && (
                                    <Ionicons name="checkmark" size={18} color="#10b981" />
                                  )}
                                </TouchableOpacity>
                              ))}
                            
                            <Text style={{ 
                              color: colors.textSecondary, 
                              fontSize: 12, 
                              fontWeight: 'bold', 
                              paddingHorizontal: 12, 
                              paddingTop: 12, 
                              paddingBottom: 4 
                            }}>
                              KEGIATAN RT
                            </Text>
                            {activities.map((act) => (
                              <TouchableOpacity
                                key={`act-${act.id}`}
                                style={[
                                  styles.dropdownItem,
                                  formData.sourceType === act.name && { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' },
                                  { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                ]}
                                onPress={() => {
                                  setFormData({ ...formData, sourceType: act.name });
                                  setShowCategoryDropdown(false);
                                }}
                              >
                                <Text style={[
                                  styles.dropdownItemText, 
                                  { color: colors.text },
                                  formData.sourceType === act.name && { color: '#10b981', fontWeight: 'bold' }
                                ]}>
                                  {act.name}
                                </Text>
                                {formData.sourceType === act.name && (
                                  <Ionicons name="checkmark" size={18} color="#10b981" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </>
                        ) : (
                          modalCategories.map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              style={[
                                styles.dropdownItem,
                                formData.sourceType === cat && { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' },
                                { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                              ]}
                              onPress={() => {
                                setFormData({ ...formData, sourceType: cat });
                                setShowCategoryDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.dropdownItemText, 
                                { color: colors.text },
                                formData.sourceType === cat && { color: '#10b981', fontWeight: 'bold' }
                              ]}>
                                {cat}
                              </Text>
                              {formData.sourceType === cat && (
                                <Ionicons name="checkmark" size={18} color="#10b981" />
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Dari Akun</Text>
                    {accounts.length > 0 ? (
                      <View style={styles.accountList}>
                        {accounts.map(acc => (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.accountOption,
                              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                              formData.fromAccountId === String(acc.id) && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                            ]}
                            onPress={() => setFormData({...formData, fromAccountId: String(acc.id)})}
                          >
                            <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
                            <Text style={styles.accountBalance}>{formatCurrency(acc.balance)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                       <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Belum ada akun dompet. Hubungi Admin.</Text>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Ke Akun</Text>
                    {accounts.length > 0 ? (
                      <View style={styles.accountList}>
                        {accounts.map(acc => (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.accountOption,
                              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                              formData.toAccountId === String(acc.id) && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                            ]}
                            onPress={() => setFormData({...formData, toAccountId: String(acc.id)})}
                          >
                            <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
                            <Text style={styles.accountBalance}>{formatCurrency(acc.balance)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                       <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Belum ada akun dompet. Hubungi Admin.</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[
                styles.submitButton, 
                { backgroundColor: actionType === 'IN' ? '#10b981' : actionType === 'OUT' ? '#ef4444' : '#3b82f6' }
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Simpan Transaksi</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9',
    paddingBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryContainer: {
    marginBottom: 8,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  downloadButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  walletsContainer: {
      backgroundColor: isDarkMode ? '#1e293b' : '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#f1f5f9',
  },
  walletItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  walletIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  walletName: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
  },
  walletBalance: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterContainer: {
      flexDirection: 'row',
      marginBottom: 24,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      padding: 4,
      borderRadius: 12,
  },
  filterButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 10,
  },
  filterActive: {
      backgroundColor: isDarkMode ? '#334155' : '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
  },
  filterText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
  },
  filterTextActive: {
      color: colors.primary,
      fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  pendingCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pendingUser: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pendingBlock: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pendingAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b', // Amber/Yellow for pending
  },
  pendingDesc: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  pendingDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pendingButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  approveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  groupContainer: {
      marginBottom: 16,
  },
  groupTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
      marginLeft: 4,
  },
  transactionCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.textSecondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  submitButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountList: {
    gap: 8,
  },
  accountOption: {
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 12,
    color: '#059669',
  },
  natureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  natureOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
  },
  natureOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  natureText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  natureTextActive: {
    color: '#fff',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  advancedFilters: {
    marginBottom: 24,
  },
  sourceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sourceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sourceValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    gap: 8,
  },
  dateButtonActive: {
    borderColor: colors.primary,
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
  },
  dateButtonText: {
    fontSize: 13,
    color: colors.text,
  },
  dateButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  clearDateButton: {
    marginLeft: 8,
    padding: 4,
  },
  sourceFilterScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  sourceChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    marginRight: 8,
    marginBottom: 4,
  },
  sourceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sourceChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sourceChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default FinanceReportScreen;
