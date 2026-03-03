import React, { useState, useMemo, useRef } from 'react';
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
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { getStorageUrl } from '../services/api';
import { STORE_CATEGORIES } from '../constants/market';
import { formatPhoneNumber } from '../utils/phoneUtils';

const { width } = Dimensions.get('window');

export interface Product {
  id: number;
  name: string;
  price: number | string;
  discount_price?: number | string | null;
  description: string;
  image_url?: string | null;
  images?: string[] | string | null;
  // Legacy fields (optional)
  seller_name?: string;
  seller_whatsapp?: string;
  // New fields from MarketScreen
  user?: {
    name: string;
    phone?: string;
    photo_url?: string;
    is_verified?: boolean;
    rt_id?: number;
  };
  store?: {
    id?: number;
    name: string;
    description?: string;
    image_url?: string | null;
    status: 'pending' | 'verified' | 'rejected';
    verified_at?: string | null;
    user_id?: number;
    rt_id?: number;
    city?: string | null;
    category?: string;
    contact?: string;
    address?: string;
    is_open?: boolean;
    operating_hours?: any;
    is_open_now?: boolean;
    user?: {
      name: string;
      phone?: string;
      photo_url?: string;
    };
  };
  whatsapp?: string;
  category: string;
  is_available?: boolean; // MarketScreen uses is_open for store/product availability
  is_open?: boolean;
  created_at?: string;
   stock?: number;
   rating?: number;
   rating_count?: number;
   satisfaction_rate?: number;
   wishlist_count?: number;
   view_count?: number;
   rt_id?: number;
   shipping_type?: 'PICKUP' | 'LOCAL' | 'COURIER' | string;
   shipping_fee_flat?: number | string | null;
   variant_note?: string | null;
   specifications?: string | null;
   labels?: string[] | null;
  is_halal?: boolean;
  is_bpom?: boolean;
   variants?: ProductVariant[];
   total_sold?: number;
}

export interface VariantOption {
  name: string;
  price: number;
}

export interface ProductVariant {
  id?: number;
  product_id?: number;
  name: string;
  type: 'CHOICE' | 'ADDON';
  price: number;
  is_required: boolean;
  options: VariantOption[];
}

interface ProductDetailScreenProps {
  product: Product;
  onNavigate?: (screen: string) => void;
}

const ProductDetailScreen = ({ product, onNavigate }: ProductDetailScreenProps) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isExpired } = useTenant();
  const { addToCart, itemCount } = useCart();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Animation Refs
  const cartIconRef = useRef<View>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const flyAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const flyScale = useRef(new Animated.Value(1)).current;
  const flyOpacity = useRef(new Animated.Value(1)).current;
  
  // Order State
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, VariantOption[]>>({});

  // Initialize required single-choice variants
  React.useEffect(() => {
    if (product.variants) {
       const initialSelections: Record<string, VariantOption[]> = {};
       product.variants.forEach(v => {
          if (v.type === 'CHOICE' && v.is_required && v.options.length > 0) {
             initialSelections[v.name] = [v.options[0]];
          }
       });
       setSelectedVariantOptions(initialSelections);
    }
  }, [product]);

  const handleOptionSelect = (variantName: string, type: 'CHOICE' | 'ADDON', option: VariantOption) => {
    setSelectedVariantOptions(prev => {
      const currentSelections = prev[variantName] || [];
      
      if (type === 'CHOICE') {
        // Replace selection
        return { ...prev, [variantName]: [option] };
      } else {
        // Toggle selection for ADDON
        const exists = currentSelections.find(o => o.name === option.name);
        if (exists) {
           return { ...prev, [variantName]: currentSelections.filter(o => o.name !== option.name) };
        } else {
           return { ...prev, [variantName]: [...currentSelections, option] };
        }
      }
    });
  };

  const calculateTotal = (basePrice: number) => {
    let totalAddons = 0;
    Object.values(selectedVariantOptions).forEach(options => {
       options.forEach(opt => {
          totalAddons += (opt.price || 0);
       });
    });
    return (basePrice + totalAddons) * quantity;
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
    
    // Limit to max 3 images as requested
    return imgs.filter(Boolean).slice(0, 3);
  }, [product]);

  const variantLines = useMemo(() => {
    if (!product.variant_note) {
      return [];
    }
    return product.variant_note
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }, [product.variant_note]);

  const specificationLines = useMemo(() => {
    if (!product.specifications) {
      return [];
    }
    return product.specifications
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }, [product.specifications]);

  const handleImageScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
    setActiveImageIndex(slide);
  };

  // Helper to get consistent data
  const sellerName = product.store?.name || product.user?.name || product.seller_name || t('market.detail.seller');
  let rtId = Number(product.store?.rt_id || 0);
  
  const cityLabel = product.store?.city || '-';

  // Use store logo -> store user photo -> seller user photo
  const storeLogo = product.store?.image_url || product.store?.user?.photo_url || product.user?.photo_url;

  const sellerWhatsapp = product.whatsapp || product.seller_whatsapp;
  const isVerified = product.store?.status === 'verified' || product.user?.is_verified;
  const isAvailable = product.is_open ?? product.is_available ?? true;
  const sellerInitial = (sellerName || '?').charAt(0).toUpperCase();

  // Discount Calculation
  const priceVal = Number(product.price);
  const discountVal = Number(product.discount_price || 0);
  const hasDiscount = discountVal > 0 && discountVal < priceVal;
  const discountPercent = hasDiscount ? Math.round(((priceVal - discountVal) / priceVal) * 100) : 0;

  const stockValue = typeof product.stock === 'number' ? product.stock : undefined;
  const labels = Array.isArray(product.labels) ? product.labels : [];
  const hasHalal = labels.includes('HALAL');
  const hasBpom = labels.includes('BPOM');

  const hasShippingFee = typeof product.shipping_fee_flat !== 'undefined' && product.shipping_fee_flat !== null && Number(product.shipping_fee_flat) > 0;

  let shippingTypeLabel = 'Pengiriman fleksibel';
  if (product.shipping_type === 'PICKUP') {
    shippingTypeLabel = 'Ambil di tempat';
  } else if (product.shipping_type === 'LOCAL') {
    // Dynamic RT location with free shipping note - Requested format: (RT 004 Gratis)
    if (rtId > 0) {
      shippingTypeLabel = `(RT ${String(rtId).padStart(3, '0')} Gratis)`;
    } else {
      shippingTypeLabel = '(Gratis Ongkir)';
    }
  } else if (product.shipping_type === 'COURIER') {
    shippingTypeLabel = 'Ekspedisi';
  }

  const handleChat = () => {
    if (!sellerWhatsapp) {
      Alert.alert(t('common.info'), t('market.detail.noWhatsapp'));
      return;
    }

    const phone = formatPhoneNumber(sellerWhatsapp);

    const message = `Halo, saya tertarik dengan produk ini: *${product.name}*`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), t('market.detail.whatsappError'));
    });
  };

  const handleAddToCart = (event: any) => {
    // 1. Get start position (touch coordinates)
    const { pageX, pageY } = event.nativeEvent;
    
    // 2. Prepare Animation
    flyAnim.setValue({ x: pageX - 25, y: pageY - 25 }); // Center the 50x50 icon
    flyScale.setValue(1);
    flyOpacity.setValue(1);
    setIsAnimating(true);

    // 3. Get destination position (Cart Icon)
    if (cartIconRef.current) {
      cartIconRef.current.measure((x, y, width, height, destPageX, destPageY) => {
        const destX = destPageX + width / 2 - 25; // Center
        const destY = destPageY + height / 2 - 25; // Center

        Animated.parallel([
          Animated.timing(flyAnim, {
            toValue: { x: destX, y: destY },
            duration: 800,
            useNativeDriver: true,
            easing: Easing.bezier(0.17, 0.67, 0.83, 0.67),
          }),
          Animated.timing(flyScale, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(flyOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            })
          ])
        ]).start(() => {
          setIsAnimating(false);
          addToCart(product, quantity, selectedVariantOptions); // Add with quantity and variants
        });
      });
    } else {
      // Fallback if ref missing
      addToCart(product, quantity, selectedVariantOptions);
      Alert.alert('Sukses', 'Produk ditambahkan ke keranjang');
    }
  };

  const handleBuy = () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('market.detail.accessLimit'));
      return;
    }

    if (!sellerWhatsapp) {
      Alert.alert(t('common.info'), t('market.detail.noWhatsapp'));
      return;
    }

    const phone = formatPhoneNumber(sellerWhatsapp);

    let message = `Halo, saya ingin memesan:\n\n*${product.name}*\nJumlah: ${quantity}\n`;
    
    const variantEntries = Object.entries(selectedVariantOptions);
    if (variantEntries.length > 0) {
       message += `\n✨ Varian:\n` + variantEntries.map(([name, options]) => {
          return `- ${name}: ${options.map(o => o.name).join(', ')}`;
       }).join('\n');
    }
    
    const total = calculateTotal(Number(product.price));
    message += `\n\nTotal: ${formatCurrency(total)}`;
    
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
            <View ref={cartIconRef} collapsable={false}> 
              <TouchableOpacity 
                style={styles.headerCartBtn}
                onPress={() => onNavigate?.('CART')}
              >
                <Ionicons name="cart-outline" size={24} color="#fff" />
                {itemCount > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>
                      {itemCount > 99 ? '99+' : itemCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Flying Icon Animation */}
      {isAnimating && (
        <Animated.View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.card,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            transform: [
              { translateX: flyAnim.x },
              { translateY: flyAnim.y },
              { scale: flyScale }
            ],
            opacity: flyOpacity
          }}
          pointerEvents="none"
        >
          <Image
             source={{ uri: getStorageUrl(productImages[0]) || 'https://via.placeholder.com/50' }}
             style={{ width: 50, height: 50, borderRadius: 25 }}
          />
        </Animated.View>
      )}

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
            <Text style={styles.categoryText}>
              {STORE_CATEGORIES.find(c => c.id === product.category)?.label || product.category}
            </Text>
          </View>
        </View>

        {/* Wishlist Count Banner (Social Proof) */}
        {product.wishlist_count && product.wishlist_count > 0 ? (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#e2e8f0'
          }}>
             <View style={{ flexDirection: 'row', marginRight: 12 }}>
                {[1,2,3].map(i => (
                  <View key={i} style={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: 10, 
                    backgroundColor: isDarkMode ? '#475569' : '#cbd5e1', 
                    borderWidth: 2, 
                    borderColor: isDarkMode ? '#1e293b' : '#fff',
                    marginLeft: i > 1 ? -8 : 0
                  }} />
                ))}
             </View>
             <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
               <Text style={{ fontWeight: 'bold', color: colors.text }}>{product.wishlist_count} orang</Text> memasukkan ini ke keranjang
             </Text>
          </View>
        ) : null}

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, paddingLeft: 4 }}>
           {(product.rating && product.rating > 0) || (product.rating_count && product.rating_count > 0) ? (
             <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#422006' : '#fefce8', marginRight: 8 }]}>
                <Ionicons name="star" size={12} color="#eab308" />
                <Text style={[styles.infoPillText, { color: isDarkMode ? '#fde047' : '#854d0e', marginLeft: 4 }]}>
                  {product.rating && product.rating > 0 ? product.rating : 'Baru'}
                  {product.rating_count && product.rating_count > 0 ? ` (${product.rating_count})` : ''}
                </Text>
             </View>
           ) : null}

           {product.satisfaction_rate && product.satisfaction_rate > 0 ? (
             <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', marginRight: 8 }]}>
                <Feather name="thumbs-up" size={12} color="#10b981" />
                <Text style={[styles.infoPillText, { color: isDarkMode ? '#34d399' : '#047857', marginLeft: 4 }]}>
                  {product.satisfaction_rate}% Sesuai
                </Text>
             </View>
           ) : null}

           {product.total_sold && product.total_sold > 0 ? (
             <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', marginRight: 8 }]}>
                <Feather name="shopping-bag" size={12} color={colors.textSecondary} />
                <Text style={[styles.infoPillText, { color: colors.textSecondary, marginLeft: 4 }]}>
                  Terjual {product.total_sold}
                </Text>
             </View>
           ) : null}
           <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', marginRight: 8 }]}>
              <Feather name="truck" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoPillText, { color: colors.textSecondary, marginLeft: 4 }]}>
                {hasShippingFee
                  ? `Ongkir ${formatCurrency(product.shipping_fee_flat as number | string)} ${shippingTypeLabel}`
                  : product.shipping_type === 'LOCAL' ? shippingTypeLabel : `Gratis Ongkir ${shippingTypeLabel}`}
              </Text>
           </View>

           <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', marginRight: 8 }]}>
              <Feather name="clock" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoPillText, { color: colors.textSecondary, marginLeft: 4 }]}>
                Estimasi Tiba: {(() => {
                   const type = product.shipping_type;
                   if (type === 'LOCAL') return 'Instant (15-30 Menit)';
                   if (type === 'PICKUP') return 'Siap Diambil';
                   if (type === 'COURIER') return 'Ekspedisi (1-3 Hari)';
                   return 'Tergantung Kurir';
                })()}
              </Text>
           </View>
           <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6', marginRight: 8 }]}>
              <Feather name="package" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoPillText, { color: colors.textSecondary, marginLeft: 4 }]}>
                {typeof stockValue === 'number' ? `Stok: ${stockValue}` : 'Stok: Ada'}
              </Text>
           </View>
           {(hasHalal || hasBpom) && (
             <View style={[styles.infoPill, { backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7', marginRight: 8 }]}>
               <Feather name="shield" size={12} color={isDarkMode ? '#4ade80' : '#166534'} />
               <Text style={[styles.infoPillText, { color: isDarkMode ? '#4ade80' : '#166534', fontWeight: '600', marginLeft: 4 }]}>
                 {hasHalal && hasBpom ? 'Halal & BPOM' : hasHalal ? 'Halal' : 'BPOM'}
               </Text>
             </View>
           )}
        </ScrollView>



        {/* Seller Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, padding: 12 }]}>
          <View style={styles.sellerRow}>
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primary + '20', width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }]}>
              {storeLogo ? (
                <Image 
                  source={{ uri: getStorageUrl(storeLogo) || '' }} 
                  style={{ width: 40, height: 40 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[styles.sellerInitial, { color: colors.primary, fontSize: 18 }]}>
                  {sellerInitial}
                </Text>
              )}
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
                      <Text style={[styles.sellerMetaText, { color: '#10b981' }]}>{cityLabel}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

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

        {variantLines.length > 0 ? (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="layers" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, fontSize: 14 }]}>VARIAN</Text>
              </View>
              <View style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, color: '#3b82f6', fontWeight: '600' }}>Opsional</Text>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, padding: 12 }]}>
              {variantLines.map((line, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={{ color: colors.textSecondary, marginRight: 6 }}>•</Text>
                  <Text style={[styles.description, { color: colors.textSecondary, flex: 1 }]}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {specificationLines.length > 0 ? (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="file-text" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, fontSize: 14 }]}>SPESIFIKASI PRODUK</Text>
              </View>
              <View style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, color: '#3b82f6', fontWeight: '600' }}>Opsional</Text>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, padding: 12 }]}>
              {specificationLines.map((line, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={{ color: colors.textSecondary, marginRight: 6 }}>•</Text>
                  <Text style={[styles.description, { color: colors.textSecondary, flex: 1 }]}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {product.variants && product.variants.length > 0 ? (
          <View style={{ marginBottom: 100 }}>
            {product.variants.map((variant, index) => (
              <View key={index} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name={variant.type === 'CHOICE' ? "list" : "check-square"} size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, fontSize: 14 }]}>{variant.name}</Text>
                  </View>
                  <View style={{ 
                    backgroundColor: variant.is_required ? (isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2') : (isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff'), 
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 
                  }}>
                    <Text style={{ fontSize: 10, color: variant.is_required ? '#ef4444' : '#3b82f6', fontWeight: '600' }}>
                      {variant.is_required ? 'Wajib' : 'Opsional'}
                    </Text>
                  </View>
                </View>

                <View style={styles.addonsContainer}>
                  {variant.options.map((option, optIdx) => {
                    const isSelected = selectedVariantOptions[variant.name]?.some(o => o.name === option.name);
                    return (
                      <TouchableOpacity
                        key={optIdx}
                        style={[
                          styles.addonPill,
                          isSelected && { 
                            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                            borderColor: '#10b981'
                          },
                          { borderColor: colors.border, opacity: isAvailable ? 1 : 0.5, backgroundColor: colors.card, width: variant.type === 'CHOICE' ? '100%' : '48%' }
                        ]}
                        onPress={() => handleOptionSelect(variant.name, variant.type, option)}
                        disabled={!isAvailable}
                      >
                        <View style={[
                          styles.addonRadio,
                          isSelected ? { borderColor: '#10b981' } : { borderColor: colors.textSecondary },
                          variant.type === 'ADDON' && { borderRadius: 4 }
                        ]}>
                          {isSelected && <View style={[styles.addonInnerRadio, variant.type === 'ADDON' && { borderRadius: 2 }]} />}
                        </View>
                        
                        <View style={styles.addonContent}>
                          <Text style={[styles.addonNamePill, { color: colors.text }]}>{option.name}</Text>
                          {option.price > 0 && (
                            <Text style={styles.addonPricePill}>+{formatCurrency(option.price)}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Fallback for legacy variants string if no structured variants */
          <View style={{ marginBottom: 100 }} />
        )}
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

           {/* Add to Cart Button */}
           <TouchableOpacity 
              style={[styles.chatBtn, { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', marginLeft: 8 }]}
              onPress={handleAddToCart}
            >
              <MaterialCommunityIcons name="cart-plus" size={24} color={colors.primary} />
           </TouchableOpacity>
              
           {/* Buy Button */}
           <TouchableOpacity 
              style={[styles.buyBtn, { backgroundColor: '#10b981', marginLeft: 8 }]}
              onPress={handleBuy}
            >
              <Text style={styles.buyBtnTitle}>Beli Langsung</Text>
              <Text style={styles.buyBtnSubtitle}>{formatCurrency(calculateTotal(Number(product.price)))}</Text>
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
  headerCartBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
