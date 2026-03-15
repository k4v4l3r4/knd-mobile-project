import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useTenant } from '../context/TenantContext';
import { getStorageUrl } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CartScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired } = useTenant();
  const styles = getStyles(colors, isDarkMode);
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart, toggleSelection, toggleAllSelection, selectedItemCount } = useCart();
  const [loading, setLoading] = useState(false);
  
  const allSelected = cart.length > 0 && cart.every(item => item.selected);

  const handleToggleAll = () => {
    toggleAllSelection(!allSelected);
  };

  const handleRemoveItem = (item: any) => {
    Alert.alert(
      'Hapus Produk',
      `Apakah Anda yakin ingin menghapus ${item.name} dari keranjang?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive', 
          onPress: () => {
            console.log('Removing item:', item.id, item.name);
            removeFromCart(item.id, item.selectedVariants);
          }
        }
      ]
    );
  };

  const handleQuantityChange = (item: any, newQuantity: number) => {
    console.log('Updating quantity for item:', item.id, 'from', item.quantity, 'to', newQuantity);
    updateQuantity(item.id, newQuantity, item.selectedVariants);
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numPrice || 0);
  };

  const handleCheckout = () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('market.cart.accessLimit'));
      return;
    }

    const selectedItems = cart.filter(item => item.selected);
    if (selectedItems.length === 0) {
      Alert.alert('Info', 'Silakan pilih produk yang ingin dibeli terlebih dahulu');
      return;
    }
    
    onNavigate('CHECKOUT');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => {
                console.log('Toggling selection for item:', item.id, item.name);
                toggleSelection(item.id, item.selectedVariants);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={item.selected ? "checkbox" : "square-outline"} 
                size={24} 
                color={item.selected ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
            <MaterialCommunityIcons name="store" size={16} color={colors.textSecondary} />
            <Text style={styles.storeName}>{item.store?.name || item.seller_name || 'Toko'}</Text>
        </View>
      </View>
      
      <View style={styles.itemContent}>
        <Image
          source={{ uri: (item.image_url ? getStorageUrl(item.image_url) : null) || (item.images && item.images[0] ? getStorageUrl(item.images[0]) : null) || 'https://via.placeholder.com/100' }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
        </View>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity 
          onPress={() => handleRemoveItem(item)} 
          style={styles.deleteButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
           <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
        
        <View style={styles.quantityControl}>
          <TouchableOpacity 
            onPress={() => handleQuantityChange(item, item.quantity - 1)}
            style={styles.quantityButton}
            activeOpacity={0.7}
            disabled={item.quantity <= 1}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Ionicons name="remove" size={16} color={item.quantity <= 1 ? colors.textSecondary : colors.text} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity 
            onPress={() => handleQuantityChange(item, item.quantity + 1)}
            style={styles.quantityButton}
            activeOpacity={0.7}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Ionicons name="add" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onNavigate('MARKET')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Keranjang</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Keranjang Anda kosong</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => onNavigate('MARKET')}
          >
            <Text style={styles.shopButtonText}>Mulai Belanja</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.selectAllContainer}
              onPress={handleToggleAll}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={allSelected ? "checkbox" : "square-outline"} 
                size={24} 
                color={allSelected ? colors.primary : colors.textSecondary}
              />
              <Text style={styles.selectAllText}>Semua</Text>
            </TouchableOpacity>

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Harga</Text>
              <Text style={styles.totalPrice}>{formatPrice(cartTotal)}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.checkoutButton, { opacity: selectedItemCount === 0 ? 0.5 : 1 }]} 
              onPress={handleCheckout}
              disabled={loading || selectedItemCount === 0}
            >
              {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
              ) : (
                  <Text style={styles.checkoutButtonText}>Beli ({selectedItemCount})</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
    backgroundColor: colors.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  backButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  cartItem: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.border,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#374151' : '#f3f4f6',
  },
  deleteButton: {
    padding: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
    borderRadius: 8,
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  selectAllText: {
    marginLeft: 8,
    color: colors.text,
    fontSize: 14,
  },
  totalContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 16,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 16,
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
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
  },
});
