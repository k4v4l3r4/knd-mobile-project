import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  StatusBar,
  Linking,
  Platform,
  Alert,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { getStorageUrl } from '../services/api';

const { width } = Dimensions.get('window');

export interface Product {
  id: number;
  name: string;
  price: number | string;
  discount_price?: number | string | null;
  description: string;
  image_url?: string | null;
  images?: string[] | null;
  // Legacy fields (optional)
  seller_name?: string;
  seller_whatsapp?: string;
  // New fields from MarketScreen
  user?: {
    name: string;
    phone?: string;
    photo_url?: string;
    is_verified?: boolean;
  };
  store?: {
    name: string;
    status: 'pending' | 'verified' | 'rejected';
  };
  whatsapp?: string;
  category: string;
  is_available?: boolean; // MarketScreen uses is_open for store/product availability
  is_open?: boolean;
  created_at?: string;
}

interface ProductDetailScreenProps {
  product: Product;
}

const ProductDetailScreen = ({ product }: ProductDetailScreenProps) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Order State
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const MOCK_ADDONS = [
    { id: '1', name: 'Nasi Putih', price: 5000 },
    { id: '2', name: 'Telur Dadar', price: 4000 },
    { id: '3', name: 'Sambal Terasi', price: 2000 },
    { id: '4', name: 'Es Teh Manis', price: 3000 },
  ];

  const toggleAddon = (addonName: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonName) 
        ? prev.filter(a => a !== addonName) 
        : [...prev, addonName]
    );
  };

  const calculateTotal = (basePrice: number) => {
    const addonsPrice = selectedAddons.reduce((acc, name) => {
      const addon = MOCK_ADDONS.find(a => a.name === name);
      return acc + (addon?.price || 0);
    }, 0);
    return (basePrice + addonsPrice) * quantity;
  };

  const productImages = useMemo(() => {
    let imgs: string[] = [];
    if (product.images) {
      if (Array.isArray(product.images)) {
        imgs = product.images;
      } else if (typeof product.images === 'string') {
        try {
          imgs = JSON.parse(product.images);
        } catch (e) {
          console.error("Failed to parse product images", e);
        }
      }
    }
    
    if (imgs.length === 0 && product.image_url) {
      imgs = [product.image_url];
    }
    
    return imgs.filter(Boolean);
  }, [product]);

  const handleImageScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
    setActiveImageIndex(slide);
  };

  // Helper to get consistent data
  const sellerName = product.store?.name || product.user?.name || product.seller_name || t('market.detail.seller');
  const sellerWhatsapp = product.whatsapp || product.seller_whatsapp;
  const isVerified = product.store?.status === 'verified' || product.user?.is_verified;
  const isAvailable = product.is_open ?? product.is_available ?? true;
  const sellerInitial = (sellerName || '?').charAt(0).toUpperCase();

  // Discount Calculation
  const priceVal = Number(product.price);
  const discountVal = Number(product.discount_price || 0);
  const hasDiscount = discountVal > 0 && discountVal < priceVal;
  const discountPercent = hasDiscount ? Math.round(((priceVal - discountVal) / priceVal) * 100) : 0;

  const handleChat = () => {
    if (!sellerWhatsapp) {
      Alert.alert(t('common.info'), t('market.detail.noWhatsapp'));
      return;
    }

    let phone = sellerWhatsapp;
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    const message = `Halo, saya tertarik dengan produk ini: *${product.name}*`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), t('market.detail.whatsappError'));
    });
  };

  const handleBuy = () => {
    if (!sellerWhatsapp) {
      Alert.alert(t('common.info'), t('market.detail.noWhatsapp'));
      return;
    }

    let phone = sellerWhatsapp;
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    let message = `Halo, saya ingin memesan:\n\n*${product.name}*\nJumlah: ${quantity}\n`;
    
    if (selectedAddons.length > 0) {
      message += `Tambahan: ${selectedAddons.join(', ')}\n`;
    }
    
    const total = calculateTotal(Number(product.price));
    message += `\nTotal: ${formatCurrency(total)}`;
    
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), t('market.detail.whatsappError'));
    });
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View
        style={[
          styles.headerBackground,
          { backgroundColor: isDarkMode ? '#059669' : '#047857' }
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
               <Text style={styles.headerTitle} numberOfLines={1}>{t('market.detail.title')}</Text>
               <DemoLabel />
            </View>
            <View style={{ width: 40 }} /> 
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.viewingBanner}>
        <Feather name="eye" size={14} color="#f43f5e" />
        <Text style={[styles.viewingText, { color: '#f43f5e' }]}>4 tetangga sedang melihat produk ini</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image Carousel */}
        <View style={[styles.imageContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
          >
            {productImages.length > 0 ? (
              productImages.map((img, index) => (
                <Image
                  key={index}
                  source={{ 
                    uri: getStorageUrl(img) || 'https://via.placeholder.com/400x300?text=No+Image' 
                  }}
                  style={[styles.image, { width: width - 32 }]}
                  resizeMode="cover"
                />
              ))
            ) : (
              <Image
                source={{ uri: 'https://via.placeholder.com/400x300?text=No+Image' }}
                style={[styles.image, { width: width - 32 }]}
                resizeMode="cover"
              />
            )}
          </ScrollView>

          {/* Pagination Dots */}
          {productImages.length > 1 && (
            <View style={styles.paginationDots}>
              {productImages.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.dot, 
                    i === activeImageIndex ? styles.activeDot : styles.inactiveDot
                  ]} 
                />
              ))}
            </View>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
             <View style={styles.discountBadge}>
               <Text style={styles.discountText}>{discountPercent}% OFF</Text>
             </View>
          )}

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
        </View>

        {/* Title & Price */}
        <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={[styles.productName, { color: colors.text, fontSize: 24, marginBottom: 4 }]}>{product.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.productPrice, { color: colors.primary, fontSize: 22 }]}>
              {formatCurrency(product.price)}
            </Text>
            {hasDiscount && (
              <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                {formatCurrency(priceVal)}
              </Text>
            )}
          </View>
        </View>

        {/* Info Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, paddingLeft: 4 }}>
           <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }]}>
              <Feather name="clock" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoPillText, { color: colors.textSecondary }]}>Estimasi 15-30 mnt</Text>
           </View>
           <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }]}>
              <Feather name="truck" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoPillText, { color: colors.textSecondary }]}>Ongkir mulai Rp 2rb</Text>
           </View>
           <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }]}>
              <Feather name="thumbs-up" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoPillText, { color: colors.textSecondary }]}>Disukai 120+ orang</Text>
           </View>
        </ScrollView>

        {/* Seller Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, padding: 12 }]}>
          <View style={styles.sellerRow}>
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primary + '20', width: 40, height: 40, borderRadius: 20 }]}>
              <Text style={[styles.sellerInitial, { color: colors.primary, fontSize: 18 }]}>
                {sellerInitial}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.sellerName, { color: colors.text }]}>{sellerName}</Text>
                    {isVerified && (
                       <MaterialCommunityIcons name="check-decagram" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                  
                  <View style={styles.sellerMetaRow}>
                    <View style={[styles.sellerMetaPill, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' }]}>
                      <Feather name="map-pin" size={10} color="#10b981" />
                      <Text style={[styles.sellerMetaText, { color: '#10b981' }]}>Blok C / RT 03</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>•  Aktif 5 menit lalu</Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                   <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 2 }}>BALAS CHAT</Text>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Feather name="zap" size={12} color="#10b981" />
                     <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981', marginLeft: 2 }}>&lt; 3 Menit</Text>
                   </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Description Card */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
            <MaterialIcons name="description" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, fontSize: 14 }]}>DESKRIPSI</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, padding: 12 }]}>
            <Text style={[styles.description, { color: colors.textSecondary, marginBottom: 0 }]}>
              {product.description || t('market.detail.noDescription')}
            </Text>
          </View>
        </View>

        {/* Addons Selection */}
        <View style={{ marginBottom: 100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="layers" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, fontSize: 14 }]}>VARIAN TAMBAHAN</Text>
            </View>
            <View style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, color: '#3b82f6', fontWeight: '600' }}>Opsional</Text>
            </View>
          </View>

          <View style={styles.addonsContainer}>
            {MOCK_ADDONS.map((addon) => (
              <TouchableOpacity
                key={addon.id}
                style={[
                  styles.addonPill,
                  selectedAddons.includes(addon.name) && { 
                    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                    borderColor: '#10b981'
                  },
                  { borderColor: colors.border, opacity: isAvailable ? 1 : 0.5, backgroundColor: colors.card }
                ]}
                onPress={() => toggleAddon(addon.name)}
                disabled={!isAvailable}
              >
                <View style={[
                  styles.addonRadio,
                  selectedAddons.includes(addon.name) ? { borderColor: '#10b981' } : { borderColor: colors.textSecondary }
                ]}>
                  {selectedAddons.includes(addon.name) && <View style={styles.addonInnerRadio} />}
                </View>
                
                <View style={styles.addonContent}>
                  <Text style={[styles.addonNamePill, { color: colors.text }]}>{addon.name}</Text>
                  <Text style={styles.addonPricePill}>+{formatCurrency(addon.price)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.footerContent}>
           {/* Quantity Control */}
           <View style={[styles.footerQuantity, { borderColor: colors.border }]}>
              <TouchableOpacity 
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={[styles.footerQtyBtn, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}
              >
                <Feather name="minus" size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.footerQtyText, { color: colors.text }]}>{quantity}</Text>
              <TouchableOpacity 
                onPress={() => setQuantity(quantity + 1)}
                style={[styles.footerQtyBtn, { backgroundColor: '#10b981' }]}
              >
                <Feather name="plus" size={16} color="#fff" />
              </TouchableOpacity>
           </View>

           {/* Chat Button */}
           <TouchableOpacity 
              style={[styles.chatBtn, { borderColor: colors.border }]}
              onPress={handleChat}
            >
              <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
           </TouchableOpacity>
              
           {/* Buy Button */}
           <TouchableOpacity 
              style={[styles.buyBtn, { backgroundColor: '#10b981' }]}
              onPress={handleBuy}
            >
              <Text style={styles.buyBtnTitle}>Beli Sekarang</Text>
              <Text style={styles.buyBtnSubtitle}>Total: {formatCurrency(calculateTotal(Number(product.price)))}</Text>
           </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: -20, // Overlap with content
    zIndex: 1,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    zIndex: 0,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 36,
    paddingBottom: 120,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 20,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    width: 8,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  headerInfo: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sellerInitial: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#dbeafe',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  sellerJoinDate: {
    fontSize: 12,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 20,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  contactButton: {
    borderRadius: 16,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
  },
  addonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  addonPill: {
    width: '48%', 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    marginHorizontal: '1%',
  },
  addonRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonInnerRadio: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  addonContent: {
    flex: 1,
  },
  addonNamePill: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  addonPricePill: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    height: 50,
  },
  footerQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerQtyText: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    minWidth: 10,
    textAlign: 'center',
  },
  chatBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buyBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buyBtnTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buyBtnSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    marginTop: 1,
  },
  viewingBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  sellerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  sellerMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  sellerMetaText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ProductDetailScreen;
