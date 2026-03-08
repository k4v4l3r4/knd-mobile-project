import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Linking,
  Alert,
  TextInput,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { formatPhoneNumber } from '../utils/phoneUtils';

interface TenantListScreenProps {
  onNavigate: (screen: string) => void;
  onBack: () => void;
  boardingHouseId: number;
  boardingHouseName: string;
}

export default function TenantListScreen({ onNavigate, onBack, boardingHouseId, boardingHouseName }: TenantListScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTenants();
  }, [boardingHouseId]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/boarding-houses/${boardingHouseId}`);
      if (response.data.success) {
        setTenants(response.data.data.tenants || []);
      }
    } catch (error) {
      console.error('Fetch tenants error:', error);
      Alert.alert('Error', 'Gagal memuat daftar penghuni.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTenants();
  };

  const calculateStatus = (tenant: any) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const parseLocal = (dateStr: string) => {
        if (!dateStr) return null;
        const cleanStr = dateStr.split('T')[0]; 
        const [y, m, d] = cleanStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    if (tenant.status === 'NONAKTIF' || tenant.status === 'MOVED_OUT') return 'NONAKTIF';
    
    if (tenant.start_date) {
        const start = parseLocal(tenant.start_date);
        if (start && start > now) return 'BELUM_AKTIF';
    }

    return 'AKTIF';
  };

  const filteredTenants = useMemo(() => {
    if (!searchQuery) return tenants;
    return tenants.filter(tenant => 
      tenant.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.room_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tenants, searchQuery]);

  const renderTenantItem = ({ item }: { item: any }) => {
    const status = calculateStatus(item);
    const isInactive = status === 'NONAKTIF';
    
    return (
      <View style={[
        styles.card, 
        { 
            backgroundColor: isDarkMode ? '#1e293b' : '#fff',
            borderColor: colors.border,
            opacity: isInactive ? 0.6 : 1
        }
      ]}>
        <View style={styles.cardHeader}>
            <View>
                <Text style={[styles.tenantName, { color: colors.text }]}>{item.user?.name || 'Tanpa Nama'}</Text>
                <Text style={[styles.roomInfo, { color: colors.textSecondary }]}>
                    Kamar {item.room_number} • {item.user?.phone || '-'}
                </Text>
            </View>
            <View style={[
                styles.badge, 
                { backgroundColor: status === 'AKTIF' ? '#dcfce7' : '#f1f5f9' }
            ]}>
                <Text style={{ 
                    color: status === 'AKTIF' ? '#166534' : '#64748b', 
                    fontSize: 12, 
                    fontWeight: 'bold' 
                }}>
                    {status}
                </Text>
            </View>
        </View>

        {!isInactive && (
            <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                    onPress={() => {
                        const phone = formatPhoneNumber(item.user?.phone || '');
                        if (phone) {
                            Linking.openURL(`https://wa.me/${phone}`);
                        } else {
                            Alert.alert('Info', 'Nomor telepon tidak tersedia');
                        }
                    }}
                >
                    <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                    <Text style={styles.actionText}>WhatsApp</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Daftar Penghuni</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{boardingHouseName}</Text>
        </View>
      </View>

      {tenants.length > 10 && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Cari nama atau nomor kamar..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTenants}
          renderItem={renderTenantItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum Ada Penghuni</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Tidak ditemukan penghuni dengan nama tersebut.' : 'Belum ada penghuni terdaftar di kost ini.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roomInfo: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0', // Light gray
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
