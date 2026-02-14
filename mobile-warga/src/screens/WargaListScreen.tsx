import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import api, { getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface Warga {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  address: string | null;
  block: string | null;
  address_rt: string | null;
  address_rw: string | null;
  status_in_family: string;
  role?: string;
  place_of_birth?: string | null;
  date_of_birth?: string | null;
  nik?: string; // Visible in Family tab
}

interface WargaListScreenProps {
  // Props can be added here if needed
}

const formatDate = (dateString: string | null, language: string) => {
  if (!dateString) return '';
  try {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', options);
  } catch (e) {
    return dateString;
  }
};

const calculateAge = (dateString: string) => {
  if (!dateString) return 0;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getAvatarUrl = (path: string | null) => {
  if (!path) return 'https://ui-avatars.com/api/?name=User&background=random';
  return getStorageUrl(path);
};

// Professional Card Component
const ProfessionalWargaCard = React.memo(({ item, colors, styles, t, language, isFamilyView }: any) => {
  const isHeadOfFamily = item.status_in_family === 'KEPALA_KELUARGA';
  
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: (item.photo_url && getAvatarUrl(item.photo_url)) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` }} 
          style={styles.avatar} 
        />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.badgesContainer}>
             {isHeadOfFamily && (
               <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                 <Text style={[styles.badgeText, { color: '#059669' }]}>Kepala Keluarga</Text>
               </View>
             )}
             <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}>
               <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                 {item.status_in_family?.replace(/_/g, ' ') || item.role?.replace(/_/g, ' ') || '-'}
               </Text>
             </View>
          </View>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="home-map-marker" size={16} color={colors.textSecondary} style={styles.infoIcon} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Alamat</Text>
            <Text style={styles.infoValue}>
              {[
                  item.block ? `Blok ${item.block}` : null,
                  item.address_rt ? `RT ${item.address_rt}` : null,
                  item.address_rw ? `RW ${item.address_rw}` : null
              ].filter(Boolean).join(', ') || item.address || '-'}
            </Text>
          </View>
        </View>
        
        {isFamilyView && item.nik && (
           <View style={styles.infoRow}>
              <MaterialCommunityIcons name="card-account-details-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
              <View style={styles.infoItem}>
                 <Text style={styles.infoLabel}>NIK</Text>
                 <Text style={styles.infoValue}>{item.nik}</Text>
              </View>
           </View>
        )}

        {(item.place_of_birth || item.date_of_birth) && (
          <View style={styles.infoRow}>
             <MaterialCommunityIcons name="cake-variant-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
             <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tempat, Tanggal Lahir</Text>
                <Text style={styles.infoValue}>
                  {item.place_of_birth || '-'}, {formatDate(item.date_of_birth || null, language)} 
                  {item.date_of_birth ? ` (${calculateAge(item.date_of_birth)} ${t('warga.yearShort')})` : ''}
                </Text>
             </View>
          </View>
        )}
      </View>
    </View>
  );
}, (prev, next) => prev.item === next.item && prev.colors === next.colors && prev.styles === next.styles && prev.language === next.language && prev.isFamilyView === next.isFamilyView);

export default function WargaListScreen({ }: WargaListScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  // Tabs: 'rt' | 'family'
  const [activeTab, setActiveTab] = useState<'rt' | 'family'>('rt');
  
  // Warga RT Data
  const [wargas, setWargas] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Family Data
  const [familyMembers, setFamilyMembers] = useState<Warga[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);

  // Fetch Warga RT
  const fetchWargas = useCallback(async (pageNumber = 1, search = '', refresh = false) => {
    try {
      if (pageNumber === 1) setLoading(true);
      
      const response = await api.get('/warga', {
        params: {
          page: pageNumber,
          search: search,
          per_page: 20
        }
      });

      if (response.data.success) {
        const newData = response.data.data.data;
        
        if (refresh) {
          setWargas(newData);
          if (pageNumber === 1 && !search) {
            AsyncStorage.setItem('warga_list_cache', JSON.stringify(newData)).catch(e => console.log('Cache save error', e));
          }
        } else {
          setWargas(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNewData = newData.filter((item: Warga) => !existingIds.has(item.id));
            return [...prev, ...uniqueNewData];
          });
        }
        setHasMore(response.data.data.next_page_url !== null);
      }
    } catch (error) {
      console.error('Error fetching warga:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Family
  const fetchFamily = useCallback(async () => {
    setFamilyLoading(true);
    try {
      const response = await api.get('/warga/family');
      if (response.data.success) {
        setFamilyMembers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching family:', error);
    } finally {
      setFamilyLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load Initial Data
  useEffect(() => {
    loadCache();
    fetchWargas(1, searchQuery);
    fetchFamily();
  }, []);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem('warga_list_cache');
      if (cached) {
        setWargas(JSON.parse(cached));
      }
    } catch (e) {
      // ignore
    }
  };

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'rt') {
        setPage(1);
        fetchWargas(1, searchQuery, true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Tab Switch Effect
  useEffect(() => {
    if (activeTab === 'family' && familyMembers.length === 0) {
      fetchFamily();
    }
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'rt') {
      setPage(1);
      fetchWargas(1, searchQuery, true);
    } else {
      fetchFamily();
    }
  }, [activeTab, searchQuery]);

  const loadMore = () => {
    if (!loading && hasMore && activeTab === 'rt') {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWargas(nextPage, searchQuery);
    }
  };

  const renderItem = useCallback(({ item }: { item: Warga }) => (
    <ProfessionalWargaCard 
      item={item} 
      colors={colors} 
      styles={styles} 
      t={t} 
      language={language}
      isFamilyView={activeTab === 'family'}
    />
  ), [colors, styles, t, language, activeTab]);

  const keyExtractor = useCallback((item: Warga) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {/* Header with Tabs */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={isDarkMode ? ['#059669', '#047857'] : ['#059669', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Data Warga</Text>
            </View>
            
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'rt' && styles.activeTabButton]}
                onPress={() => setActiveTab('rt')}
              >
                <Text style={[styles.tabText, activeTab === 'rt' && styles.activeTabText]}>Warga RT</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'family' && styles.activeTabButton]}
                onPress={() => setActiveTab('family')}
              >
                <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>Data Keluarga</Text>
              </TouchableOpacity>
            </View>

            {/* Search - Only for RT Tab */}
            {activeTab === 'rt' && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={isDarkMode ? '#94a3b8' : '#fff'} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('warga.searchPlaceholder')}
                  placeholderTextColor={isDarkMode ? '#94a3b8' : 'rgba(255,255,255,0.7)'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}
          </SafeAreaView>
        </LinearGradient>
      </View>

      <FlatList
        data={activeTab === 'rt' ? wargas : familyMembers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={activeTab === 'rt' ? loadMore : null}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && !familyLoading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('warga.noData')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          (loading || familyLoading) && !refreshing ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} /> : null
        }
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: colors.primary, // Fallback
  },
  headerGradient: {
    paddingBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerTitleRow: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabText: {
    color: isDarkMode ? '#059669' : '#047857',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  cardBody: {
    padding: 16,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
});
