import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Dimensions,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import api, { getStorageUrl } from '../services/api';
import { BackButton } from '../components/BackButton';
import { authService } from '../services/auth';

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
    photo_url: string | null;
  };
}

interface BansosHistory {
  id: number;
  bansos_recipient_id: number;
  program_name: string;
  date_received: string;
  amount: number;
  evidence_photo: string | null;
  recipient: BansosRecipient;
}

export default function BansosScreenHumble({ navigation, onNavigate }: any) {
  console.log('🔵 [HUMBLE] Component initializing...');
  
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  console.log('🔵 [HUMBLE] Hooks initialized');
  
  const [activeTab, setActiveTab] = useState<'recipients' | 'history'>('recipients');
  const [recipients, setRecipients] = useState<BansosRecipient[]>([]);
  const [histories, setHistories] = useState<BansosHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  // HELPER: Ensure HTTPS URL for images
  const ensureHttpsUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string') return null;
    
    if (url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    
    return `https://${url}`;
  };

  // SIMPLE FETCH DATA - NO ADMIN FUNCTIONS
  const fetchData = async () => {
    console.log('🔵 [HUMBLE] fetchData starting... activeTab:', activeTab);
    try {
      setLoading(true);
      setScreenError(null);
      
      if (activeTab === 'recipients') {
        console.log('🔵 [HUMBLE] Fetching recipients...');
        const response = await api.get('/bansos-recipients');
        console.log('✅ [HUMBLE] Recipients response status:', response.status);
        
        const extractedData = response?.data?.data?.data || response?.data?.data || response?.data || [];
        const validatedData = Array.isArray(extractedData) ? extractedData : [];
        
        const safeRecipients = validatedData.map((item: any, idx: number) => {
          try {
            if (!item || typeof item !== 'object') {
              console.warn('⚠️ [HUMBLE] Invalid recipient at index', idx);
              return { id: idx, user_id: 0, no_kk: '-', status: 'PENDING', notes: '', score: 0, user: null };
            }
            return {
              ...item,
              user: item.user || null,
              no_kk: item.no_kk || '-',
              status: item.status || 'PENDING',
            };
          } catch (err) {
            console.warn('❌ [HUMBLE] Error validating recipient at index', idx, err);
            return { id: idx, user_id: 0, no_kk: '-', status: 'PENDING', notes: '', score: 0, user: null };
          }
        });
        
        console.log('✅ [HUMBLE] Setting', safeRecipients.length, 'recipients');
        setRecipients(safeRecipients);
      } else {
        console.log('🔵 [HUMBLE] Fetching histories...');
        const response = await api.get('/bansos-histories');
        console.log('✅ [HUMBLE] Histories response status:', response.status);
        
        const extractedData = response?.data?.data?.data || response?.data?.data || response?.data || [];
        const validatedData = Array.isArray(extractedData) ? extractedData : [];
        
        const safeHistories = validatedData.map((item: any, idx: number) => {
          try {
            if (!item || typeof item !== 'object') {
              console.warn('⚠️ [HUMBLE] Invalid history at index', idx);
              return { id: idx, bansos_recipient_id: 0, program_name: '-', date_received: '-', amount: 0, evidence_photo: null, recipient: null };
            }
            return {
              ...item,
              program_name: item.program_name || '-',
              date_received: item.date_received || '-',
              amount: item.amount || 0,
              recipient: item.recipient || null,
            };
          } catch (err) {
            console.warn('❌ [HUMBLE] Error validating history at index', idx, err);
            return { id: idx, bansos_recipient_id: 0, program_name: '-', date_received: '-', amount: 0, evidence_photo: null, recipient: null };
          }
        });
        
        console.log('✅ [HUMBLE] Setting', safeHistories.length, 'histories');
        setHistories(safeHistories);
      }
    } catch (error: any) {
      console.error('❌ [HUMBLE] CRITICAL ERROR:', error.message);
      setScreenError('Gagal memuat data. Periksa koneksi internet Anda.');
      setRecipients([]);
      setHistories([]);
    } finally {
      console.log('🔵 [HUMBLE] Finally block - setting loading false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('🔵 [HUMBLE] useEffect triggered');
    try {
      fetchData();
      console.log('🔵 [HUMBLE] Functions called successfully');
    } catch (error: any) {
      console.error('❌ [HUMBLE] CRITICAL ERROR in useEffect:', error);
      setScreenError('Gagal memuat halaman.');
      setLoading(false);
    }
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // SIMPLE RENDER - NO ADMIN BUTTONS AT ALL
  const renderRecipientItem = ({ item }: { item: BansosRecipient }) => {
    console.log('🔵 [HUMBLE] Rendering recipient item:', item?.id);
    
    try {
      if (!item || typeof item !== 'object') {
        console.warn('⚠️ [HUMBLE] Invalid recipient item');
        return null;
      }

      const userAny = item.user as any;
      const userName = userAny?.name ?? userAny?.nama ?? 'Unknown';
      const safeUserName = typeof userName === 'string' ? userName : 'Unknown';
      const userInitial = (safeUserName && safeUserName.length > 0) ? safeUserName.charAt(0) : '?';
      const noKk = typeof item.no_kk === 'string' ? item.no_kk : '-';
      const notes = typeof item.notes === 'string' ? item.notes : '';
      const itemStatus = typeof item.status === 'string' ? item.status : 'PENDING';
      
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                  {userInitial}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{safeUserName}</Text>
                <Text style={styles.userKk}>KK: {noKk}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(itemStatus) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(itemStatus) }]}>
                {itemStatus}
              </Text>
            </View>
          </View>
          
          {notes && notes.trim().length > 0 && (
            <Text style={styles.notes} numberOfLines={2}>
              Catatan: {notes}
            </Text>
          )}

          {/* 🚫 NO ADMIN BUTTONS - HUMBLE VERSION */}
        </View>
      );
    } catch (error) {
      console.error('❌ [HUMBLE] ERROR rendering recipient item:', error, item);
      return null;
    }
  };

  const renderHistoryItem = ({ item }: { item: BansosHistory }) => {
    try {
      if (!item || typeof item !== 'object') {
        console.warn('⚠️ [HUMBLE] Invalid history item');
        return null;
      }

      const programName = typeof item.program_name === 'string' ? item.program_name : 'Tidak ada nama program';
      const dateReceived = typeof item.date_received === 'string' ? item.date_received : '-';
      const amount = typeof item.amount === 'number' ? item.amount : 0;
      const evidencePhoto = ensureHttpsUrl(item.evidence_photo);
      
      const recipientAny = item.recipient as any;
      const recipientName = recipientAny?.user?.name ?? recipientAny?.nama ?? 'Tidak diketahui';
      const safeRecipientName = typeof recipientName === 'string' ? recipientName : 'Tidak diketahui';
      
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.programName}>{programName}</Text>
              <Text style={styles.date}>{dateReceived}</Text>
            </View>
            <Text style={styles.amount}>
              {amount ? `Rp ${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'Barang'}
            </Text>
          </View>
          <Text style={styles.recipientName}>Penerima: {safeRecipientName}</Text>
          {evidencePhoto && (
            <Image 
              source={{ uri: evidencePhoto }} 
              style={styles.evidencePhoto}
              resizeMode="cover"
            />
          )}
        </View>
      );
    } catch (error) {
      console.error('❌ [HUMBLE] ERROR rendering history item:', error, item);
      return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LAYAK': return '#10b981';
      case 'TIDAK_LAYAK': return '#ef4444';
      case 'PENDING': return '#f59e0b';
      default: return colors.textSecondary;
    }
  };

  console.log('🔵 [HUMBLE] About to render main component');

  // EARLY RETURN FOR ERROR
  if (screenError) {
    console.log('🔴 [HUMBLE] Screen error detected:', screenError);
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Oops! Terjadi Kesalahan</Text>
          <Text style={styles.errorMessage}>{screenError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setScreenError(null);
              fetchData();
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[colors.primary, '#064e3b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => onNavigate ? onNavigate('HOME') : navigation?.goBack()} color="#fff" />
            <Text style={styles.headerTitle}>Bantuan Sosial</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'recipients' && styles.activeTab]}
          onPress={() => setActiveTab('recipients')}
        >
          <Text style={[styles.tabText, activeTab === 'recipients' && styles.activeTabText]}>
            Penerima
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Riwayat
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'recipients' ? (
        <FlatList
          data={recipients || []}
          renderItem={renderRecipientItem}
          keyExtractor={(item) => item?.id?.toString() || 'unknown'}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="help-circle-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Belum ada data penerima bantuan.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={histories || []}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item?.id?.toString() || 'unknown'}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Belum ada riwayat.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
  },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userKk: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  notes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  recipientName: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
  },
  evidencePhoto: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
