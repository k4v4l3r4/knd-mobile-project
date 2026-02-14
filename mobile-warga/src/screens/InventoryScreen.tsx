import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getStorageUrl } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { useLanguage } from '../context/LanguageContext';

// Types
interface Asset {
  id: number;
  name: string;
  description: string;
  total_quantity: number;
  available_quantity: number;
  condition: 'BAIK' | 'RUSAK';
  image_url: string | null;
}

interface AssetLoan {
  id: number;
  asset: Asset;
  quantity: number;
  loan_date: string;
  status: 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED';
}

export default function InventoryScreen() {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeTab, setActiveTab] = useState<'assets' | 'history'>('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loans, setLoans] = useState<AssetLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Loan Modal
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loanQuantity, setLoanQuantity] = useState('1');
  const [loanDate, setLoanDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'assets') {
        const res = await api.get('/assets', { 
          params: { search }
        });
        setAssets(res.data.data);
      } else {
        const res = await api.get('/assets/loans/my');
        setLoans(res.data.data);
      }
    } catch (error: any) {
      console.log(error);
      if (error.response?.status === 401) {
        Alert.alert(t('common.sessionExpired'), t('common.sessionExpiredMessage'));
      } else {
        Alert.alert(t('common.error'), t('common.error.loadData'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleBorrow = async () => {
    if (isExpired) {
      Alert.alert(t('common.accessLimited'), t('common.accessLimitedMessage'));
      return;
    }
    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('market.demoModeCreate')); // Using generic demo message or similar
      return;
    }

    if (!selectedAsset) return;
    
    const qty = parseInt(loanQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert(t('common.error'), t('inventory.validation.invalidQuantity'));
      return;
    }
    if (qty > selectedAsset.available_quantity) {
      Alert.alert(t('common.error'), t('inventory.validation.insufficientStock'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/assets/loan', {
        asset_id: selectedAsset.id,
        quantity: qty,
        loan_date: loanDate.toISOString().split('T')[0]
      });
      
      Alert.alert(t('common.success'), t('inventory.success.loanSubmitted'));
      setModalVisible(false);
      setLoanQuantity('1');
      fetchData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('inventory.error.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderAssetItem = ({ item }: { item: Asset }) => {
    const imageUrl = getStorageUrl(item.image_url);
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          setSelectedAsset(item);
          setDetailModalVisible(true);
        }}
      >
        <Image 
          source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/150' }} 
          style={styles.cardImage} 
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          
          <View style={styles.stockInfo}>
            <Text style={styles.stockText}>
              {t('inventory.stock')}: <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.available_quantity}</Text> / {item.total_quantity}
            </Text>
            <View style={[styles.badge, item.condition === 'BAIK' ? styles.bgGreen : styles.bgRed]}>
              <Text style={[styles.badgeText, item.condition === 'BAIK' ? styles.textGreen : styles.textRed]}>
                {item.condition}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.borrowBtn, 
              { backgroundColor: colors.primary },
              item.available_quantity === 0 && { backgroundColor: colors.border, opacity: 0.7 }
            ]}
            disabled={item.available_quantity === 0}
            onPress={() => {
              setSelectedAsset(item);
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.borrowBtnGradient}>
              <Text style={styles.borrowBtnText}>
                {item.available_quantity === 0 ? t('inventory.stockEmpty') : t('inventory.borrow')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLoanItem = ({ item }: { item: AssetLoan }) => (
    <View style={styles.loanCard}>
      <View style={styles.loanHeader}>
        <View style={styles.loanIconBox}>
           <MaterialCommunityIcons name="cube-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.loanTitle}>{item.asset.name}</Text>
            <Text style={styles.loanDate}>{t('inventory.loanDate')}: {item.loan_date}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'APPROVED' ? styles.bgBlue :
          item.status === 'RETURNED' ? styles.bgGreen :
          item.status === 'REJECTED' ? styles.bgRed : styles.bgYellow
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'APPROVED' ? styles.textBlue :
            item.status === 'RETURNED' ? styles.textGreen :
            item.status === 'REJECTED' ? styles.textRed : styles.textYellow
          ]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.loanDivider} />
      <View style={styles.loanFooter}>
         <Text style={styles.loanDetail}>{t('inventory.stock')}: {item.quantity} {t('inventory.quantityUnit')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with Pattern */}
      <View
        style={[styles.headerBackground, { backgroundColor: colors.primary }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
              <View style={{ width: 40 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.headerTitle}>{t('inventory.title')}</Text>
                <DemoLabel />
              </View>
              <View style={{ width: 40 }} /> 
            </View>

            {/* Search Bar */}
            {activeTab === 'assets' && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('common.search')}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={fetchData}
                  returnKeyType="search"
                />
              </View>
            )}
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'assets' && styles.activeTab]}
            onPress={() => setActiveTab('assets')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'assets' && styles.activeTabText]}>
              {t('inventory.tabs.assets')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              {t('inventory.tabs.myLoans')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'assets' ? (
          <FlatList<Asset>
            data={assets}
            renderItem={renderAssetItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <MaterialCommunityIcons name="cube-off-outline" size={64} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyText}>{t('common.noData')}</Text>
              </View>
            }
          />
        ) : (
          <FlatList<AssetLoan>
            data={loans}
            renderItem={renderLoanItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <MaterialCommunityIcons name="cube-off-outline" size={64} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyText}>{t('common.noData')}</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Borrow Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('inventory.modal.title')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={{width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#334155' : '#f1f5f9'}}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>
            
            {selectedAsset && (
              <View style={styles.modalBody}>
                <Text style={styles.modalAssetName}>{selectedAsset.name}</Text>
                
                <Text style={styles.inputLabel}>{t('inventory.modal.quantity')}</Text>
                <TextInput
                  style={styles.input}
                  value={loanQuantity}
                  onChangeText={setLoanQuantity}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.inputLabel}>{t('inventory.modal.date')}</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Text style={styles.dateText}>{loanDate.toLocaleDateString('id-ID')}</Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={loanDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(_: any, date?: Date) => {
                      setShowDatePicker(false);
                      if (date) setLoanDate(date);
                    }}
                  />
                )}

                <TouchableOpacity
                  onPress={handleBorrow}
                  disabled={submitting}
                  style={[
                    styles.modalSubmitBtn,
                    { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, marginTop: 20 },
                    submitting && { opacity: 0.7 }
                  ]}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>{t('inventory.modal.submit')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('inventory.detail.title')}</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={{width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#334155' : '#f1f5f9'}}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>
            
            {selectedAsset && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                 <Image 
                  source={{ uri: getStorageUrl(selectedAsset.image_url) || 'https://via.placeholder.com/300' }} 
                  style={{ width: '100%', height: 250, borderRadius: 16, marginBottom: 20, resizeMode: 'cover' }} 
                />
                
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                  {selectedAsset.name}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                   <View style={[styles.badge, selectedAsset.condition === 'BAIK' ? styles.bgGreen : styles.bgRed]}>
                      <Text style={[styles.badgeText, selectedAsset.condition === 'BAIK' ? styles.textGreen : styles.textRed]}>
                        {selectedAsset.condition}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                        {t('inventory.stock')}: {selectedAsset.available_quantity} / {selectedAsset.total_quantity}
                      </Text>
                    </View>
                </View>

                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{t('inventory.detail.description')}</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 24, marginBottom: 30 }}>
                  {selectedAsset.description}
                </Text>

                <TouchableOpacity 
                  style={[
                    styles.borrowBtn, 
                    { backgroundColor: colors.primary, alignItems: 'center', paddingVertical: 14 },
                    selectedAsset.available_quantity === 0 && { backgroundColor: colors.border, opacity: 0.7 }
                  ]}
                  disabled={selectedAsset.available_quantity === 0}
                  onPress={() => {
                    setDetailModalVisible(false);
                    setTimeout(() => setModalVisible(true), 300);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.borrowBtnText}>
                    {selectedAsset.available_quantity === 0 ? t('inventory.stockEmpty') : t('inventory.detail.borrowNow')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 0,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginTop: -25, // Overlap header
    zIndex: 20,
    marginBottom: 10,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  cardImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bgGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  textGreen: {
    color: '#10b981',
  },
  bgRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  textRed: {
    color: '#ef4444',
  },
  borrowBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  borrowBtnGradient: {
    width: '100%',
    alignItems: 'center',
  },
  borrowBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconContainer: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loanCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loanIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  loanDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bgBlue: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  textBlue: { color: '#3b82f6' },
  bgYellow: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  textYellow: { color: '#f59e0b' },
  loanDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  loanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loanDetail: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: '50%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
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
  modalBody: {
    flex: 1,
  },
  modalAssetName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerButton: {
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
  },
  modalSubmitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
