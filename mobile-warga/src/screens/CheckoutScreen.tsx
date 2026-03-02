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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { useCart } from '../context/CartContext';
import { getStorageUrl } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function CheckoutScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired } = useTenant();
  const styles = getStyles(colors, isDarkMode);
  const { cart, cartTotal, selectedItemCount, removeSelectedItems } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('briva');
  const [protection, setProtection] = useState(false);
  
  const selectedItems = cart.filter(item => item.selected);
  
  // Group items by seller
  const itemsBySeller = selectedItems.reduce((acc, item) => {
    const sellerId = item.store?.name || item.user?.name || item.seller_name || 'unknown';
    if (!acc[sellerId]) {
      acc[sellerId] = {
        seller: { name: sellerId },
        items: []
      };
    }
    acc[sellerId].items.push(item);
    return acc;
  }, {} as Record<string, { seller: { name: string }, items: typeof selectedItems }>);

  useEffect(() => {
    fetchProfile();
    
    // Redirect if no items selected
    if (selectedItems.length === 0) {
      Alert.alert('Info', 'Tidak ada barang yang dipilih untuk checkout', [
        { text: 'OK', onPress: () => onNavigate('CART') }
      ]);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user');
      if (userDataStr) {
        setUser(JSON.parse(userDataStr));
      } else {
        // Fallback to API if not in storage
        const response = await api.get('/profile');
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numPrice || 0);
  };

  const getItemShippingFee = (item: any) => {
    // If pickup, no shipping fee
    if (item?.shipping_type && item.shipping_type.toUpperCase() === 'PICKUP') return 0;
    
    // Try to get fee from various potential fields (shipping_fee_flat or shipping_cost)
    const fee = Number(item?.shipping_fee_flat || item?.shipping_cost || 0);
    
    if (!Number.isFinite(fee)) return 0;
    return fee > 0 ? fee : 0;
  };

  const shippingFeeBySeller = Object.entries(itemsBySeller).reduce((acc, [sellerId, group]) => {
    const groupFee = group.items.reduce((max, item) => Math.max(max, getItemShippingFee(item)), 0);
    acc[sellerId] = groupFee;
    return acc;
  }, {} as Record<string, number>);

  const totalShippingFee = Object.values(shippingFeeBySeller).reduce((sum, fee) => sum + fee, 0);

  const calculateTotal = () => {
    let total = cartTotal;
    // Add dummy fees
    const serviceFee = 1000;
    const appFee = 1000;
    const shippingFee = totalShippingFee;
    const discount = 0; // No promo for now

    if (protection) {
      total += 12150; // Example protection fee
    }

    return {
      subtotal: cartTotal,
      shipping: shippingFee,
      service: serviceFee,
      app: appFee,
      discount: discount,
      protection: protection ? 12150 : 0,
      grandTotal: total + serviceFee + appFee + shippingFee - discount
    };
  };

  const totals = calculateTotal();

  const handlePayment = () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('market.cart.accessLimit'));
      return;
    }

    Alert.alert(
      'Konfirmasi Pembayaran',
      `Anda akan melakukan pembayaran sebesar ${formatPrice(totals.grandTotal)} menggunakan ${
        paymentMethod === 'briva' ? 'BRI Virtual Account' : 
        paymentMethod === 'bcava' ? 'BCA Virtual Account' : 'GoPay'
      }`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Bayar', onPress: () => processCheckout() }
      ]
    );
  };
  
  const processCheckout = async () => {
      setLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        removeSelectedItems();
        
        Alert.alert(
          'Pembayaran Berhasil', 
          'Terima kasih! Pesanan Anda sedang diproses oleh penjual.',
          [{ text: 'OK', onPress: () => onNavigate('HOME') }]
        );
      }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('CART')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alamat pengiriman kamu</Text>
          <TouchableOpacity style={styles.addressCard}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="location" size={20} color={colors.primary} style={{marginRight: 8}} />
                <View style={{flex: 1}}>
                    <Text style={styles.addressLabel}>Alamat Rumah • {user?.name || 'User'}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                        {user?.address || 'Komp. Batan Indah Blok E-52, RT/RW : 016/004 kel. ...'}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Product Items Section */}
        {Object.values(itemsBySeller).map((group, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.storeHeader}>
                <MaterialCommunityIcons name="store" size={20} color={colors.text} style={{marginRight: 8}} />
                <Text style={styles.storeName}>{group.seller.name}</Text>
            </View>
            
            {group.items.map((item, idx) => (
                <View key={idx} style={styles.itemContainer}>
                    <Image 
                        source={{ uri: (item.image_url ? getStorageUrl(item.image_url) : null) || (item.images && item.images[0] ? getStorageUrl(item.images[0]) : null) || 'https://via.placeholder.com/100' }} 
                        style={styles.itemImage} 
                    />
                    <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.tagsContainer}>
                            <Text style={styles.tag}>Gratis pengembalian</Text>
                            <Text style={styles.tag}>Pasti Ori</Text>
                        </View>
                        <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                        <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    </View>
                </View>
            ))}

            <View style={styles.protectionContainer}>
                <TouchableOpacity 
                    style={{flexDirection: 'row', alignItems: 'center', flex: 1}}
                    onPress={() => setProtection(!protection)}
                >
                    <MaterialCommunityIcons 
                        name="shield-check-outline" 
                        size={20} 
                        color={colors.textSecondary} 
                        style={{marginRight: 8}} 
                    />
                    <Text style={styles.protectionText}>Proteksi Rusak Total</Text>
                </TouchableOpacity>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.protectionPrice}>Rp12.150</Text>
                    <TouchableOpacity onPress={() => setProtection(!protection)} style={{marginLeft: 8}}>
                        <Ionicons 
                            name={protection ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={protection ? colors.primary : colors.textSecondary} 
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.shippingOption}>
                <Text style={styles.shippingLabel}>Kurir Toko</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.shippingPrice}>{formatPrice(shippingFeeBySeller[group.seller.name] ?? 0)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
            </TouchableOpacity>

            <View style={styles.noteContainer}>
                <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} style={{marginRight: 8}} />
                <Text style={styles.notePlaceholder}>Kasih Catatan</Text>
            </View>
          </View>
        ))}

        {/* Transaction Summary */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cek ringkasan transaksimu, yuk</Text>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Harga ({selectedItemCount} Barang)</Text>
                <Text style={styles.summaryValue}>{formatPrice(totals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Ongkos Kirim</Text>
                <Text style={styles.summaryValue}>{formatPrice(totals.shipping)}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Layanan <Ionicons name="information-circle-outline" size={14} /></Text>
                <Text style={styles.summaryValue}>{formatPrice(totals.service)}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Jasa Aplikasi <Ionicons name="information-circle-outline" size={14} /></Text>
                <Text style={styles.summaryValue}>{formatPrice(totals.app)}</Text>
            </View>
            {protection && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Proteksi Rusak Total</Text>
                    <Text style={styles.summaryValue}>{formatPrice(totals.protection)}</Text>
                </View>
            )}
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, {color: colors.primary}]}>Promo Belanja <Ionicons name="pricetag" size={14} /></Text>
                <Text style={[styles.summaryValue, {color: colors.primary}]}>-{formatPrice(totals.discount)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Tagihan</Text>
                <Text style={styles.totalValue}>{formatPrice(totals.grandTotal)}</Text>
            </View>
        </View>

        {/* Payment Methods */}
        <View style={[styles.section, {marginBottom: 100}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                <Text style={styles.sectionTitle}>Metode pembayaran</Text>
                <TouchableOpacity>
                    <Text style={{color: colors.primary, fontWeight: 'bold'}}>Lihat Semua</Text>
                </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('briva')}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {/* Placeholder for Bank Icon */}
                    <View style={{width: 32, height: 20, backgroundColor: '#00529C', marginRight: 12, borderRadius: 4}} /> 
                    <Text style={styles.paymentLabel}>BRI Virtual Account</Text>
                </View>
                <Ionicons 
                    name={paymentMethod === 'briva' ? "radio-button-on" : "radio-button-off"} 
                    size={24} 
                    color={paymentMethod === 'briva' ? colors.primary : colors.textSecondary} 
                />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('bcava')}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {/* Placeholder for Bank Icon */}
                    <View style={{width: 32, height: 20, backgroundColor: '#003D79', marginRight: 12, borderRadius: 4}} /> 
                    <Text style={styles.paymentLabel}>BCA Virtual Account</Text>
                </View>
                <Ionicons 
                    name={paymentMethod === 'bcava' ? "radio-button-on" : "radio-button-off"} 
                    size={24} 
                    color={paymentMethod === 'bcava' ? colors.primary : colors.textSecondary} 
                />
            </TouchableOpacity>

            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('gopay')}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {/* Placeholder for Wallet Icon */}
                    <View style={{width: 32, height: 32, backgroundColor: '#00AED6', marginRight: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center'}}>
                        <Ionicons name="wallet" size={16} color="white" />
                    </View>
                    <View>
                        <Text style={styles.paymentLabel}>GoPay</Text>
                        <Text style={{fontSize: 12, color: colors.textSecondary}}>Rp1.041 terpakai</Text>
                    </View>
                </View>
                <Ionicons 
                    name={paymentMethod === 'gopay' ? "radio-button-on" : "radio-button-off"} 
                    size={24} 
                    color={paymentMethod === 'gopay' ? colors.primary : colors.textSecondary} 
                />
            </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total Tagihan</Text>
            <Text style={styles.footerTotalValue}>{formatPrice(totals.grandTotal)}</Text>
        </View>
        <TouchableOpacity 
            style={[styles.payButton, loading && { opacity: 0.7 }]} 
            onPress={handlePayment}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#fff" style={{marginRight: 8}} />
            ) : (
                <Ionicons name="shield-checkmark-outline" size={20} color="white" style={{marginRight: 8}} />
            )}
            <Text style={styles.payButtonText}>{loading ? 'Memproses...' : 'Bayar Sekarang'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.card,
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.border,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 4,
  },
  tag: {
    fontSize: 10,
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  protectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  protectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  protectionPrice: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  shippingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  shippingLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  shippingPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notePlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
