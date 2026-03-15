import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  Clipboard,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import StatusTimeline from '../components/StatusTimeline';

interface OrderDetail {
  id: number;
  order_number: string;
  status: string;
  status_label: string;
  subtotal: number;
  shipping_fee: number;
  service_fee: number;
  app_fee: number;
  discount: number;
  total: number;
  notes: Record<string, string>;
  courier_info: {
    name: string;
    phone: string;
    type: string;
  } | null;
  payment_method: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  created_at: string;
  tracking_number?: string | null; // Resi for REGULER
  tracking_link?: string | null; // Link for INSTANT
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    subtotal: number;
    notes: string | null;
    variants: any;
    image_url: string | null;
  }>;
  timeline: Array<{
    status: string;
    label: string;
    timestamp: string | null;
    is_completed: boolean;
    is_current: boolean;
  }>;
}

export default function OrderDetailScreen({ route, navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDarkMode);
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Failed to fetch order detail:', error);
      Alert.alert('Error', 'Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrderDetail();
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCancelOrder = () => {
    if (!order) return;

    Alert.alert(
      'Batalkan Pesanan',
      `Apakah Anda yakin ingin membatalkan pesanan ${order.order_number}?`,
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/orders/${order.id}/cancel`);
              Alert.alert('Berhasil', 'Pesanan telah dibatalkan');
              fetchOrderDetail();
            } catch (error) {
              Alert.alert('Error', 'Gagal membatalkan pesanan');
            }
          },
        },
      ]
    );
  };

  const handleConfirmReceived = () => {
    if (!order) return;

    Alert.alert(
      'Konfirmasi Diterima',
      'Apakah Anda sudah menerima pesanan dengan baik?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Sudah Diterima',
          onPress: async () => {
            try {
              await api.post(`/orders/${order.id}/confirm-received`);
              Alert.alert('Berhasil', 'Pesanan dikonfirmasi telah diterima');
              fetchOrderDetail();
            } catch (error) {
              Alert.alert('Error', 'Gagal konfirmasi penerimaan');
            }
          },
        },
      ]
    );
  };

  const canCancel = order && ['PENDING_PAYMENT', 'WAITING_CONFIRMATION', 'PAID'].includes(order.status);
  const canConfirmReceived = order?.status === 'SHIPPED';

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat detail pesanan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>Pesanan tidak ditemukan</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Pesanan</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons 
              name={refreshing ? "sync-outline" : "sync"} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Order Info Card */}
          <View style={styles.card}>
            <View style={styles.orderHeader}>
              <View style={styles.orderNumberContainer}>
                <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                <Text style={styles.orderNumber}>{order.order_number}</Text>
              </View>
              <View style={[styles.statusBadge, { 
                backgroundColor: getStatusColor(order.status) 
              }]}>
                <Text style={styles.statusText}>{order.status_label}</Text>
              </View>
            </View>

            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
          </View>

          {/* Status Timeline */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tracking Pesanan</Text>
            <StatusTimeline timeline={order.timeline} formatDateTime={formatDateTime} />
          </View>

          {/* Items List */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Produk ({order.items.length})</Text>
            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Image
                  source={{
                    uri: item.image_url || 'https://via.placeholder.com/80',
                  }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product_name}
                  </Text>
                  {item.variants && Object.keys(item.variants).length > 0 && (
                    <View style={styles.variantsContainer}>
                      {Object.entries(item.variants).map(([key, value]: any) => (
                        <Text key={key} style={styles.variantText}>
                          {key}: {value.name}
                        </Text>
                      ))}
                    </View>
                  )}
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                    <Text style={styles.itemPrice}>{formatRupiah(item.price)}</Text>
                  </View>
                  {item.notes && (
                    <View style={styles.noteChip}>
                      <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.noteText} numberOfLines={1}>
                        Catatan: {item.notes}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemSubtotal}>
                  {formatRupiah(item.subtotal)}
                </Text>
              </View>
            ))}
          </View>

          {/* Courier Info (if shipped) */}
          {order.courier_info && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Informasi Pengiriman</Text>
              
              {/* Tracking Buttons for INSTANT and REGULER */}
              {order.tracking_link && (
                <TouchableOpacity
                  style={styles.trackingButton}
                  onPress={() => {
                    if (order.tracking_link) Linking.openURL(order.tracking_link);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.trackingButtonText}>Lacak via Grab/Gojek/Lalamove</Text>
                </TouchableOpacity>
              )}
              
              {order.tracking_number && (
                <TouchableOpacity
                  style={styles.trackingButtonSecondary}
                  onPress={() => {
                    if (order.tracking_number) Clipboard.setString(order.tracking_number);
                    Alert.alert('Berhasil', 'Nomor resi disalin ke clipboard');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={20} color={colors.primary} />
                  <Text style={[styles.trackingButtonText, { color: colors.primary }]}>
                    Salin Nomor Resi: {order.tracking_number}
                  </Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.courierContainer}>
                <View style={styles.courierRow}>
                  <Ionicons name="bicycle" size={24} color={colors.primary} />
                  <View style={styles.courierInfo}>
                    <Text style={styles.courierLabel}>Kurir</Text>
                    <Text style={styles.courierValue}>{order.courier_info.name}</Text>
                  </View>
                </View>
                
                <View style={styles.courierRow}>
                  <Ionicons name="call-outline" size={24} color={colors.primary} />
                  <View style={styles.courierInfo}>
                    <Text style={styles.courierLabel}>Nomor Telepon</Text>
                    <Text style={styles.courierValue}>{order.courier_info.phone}</Text>
                  </View>
                </View>

                {order.courier_info.type && (
                  <View style={styles.courierRow}>
                    <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
                    <View style={styles.courierInfo}>
                      <Text style={styles.courierLabel}>Tipe Pengiriman</Text>
                      <Text style={styles.courierValue}>{order.courier_info.type}</Text>
                    </View>
                  </View>
                )}
                
                {/* Status text for PICKUP */}
                {order.courier_info.type === 'PICKUP' && (
                  <View style={styles.pickupStatus}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.pickupStatusText}>Pesanan Siap Diambil</Text>
                  </View>
                )}
                
                {/* Status text for REGULER without tracking */}
                {order.courier_info.type === 'REGULER' && !order.tracking_number && (
                  <View style={styles.regulerStatus}>
                    <Ionicons name="time-outline" size={20} color="#f59e0b" />
                    <Text style={styles.regulerStatusText}>Pesanan sedang dikirim via {order.courier_info.name}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Payment Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatRupiah(order.subtotal)}</Text>
            </View>
            
            {order.shipping_fee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ongkos Kirim</Text>
                <Text style={styles.summaryValue}>{formatRupiah(order.shipping_fee)}</Text>
              </View>
            )}
            
            {order.service_fee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Layanan</Text>
                <Text style={styles.summaryValue}>{formatRupiah(order.service_fee)}</Text>
              </View>
            )}
            
            {order.app_fee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Aplikasi</Text>
                <Text style={styles.summaryValue}>{formatRupiah(order.app_fee)}</Text>
              </View>
            )}
            
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.primary }]}>Diskon</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  -{formatRupiah(order.discount)}
                </Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Bayar</Text>
              <Text style={styles.totalValue}>{formatRupiah(order.total)}</Text>
            </View>

            {order.payment_method && (
              <View style={styles.paymentMethod}>
                <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.paymentMethodText}>
                  {getPaymentMethodName(order.payment_method)}
                </Text>
              </View>
            )}
          </View>

          {/* Notes (if any) */}
          {order.notes && Object.keys(order.notes).length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Catatan</Text>
              {Object.entries(order.notes).map(([seller, note], index) => (
                <View key={index} style={styles.noteItem}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                  <View style={styles.noteContent}>
                    <Text style={styles.noteSeller}>{seller}</Text>
                    <Text style={styles.noteValue}>{note}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {(canCancel || canConfirmReceived) && (
          <View style={styles.footer}>
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelOrder}
              >
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>Batalkan Pesanan</Text>
              </TouchableOpacity>
            )}
            
            {canConfirmReceived && (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleConfirmReceived}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Konfirmasi Diterima</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Helper functions
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING_PAYMENT: '#F59E0B',
    WAITING_CONFIRMATION: '#3B82F6',
    PAID: '#10B981',
    PROCESSING: '#8B5CF6',
    SHIPPED: '#06B6D4',
    DELIVERED: '#10B981',
    COMPLETED: '#059669',
    CANCELLED: '#EF4444',
  };
  return colors[status] || '#6B7280';
};

const getPaymentMethodName = (method: string): string => {
  const names: Record<string, string> = {
    briva: 'BRI Virtual Account',
    bcava: 'BCA Virtual Account',
    gopay: 'GoPay',
  };
  return names[method] || method;
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 24,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
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
    refreshButton: {
      padding: 4,
    },
    content: {
      flex: 1,
    },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    orderNumberContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    orderNumber: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    statusText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    orderDate: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    itemRow: {
      flexDirection: 'row',
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    itemInfo: {
      flex: 1,
      marginLeft: 12,
    },
    itemName: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
      lineHeight: 20,
    },
    variantsContainer: {
      marginBottom: 4,
    },
    variantText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    itemQuantity: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 8,
    },
    itemPrice: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '500',
    },
    noteChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    noteText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginLeft: 4,
      maxWidth: 150,
    },
    itemSubtotal: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
    },
    courierContainer: {
      marginTop: 8,
    },
    courierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    courierInfo: {
      flex: 1,
      marginLeft: 12,
    },
    courierLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    courierValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      color: colors.text,
    },
    totalRow: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    paymentMethod: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    paymentMethodText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 8,
    },
    noteItem: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    noteContent: {
      flex: 1,
      marginLeft: 8,
    },
    noteSeller: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: 2,
    },
    noteValue: {
      fontSize: 13,
      color: colors.text,
    },
    footer: {
      flexDirection: 'row',
      padding: 16,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    cancelButton: {
      backgroundColor: colors.danger || '#EF4444',
    },
    cancelButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    confirmButton: {
      backgroundColor: colors.success || '#10B981',
    },
    confirmButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    trackingButton: {
      backgroundColor: '#3b82f6',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    trackingButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    trackingButtonSecondary: {
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
    },
    pickupStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
    },
    pickupStatusText: {
      color: '#10b981',
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 6,
    },
    regulerStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
    },
    regulerStatusText: {
      color: '#f59e0b',
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 6,
    },
  });
