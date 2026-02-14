import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Dimensions,
  Platform,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';

const { width } = Dimensions.get('window');

interface Fee {
  id: number;
  name: string;
  amount: string; // or number
  description: string;
}

interface TransactionItem {
  fee_id: number;
  name: string;
  amount: number;
}

interface Transaction {
  id: number;
  date: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'VERIFIED' | 'REJECTED';
  description: string;
  items: TransactionItem[] | null;
}

interface BillsData {
  unpaid: Fee[];
  history: Transaction[];
}

export default function BillsScreen({ initialTab = 'bills', onNavigate }: { initialTab?: 'bills' | 'history', onNavigate?: (screen: string, data?: any) => void }) {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isTrial, isExpired } = useTenant();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeTab, setActiveTab] = useState<'bills' | 'history'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<BillsData>({ unpaid: [], history: [] });
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Selection State
  const [selectedFees, setSelectedFees] = useState<number[]>([]);

  const fetchBills = async () => {
    try {
      const response = await api.get('/warga/bills');
      if (response.data.success) {
        setData(response.data.data);
        // Auto-select all unpaid bills by default
        const allUnpaidIds = response.data.data.unpaid.map((item: Fee) => item.id);
        setSelectedFees(allUnpaidIds);
      }
    } catch (error: any) {
      console.log('Error fetching bills:', error);
      if (error.response?.status === 401) {
         Alert.alert(t('common.sessionExpired'), t('common.sessionExpiredMsg'), [{ text: t('common.ok') }]);
      } else {
         Alert.alert(t('common.error'), t('bills.loadFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // Removed useEffect for initialTab to prevent conflict with Smart Tab Logic in fetchBills
  // The fetchBills logic will determine the correct tab based on data availability
  // If we strictly want to respect initialTab ONLY when it's explicitly 'history' AND there are no bills,
  // the smart logic already handles "no bills -> history".
  // If we want to respect initialTab='history' even if there ARE bills, we should modify fetchBills.
  // But user requested: "if bills -> bills tab first, if no bills -> history".
  // So data-driven logic takes precedence.
  
  /*
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  */

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
  };

  const toggleFee = (id: number) => {
    setSelectedFees(prev => 
      prev.includes(id) ? prev.filter(feeId => feeId !== id) : [...prev, id]
    );
  };

  const handlePayPress = () => {
    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('bills.demoPayment'));
      return;
    }
    if (isTrial) {
      Alert.alert(t('common.featureLimited'), t('bills.trialPayment'));
      return;
    }
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('bills.expiredPayment'));
      return;
    }

    if (selectedFees.length === 0) {
      Alert.alert(t('bills.selectBillTitle'), t('bills.selectBillMsg'));
      return;
    }
    
    if (onNavigate) {
      onNavigate('PAYMENT', {
        amount: selectedTotal,
        fee_ids: selectedFees,
        description: t('bills.paymentDescription', { count: selectedFees.length })
      });
    }
  };

  const formatRupiah = (amount: number | string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(amount));
  };

  const renderStatusBadge = (status: string) => {
    let color = isDarkMode ? '#94a3b8' : '#64748b';
    let bgColor = isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9';
    let label = status;

    switch (status) {
      case 'PAID':
      case 'VERIFIED':
        color = '#059669'; // Emerald
        bgColor = 'rgba(5, 150, 105, 0.1)';
        label = t('bills.status.paid');
        break;
      case 'PENDING':
        color = '#F59E0B'; // Amber
        bgColor = 'rgba(245, 158, 11, 0.1)';
        label = t('bills.status.pending');
        break;
      case 'REJECTED':
        color = '#EF4444'; // Rose
        bgColor = 'rgba(239, 68, 68, 0.1)';
        label = t('bills.status.rejected');
        break;
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: color }]}>{label}</Text>
      </View>
    );
  };

  const getCurrentPeriod = () => {
    const date = new Date();
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
  };

  const currentPeriod = useMemo(() => getCurrentPeriod(), [language]);

  const selectedTotal = useMemo(() => {
    return data.unpaid
        .filter(item => selectedFees.includes(item.id))
        .reduce((sum, item) => sum + Number(item.amount), 0);
  }, [selectedFees, data.unpaid]);

  const renderBillItem = ({ item }: { item: Fee }) => {
    const isSelected = selectedFees.includes(item.id);
    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && { borderColor: colors.primary, borderWidth: 1, backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.05)' : '#ecfdf5' }]}
        onPress={() => toggleFee(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            {/* Checkbox */}
            <View style={{ marginRight: 12, justifyContent: 'center' }}>
                <Ionicons 
                    name={isSelected ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={isSelected ? colors.primary : colors.textSecondary} 
                />
            </View>

            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{t('bills.billFor')} {currentPeriod}</Text>
            </View>
          </View>
          <Text style={styles.amountText}>{formatRupiah(item.amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = ({ item }: { item: Transaction }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyDateContainer}>
          <MaterialCommunityIcons name="calendar-month-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.historyDate}>
            {new Date(item.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        {renderStatusBadge(item.status)}
      </View>
      <View style={styles.separator} />
      <View style={styles.historyBody}>
        <Text style={styles.historyDesc}>{item.description}</Text>
        <Text style={styles.historyAmount}>{formatRupiah(item.amount)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={styles.headerTitle}>{t('bills.title')}</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* Content Container with overlapping effect */}
      <View style={styles.mainContainer}>
        {/* Custom Tab Segment */}
        <View style={styles.tabContainer}>
          <View style={styles.tabWrapper}>
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 'bills' && styles.activeTabButton, 
                { 
                  backgroundColor: activeTab === 'bills' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#ecfdf5') : 'transparent',
                  borderWidth: activeTab === 'bills' ? 1.5 : 0,
                  borderColor: activeTab === 'bills' ? colors.primary : 'transparent'
                }
              ]}
              onPress={() => setActiveTab('bills')}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 12 }}>
                <Text style={[styles.tabText, activeTab === 'bills' && styles.activeTabText]}>
                  {t('bills.tabs.bills')}
                </Text>
                {data.unpaid.length > 0 && (
                  <View style={styles.notificationDot} />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 'history' && styles.activeTabButton, 
                { 
                  backgroundColor: activeTab === 'history' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#ecfdf5') : 'transparent',
                  borderWidth: activeTab === 'history' ? 1.5 : 0,
                  borderColor: activeTab === 'history' ? colors.primary : 'transparent'
                }
              ]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 12 }}>
                <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                  {t('bills.tabs.history')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            activeTab === 'bills' ? (
              <>
                <FlatList
                  data={data.unpaid}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderBillItem}
                  contentContainerStyle={styles.listContent}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconContainer}>
                        <MaterialCommunityIcons 
                          name="check-circle-outline" 
                          size={64} 
                          color={colors.primary} 
                        />
                      </View>
                      <Text style={styles.emptyTitle}>{t('bills.empty.billsTitle')}</Text>
                      <Text style={styles.emptyText}>
                        {t('bills.empty.billsMsg')}
                      </Text>
                    </View>
                  }
                />
              </>
            ) : (
              <FlatList
                data={data.history}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderHistoryItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                      <MaterialCommunityIcons 
                        name="history" 
                        size={64} 
                        color={colors.textSecondary} 
                      />
                    </View>
                    <Text style={styles.emptyTitle}>{t('bills.empty.historyTitle')}</Text>
                    <Text style={styles.emptyText}>
                      {t('bills.empty.historyMsg')}
                    </Text>
                  </View>
                }
              />
            )
          )}
        </View>
      </View>

      {/* Floating Payment Bar - Moved to Root Level and Lifted above Tab Bar */}
      {activeTab === 'bills' && data.unpaid.length > 0 && !loading && (
        <View style={{ 
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 90 : 80, // Lift above Bottom Tab Bar
            left: 16,
            right: 16,
            backgroundColor: colors.card, 
            borderRadius: 20,
            padding: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
            zIndex: 1000,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        }}>
            <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>{t('bills.totalPayment')}</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{formatRupiah(selectedTotal)}</Text>
            </View>
            <TouchableOpacity
                style={{ 
                    backgroundColor: selectedFees.length > 0 ? colors.primary : '#94a3b8', 
                    borderRadius: 14, 
                    paddingHorizontal: 20,
                    height: 44,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minWidth: 100
                }}
                onPress={handlePayPress}
            >
                <Text style={styles.payButtonText}>
                  {selectedFees.length > 0 ? `${t('bills.payButton')} (${selectedFees.length})` : t('bills.payButton')}
                </Text>
            </TouchableOpacity>
        </View>
      )}

      {/* Payment Confirmation Modal Removed */}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainContainer: {
    flex: 1,
    marginTop: -25, // Overlap with header
    zIndex: 20,
  },
  // Modern Tabs
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f0fdf9',
    // We remove heavy shadow for cleaner look in tabs, just color change
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: 10,
    right: '20%',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 200,
  },
  // Card Styles
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'visible', // Changed to visible for shadow
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  cardContent: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.1)' : 'rgba(5, 150, 105, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  amountText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  payButtonWrapper: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    // Add margin to prevent overflow visual issues
    marginTop: 8
  },
  payButton: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%', // Ensure it takes full width of wrapper
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  // History Styles
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  historyDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
    marginVertical: 12,
  },
  historyBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDesc: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    marginRight: 12,
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.05)' : 'rgba(5, 150, 105, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.1)' : '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  modalInfoBox: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    alignItems: 'center',
    width: '100%',
  },
  modalSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
