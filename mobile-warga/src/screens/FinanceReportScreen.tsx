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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { BackButton } from '../components/BackButton';
import api, { BASE_URL } from '../services/api';

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
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
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
  const styles = getStyles(colors, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<KasSummary>({ balance: 0, total_in: 0, total_out: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userRole, setUserRole] = useState<string>('WARGA');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  
  // Transaction Action State
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'IN' | 'OUT' | 'TRANSFER'>('IN');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    sourceType: '',
    fromAccountId: '',
    toAccountId: ''
  });
  
  const INCOME_CATEGORIES = ['Iuran Warga', 'Sumbangan', 'Parkir', 'Denda', 'Lainnya'];
  const EXPENSE_CATEGORIES = ['Operasional', 'Keamanan', 'Kebersihan', 'Listrik', 'Air', 'Perbaikan', 'Lainnya'];
  
  const categories = actionType === 'IN' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Check if user has admin privileges for finance
  const isAdmin = ['ADMIN_RT', 'ADMIN_RW', 'BENDAHARA_RT'].includes(userRole);

  const fetchUserData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('user_data');
      if (jsonValue != null) {
        const userData = JSON.parse(jsonValue);
        setUserRole(userData.role || 'WARGA');
      }
    } catch (e) {
      console.error('Failed to load user data', e);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      // Fetch sequentially to avoid concurrency issues with dev server
      const summaryRes = await api.get('/rt/kas/summary');
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }

      const transactionsRes = await api.get('/rt/kas/transactions');
      if (transactionsRes.data.success) {
        setTransactions(transactionsRes.data.data.data || []);
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
  }, []);

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

  useEffect(() => {
    fetchUserData().then(() => fetchData());
  }, [fetchUserData, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
    setFormData({
      amount: '',
      description: '',
      sourceType: type === 'IN' ? 'Iuran Warga' : 'Operasional',
      fromAccountId: '',
      toAccountId: ''
    });
    setShowCategoryDropdown(false);
    setModalVisible(true);
    
    if (type === 'TRANSFER') {
      fetchAccounts();
    }
  };

  const handleSubmit = async () => {
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

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'ALL') return true;
    return t.direction === filterType;
  });

  // Group transactions by Date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const dateStr = transaction.created_at || new Date().toISOString();
    const date = dateStr.split(' ')[0];
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <BackButton onPress={() => onNavigate('HOME')} />
            <Text style={styles.headerTitle}>{t('home.menus.bills') || 'Laporan Kas'}</Text> 
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

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

            {/* Income Breakdown for Admin */}
            {isAdmin && summary.breakdown && Object.keys(summary.breakdown).length > 0 && (
              <View style={styles.walletsContainer}>
                <Text style={[styles.sectionTitle, { marginLeft: 0, fontSize: 14, marginBottom: 8 }]}>Sumber Pemasukan</Text>
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
      
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Kategori / Sumber</Text>
                  
                  <TouchableOpacity 
                    style={[styles.dropdownButton, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  >
                    <Text style={[styles.dropdownButtonText, { color: colors.text }]}>{formData.sourceType}</Text>
                    <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {showCategoryDropdown && (
                    <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1e293b' : '#fff' }]}>
                      {categories.map((cat) => (
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
                      ))}
                    </View>
                  )}
                </View>
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
    marginLeft: 4,
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
});

export default FinanceReportScreen;
