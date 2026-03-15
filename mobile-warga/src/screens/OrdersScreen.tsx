import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import OrderCard from '../components/OrderCard';

interface Order {
  id: number;
  order_number: string;
  status: string;
  status_label: string;
  total: number;
  item_count: number;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    subtotal: number;
    image_url: string | null;
  }>;
}

type TabType = 'all' | 'active' | 'history';

export default function OrdersScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDarkMode);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Status mapping for filtering
  const statusFilters: Record<TabType, string[]> = {
    all: [],
    active: ['PENDING_PAYMENT', 'WAITING_CONFIRMATION', 'PAID', 'PROCESSING', 'SHIPPED'],
    history: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
  };

  const fetchOrders = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (!refresh) {
        setLoading(true);
      }

      const params: any = {
        per_page: 20,
        page: pageNum,
      };

      // Add status filter if not "all"
      if (activeTab !== 'all') {
        params.status = statusFilters[activeTab].join(',');
      }

      const response = await api.get('/orders', { params });
      const data = response.data;

      if (refresh || pageNum === 1) {
        setOrders(data.data);
      } else {
        setOrders(prev => [...prev, ...data.data]);
      }

      setHasMore(data.current_page < data.last_page);
      setPage(data.current_page);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, true);
  }, [activeTab]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(1, true);
  }, [activeTab]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchOrders(page + 1);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="receipt-outline" 
        size={64} 
        color={colors.textSecondary} 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'all' 
          ? 'Belum ada pesanan' 
          : activeTab === 'active'
          ? 'Tidak ada pesanan aktif'
          : 'Belum ada riwayat pesanan'
        }
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'all' || activeTab === 'active'
          ? 'Mulai belanja untuk membuat pesanan pertama Anda'
          : 'Pesanan yang sudah selesai akan muncul di sini'
        }
      </Text>
      {(activeTab === 'all' || activeTab === 'active') && (
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('MARKET')}
        >
          <Text style={styles.shopButtonText}>Mulai Belanja</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.tabContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'all' && styles.activeTabText,
            ]}
          >
            Semua
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}
          >
            Aktif
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText,
            ]}
          >
            Riwayat
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderOrderItem = ({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      onPress={() => navigation.navigate('ORDER_DETAIL', { orderId: item.id })}
      formatRupiah={formatRupiah}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pesanan Saya</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tabs */}
        {renderHeader()}

        {/* Order List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : orders.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    tabContainer: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.primary,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    shopButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    shopButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });
