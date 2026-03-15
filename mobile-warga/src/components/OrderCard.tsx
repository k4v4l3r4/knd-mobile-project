import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  image_url: string | null;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  status_label: string;
  total: number;
  item_count: number;
  created_at: string;
  items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  formatRupiah: (amount: number) => string;
}

const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    PENDING_PAYMENT: '#F59E0B', // Amber
    WAITING_CONFIRMATION: '#3B82F6', // Blue
    PAID: '#10B981', // Green
    PROCESSING: '#8B5CF6', // Purple
    SHIPPED: '#06B6D4', // Cyan
    DELIVERED: '#10B981', // Green
    COMPLETED: '#059669', // Dark Green
    CANCELLED: '#EF4444', // Red
  };
  
  return statusColors[status] || '#6B7280'; // Gray default
};

export default function OrderCard({ order, onPress, formatRupiah }: OrderCardProps) {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const statusColor = getStatusColor(order.status);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hari ini';
    } else if (diffDays === 1) {
      return 'Kemarin';
    } else if (diffDays < 7) {
      return `${diffDays} hari yang lalu`;
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.orderNumberContainer}>
          <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.orderNumber}>{order.order_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText} numberOfLines={1}>
            {order.status_label}
          </Text>
        </View>
      </View>

      {/* Items Preview */}
      <View style={styles.itemsContainer}>
        {order.items.slice(0, 2).map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Image
              source={{
                uri: item.image_url || 'https://via.placeholder.com/60',
              }}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product_name}
              </Text>
              <Text style={styles.itemQuantity}>
                {item.quantity}x • {formatRupiah(item.price)}
              </Text>
            </View>
          </View>
        ))}
        
        {order.items.length > 2 && (
          <View style={styles.moreItems}>
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
            <Text style={styles.moreItemsText}>
              +{order.items.length - 2} produk lainnya
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total ({order.item_count} barang)</Text>
          <Text style={styles.totalValue}>{formatRupiah(order.total)}</Text>
        </View>
        <Text style={styles.date}>{formatDate(order.created_at)}</Text>
      </View>

      {/* Arrow Indicator */}
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      position: 'relative',
    },
    header: {
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
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 8,
      fontWeight: '500',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      maxWidth: 140,
    },
    statusText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    itemsContainer: {
      marginBottom: 12,
    },
    itemRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    itemImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    itemInfo: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    itemName: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
      lineHeight: 20,
    },
    itemQuantity: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    moreItems: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    moreItemsText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalContainer: {
      flex: 1,
    },
    totalLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
    },
    date: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 16,
    },
    arrowContainer: {
      position: 'absolute',
      right: 16,
      bottom: 16,
    },
  });
