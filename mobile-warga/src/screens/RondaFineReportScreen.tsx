import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import api, { getStorageUrl } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { BackButton } from '../components/BackButton';
import { authService } from '../services/auth';

interface Fine {
  id: number;
  user_id: number;
  schedule_id: number;
  fine_type: string;
  amount: number;
  status: 'PAID' | 'UNPAID';
  generated_at: string;
  paid_at: string | null;
  user?: {
    name: string;
    photo_url: string | null;
  };
}

export default function RondaFineReportScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [isRT, setIsRT] = useState(false);

  useEffect(() => {
    checkRole();
    fetchFines();
  }, [filter]);

  const checkRole = async () => {
    const hasRole = await authService.hasRole('ADMIN_RT');
    setIsRT(hasRole);
  };

  const fetchFines = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter !== 'ALL') {
        params.status = filter;
      }
      
      const response = await api.get('/ronda-fines', { params });
      if (response.data.success) {
        setFines(response.data.data.data); // Assuming pagination structure
      }
    } catch (error) {
      console.error('Error fetching fines:', error);
      Alert.alert('Error', 'Gagal memuat laporan denda');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (fineId: number) => {
    Alert.alert(
      'Konfirmasi Pembayaran',
      'Apakah Anda yakin ingin menandai denda ini sebagai LUNAS? Dana akan dicatat masuk ke Kas RT.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Tandai Lunas',
          onPress: async () => {
            try {
              await api.post(`/ronda-fines/${fineId}/pay`);
              Alert.alert('Sukses', 'Pembayaran berhasil dicatat');
              fetchFines();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Gagal memproses pembayaran');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: Fine }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userRow}>
          <View style={styles.avatarContainer}>
             {item.user?.photo_url ? (
               <Image source={{ uri: getStorageUrl(item.user.photo_url) || '' }} style={styles.avatar} />
             ) : (
               <View style={styles.avatarPlaceholder}>
                 <Text style={styles.avatarText}>{item.user?.name?.charAt(0) || '?'}</Text>
               </View>
             )}
          </View>
          <View>
            <Text style={styles.userName}>{item.user?.name || 'Unknown User'}</Text>
            <Text style={styles.dateText}>{formatDate(item.generated_at)}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: item.status === 'PAID' ? '#dcfce7' : '#fee2e2' }
        ]}>
          <Text style={[
            styles.statusText, 
            { color: item.status === 'PAID' ? '#166534' : '#991b1b' }
          ]}>
            {item.status === 'PAID' ? 'LUNAS' : 'BELUM BAYAR'}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Jenis Pelanggaran</Text>
          <Text style={styles.value}>{item.fine_type.replace('_', ' ')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nominal Denda</Text>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        </View>
      </View>

      {item.status === 'UNPAID' && isRT && (
        <TouchableOpacity 
          style={styles.payButton}
          onPress={() => handleMarkPaid(item.id)}
        >
          <MaterialIcons name="payments" size={20} color="#fff" />
          <Text style={styles.payButtonText}>Terima Pembayaran</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Laporan Denda</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterContainer}>
        {(['ALL', 'UNPAID', 'PAID'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'Semua' : f === 'UNPAID' ? 'Belum Bayar' : 'Lunas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={fines}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Tidak ada data denda.</Text>
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
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#cbd5e1',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
