import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  Dimensions,
  RefreshControl,
  Platform,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStorageUrl } from '../services/api';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { ImagePickerModal } from '../components/ImagePickerModal';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../services/auth';

const { width } = Dimensions.get('window');

// Enhanced Product Interface
interface Product {
  id: number;
  name: string;
  price: string | number;
  discount_price?: string | number | null;
  image_url: string | null;
  images?: string[] | null;
  category: 'FOOD' | 'SERVICE' | 'GOODS';
  rating: number;
  is_open: boolean;
  user: {
    name: string;
    phone?: string;
    photo_url?: string;
    is_verified?: boolean; // Optional for dummy
  };
  store?: {
    name: string;
    status: 'pending' | 'verified' | 'rejected';
  };
  whatsapp: string;
  description: string;
  rt_id?: number;
  shopee_url?: string | null;
  tokopedia_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
}

interface Store {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  user_id: number;
  rt_id: number;
  category?: 'FOOD' | 'GOODS' | 'SERVICE';
  contact?: string;
  address?: string;
  user?: {
    name: string;
    phone?: string;
    photo_url?: string;
  };
}

interface MarketScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export default function MarketScreen({ onNavigate }: MarketScreenProps) {
  const { colors, isDarkMode, setTheme } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeTab, setActiveTab] = useState<'MARKETPLACE' | 'MY_STORE' | 'APPROVAL'>('MARKETPLACE');
  const [isAdminRT, setIsAdminRT] = useState(false);
  
  // Marketplace State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'FOOD' | 'SERVICE'>('ALL');

  // Approval State
  const [pendingStores, setPendingStores] = useState<Store[]>([]);

  // My Store State
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  
  // Create Store Form State
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [storeCategory, setStoreCategory] = useState<'FOOD' | 'GOODS' | 'SERVICE'>('FOOD');
  const [storeContact, setStoreContact] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  
  // Image Picker Modal
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    checkRole();
    // Pre-fill contact with user's phone
    const loadUserPhone = async () => {
      const user = await authService.getUser();
      if (user?.phone) {
        setStoreContact(user.phone);
      }
    };
    loadUserPhone();
  }, []);

  const checkRole = async () => {
    try {
      const user = await authService.getUser();
      setIsAdminRT(user?.role === 'ADMIN_RT');
    } catch (error) {
      console.log('Error checking role:', error);
    }
  };

  const fetchProducts = async (query = '') => {
    setLoading(true);
    try {
      const params = query ? { search: query } : {};
      const response = await api.get('/products', { params });
      if (response.data.data) {
        setProducts(response.data.data);
      }
    } catch (error: any) {
      console.log('Error fetching products:', error);
      if (error.response?.status === 401) {
         Alert.alert(t('common.sessionExpired'), t('common.sessionExpiredMsg'), [{ text: "OK" }]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingStores = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/stores', { params: { status: 'pending' } });
      if (response.data.data) {
        setPendingStores(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching pending stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerifyStore = async (storeId: number, approve: boolean) => {
    try {
      await api.post(`/admin/stores/${storeId}/verify`, {
        status: approve ? 'verified' : 'rejected'
      });
      Alert.alert('Sukses', `Toko berhasil ${approve ? 'disetujui' : 'ditolak'}`);
      fetchPendingStores();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal memproses toko');
    }
  };

  const fetchMyStore = async () => {
    setLoadingStore(true);
    try {
      const response = await api.get('/stores/me');
      if (response.data.data) {
        setMyStore(response.data.data);
      } else {
        setMyStore(null);
      }
    } catch (error: any) {
      console.log('Error fetching my store:', error);
      // 404 means no store, that's fine
      if (error.response?.status === 404) {
        setMyStore(null);
      }
    } finally {
      setLoadingStore(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'MARKETPLACE') {
      fetchProducts();
    } else if (activeTab === 'MY_STORE') {
      fetchMyStore();
    } else if (activeTab === 'APPROVAL') {
      fetchPendingStores();
    }
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'MARKETPLACE') {
      fetchProducts(searchQuery);
    } else if (activeTab === 'MY_STORE') {
      fetchMyStore();
      setRefreshing(false);
    } else if (activeTab === 'APPROVAL') {
      fetchPendingStores();
    }
  }, [activeTab, searchQuery]);

  const handleCreateStore = async () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpired'));
      return;
    }
    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('market.demoModeCreate'));
      return;
    }

    if (!storeName.trim()) {
      Alert.alert(t('common.validation'), t('market.createStore.validationName'));
      return;
    }

    if (!storeContact.trim()) {
      Alert.alert(t('common.validation'), t('market.createStore.validationContact'));
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', storeName);
      formData.append('description', storeDescription);
      formData.append('category', storeCategory);
      formData.append('contact', storeContact);
      formData.append('address', storeAddress);
      
      if (storeImage) {
        const filename = storeImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;
        
        formData.append('image', {
          uri: storeImage,
          name: filename,
          type
        } as any);
      }

      const response = await api.post('/stores', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        t('market.createStore.successTitle'), 
        t('market.createStore.successMsg'),
        [{ text: 'OK', onPress: () => {
          setIsCreatingStore(false);
          fetchMyStore();
        }}]
      );
    } catch (error: any) {
      console.error('Create store error:', error);
      Alert.alert(t('common.failed'), error.response?.data?.message || t('market.createStore.failed'));
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (mode: 'camera' | 'gallery') => {
    try {
      let result;
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('report.permissionDenied'), t('report.cameraPermission'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('report.permissionDenied'), t('report.galleryPermission'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled) {
        setStoreImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert(t('common.error'), t('market.imagePickerError'));
    }
  };

  const formatRupiah = (value: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value));
  };

  const handleWhatsApp = (product: Product) => {
    const message = t('market.whatsappOrderMessage', { sellerName: product.user.name, productName: product.name });
    const url = `https://wa.me/${product.whatsapp}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error'), t('market.whatsappError'));
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const renderImagePlaceholder = (item: Product) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
    
    // Determine category icon
    let iconName: any = 'package-variant';
    const catLower = (item.category || '').toLowerCase();
    if (catLower.includes('food') || catLower.includes('makan')) iconName = 'food';
    else if (catLower.includes('service') || catLower.includes('jasa')) iconName = 'wrench';
    
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderInitial}>{initial}</Text>
        <View style={styles.placeholderIconContainer}>
          <MaterialCommunityIcons name={iconName} size={16} color="#ea580c" />
        </View>
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const avatarUrl = item.user.photo_url 
      ? getStorageUrl(item.user.photo_url)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user.name)}&background=random&color=fff&size=128`;
    
    const avatarSource = { uri: avatarUrl || 'https://via.placeholder.com/128' };
    const imageUrl = getStorageUrl(item.image_url || '');

    return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => onNavigate('PRODUCT_DETAIL', item)}
      activeOpacity={0.95}
    >
      {/* 1. Product Image Area */}
      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image 
            source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/400' }} 
            style={[styles.productImage, !item.is_open && styles.grayscaleImage]} 
            resizeMode="cover"
          />
        ) : renderImagePlaceholder(item)}
        
        {/* Status Badge - Top Left */}
        {!item.is_open && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>{t('market.product.closed')}</Text>
          </View>
        )}

        {/* Rating Badge - Top Right */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color="#fbbf24" />
          <Text style={styles.ratingText}>{item.rating > 0 ? item.rating : 'New'}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        {/* 2. Category & Title */}
        <Text style={styles.categoryLabel}>
          {item.category === 'FOOD' ? 'Kuliner' : item.category === 'SERVICE' ? 'Jasa' : 'Barang'}
        </Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        
        {/* 3. Price */}
        <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>

        {/* 4. Seller Info */}
        <View style={styles.sellerRow}>
          <Image 
            source={avatarSource} 
            style={styles.avatar} 
          />
          <View style={styles.sellerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.sellerName} numberOfLines={1}>
                {item.store?.name || item.user.name}
              </Text>
              {(item.store?.status === 'verified' || item.user.is_verified) && (
                <MaterialCommunityIcons name="check-decagram" size={12} color="#0ea5e9" style={{ marginLeft: 2 }} />
              )}
            </View>
            <Text style={styles.locationText}>RT 0{item.rt_id || '1'}</Text>
          </View>
          
          {/* Chat Button (Icon Only) */}
          <TouchableOpacity 
            style={styles.chatIconBtn}
            onPress={() => handleWhatsApp(item)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )};

  const renderPendingStoreItem = ({ item }: { item: Store }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image 
          source={item.image_url ? { uri: getStorageUrl(item.image_url) || '' } : { uri: 'https://via.placeholder.com/400' }} 
          style={styles.productImage} 
          resizeMode="cover"
        />
        <View style={styles.closedOverlay}>
           <Text style={styles.closedText}>MENUNGGU PERSETUJUAN</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.storeDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.sellerRow}>
           <Text style={styles.sellerName}>Pemilik: {item.user?.name || 'Warga'}</Text>
           <Text style={styles.locationText}>RT 0{item.rt_id}</Text>
        </View>

        <View style={[styles.buttonRow, { marginTop: 12 }]}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton, { backgroundColor: '#fee2e2', borderColor: '#fca5a5', marginRight: 8 }]}
            onPress={() => handleVerifyStore(item.id, false)}
          >
            <Text style={[styles.cancelButtonText, { color: '#991b1b' }]}>Tolak</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.submitButton, { backgroundColor: '#16a34a', marginLeft: 8 }]}
            onPress={() => handleVerifyStore(item.id, true)}
          >
            <Text style={styles.submitButtonText}>Setujui</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderMyStore = () => {
    if (loadingStore) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (isCreatingStore) {
      return (
        <ScrollView 
          style={styles.formContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('market.createStore.title')}</Text>
            <Text style={styles.formSubtitle}>{t('market.createStore.subtitle')}</Text>
            
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.imagePicker}>
              {storeImage ? (
                <Image source={{ uri: storeImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                  <Text style={styles.imagePlaceholderText}>{t('market.createStore.uploadPhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('market.createStore.name')}</Text>
              <TextInput
                style={styles.input}
                value={storeName}
                onChangeText={setStoreName}
                placeholder={t('market.createStore.namePlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('market.createStore.category')}</Text>
              <View style={styles.categoryContainer}>
                {(['FOOD', 'GOODS', 'SERVICE'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      storeCategory === cat && styles.activeCategoryButton
                    ]}
                    onPress={() => setStoreCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      storeCategory === cat && styles.activeCategoryButtonText
                    ]}>
                      {cat === 'FOOD' ? t('market.categories.food') : cat === 'GOODS' ? t('market.categories.goods') : t('market.categories.service')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('market.createStore.contact')}</Text>
              <TextInput
                style={styles.input}
                value={storeContact}
                onChangeText={setStoreContact}
                placeholder={t('market.createStore.contactPlaceholder')}
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('market.createStore.address')}</Text>
              <TextInput
                style={styles.input}
                value={storeAddress}
                onChangeText={setStoreAddress}
                placeholder={t('market.createStore.addressPlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('market.createStore.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={storeDescription}
                onChangeText={setStoreDescription}
                placeholder={t('market.createStore.descriptionPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsCreatingStore(false)}
              >
                <Text style={styles.cancelButtonText}>{t('market.createStore.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.submitButton]}
                onPress={handleCreateStore}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('market.createStore.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (!myStore) {
      return (
        <View style={styles.emptyStateContainer}>
          <Image 
            source={{ uri: 'https://img.freepik.com/free-vector/shop-with-sign-we-are-open_23-2148547718.jpg' }} 
            style={styles.emptyStateImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyStateTitle}>{t('market.emptyStore.title')}</Text>
          <Text style={styles.emptyStateText}>
            {t('market.emptyStore.text')}
          </Text>
          <TouchableOpacity 
            style={styles.createStoreButton}
            onPress={() => setIsCreatingStore(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.createStoreButtonText}>{t('market.emptyStore.button')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Display My Store Info
    return (
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.storeContainer}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.storeHeader}>
          <Image 
            source={myStore.image_url ? { uri: getStorageUrl(myStore.image_url) || '' } : { uri: 'https://via.placeholder.com/400' }}
            style={styles.storeCover}
          />
          <View style={styles.storeInfoCard}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.storeNameTitle}>{myStore.name}</Text>
              <View style={[
                styles.statusChip, 
                myStore.status === 'verified' ? styles.statusVerified : 
                myStore.status === 'rejected' ? styles.statusRejected : styles.statusPending
              ]}>
                <Text style={[
                  styles.statusChipText,
                  myStore.status === 'verified' ? styles.textVerified : 
                  myStore.status === 'rejected' ? styles.textRejected : styles.textPending
                ]}>
                  {myStore.status === 'verified' ? t('market.status.verified') : 
                   myStore.status === 'rejected' ? t('market.status.rejected') : t('market.status.pending')}
                </Text>
              </View>
            </View>
            <Text style={styles.storeDescription}>{myStore.description || t('market.noDescription')}</Text>
            
            {myStore.status === 'verified' && (
              <TouchableOpacity 
                style={styles.manageProductsButton}
                onPress={() => {
                  if (isExpired) {
                    Alert.alert(t('report.accessLimited'), 'Masa trial RT Anda telah habis.');
                    return;
                  }
                  // Allow access in Demo Mode so users can see the UI
                  onNavigate('ADD_PRODUCT');
                }}
              >
                <MaterialCommunityIcons name="cube-outline" size={20} color="#fff" />
                <Text style={styles.manageProductsText}>Kelola Produk</Text>
              </TouchableOpacity>
            )}

             {myStore.status === 'pending' && (
              <View style={styles.pendingNotice}>
                <Ionicons name="time-outline" size={20} color="#ca8a04" />
                <Text style={styles.pendingNoticeText}>
                  {t('market.pendingNotice')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? '#059669' : '#047857'} />
      
      {/* Header with Tabs */}
      <LinearGradient
        colors={isDarkMode ? ['#059669', '#047857'] : ['#059669', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.headerTitle}>{t('market.title')}</Text>
              <DemoLabel />
            </View>
            <TouchableOpacity style={styles.cartButton}>
              <Ionicons name="cart-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'MARKETPLACE' && styles.activeTab]}
            onPress={() => setActiveTab('MARKETPLACE')}
          >
            <Text style={[styles.tabText, activeTab === 'MARKETPLACE' && styles.activeTabText]}>{t('market.tabs.marketplace')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'MY_STORE' && styles.activeTab]}
            onPress={() => setActiveTab('MY_STORE')}
          >
            <Text style={[styles.tabText, activeTab === 'MY_STORE' && styles.activeTabText]}>{t('market.tabs.myStore')}</Text>
          </TouchableOpacity>

          {isAdminRT && (
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'APPROVAL' && styles.activeTab]}
              onPress={() => setActiveTab('APPROVAL')}
            >
              <Text style={[styles.tabText, activeTab === 'APPROVAL' && styles.activeTabText]}>Approval</Text>
            </TouchableOpacity>
          )}
        </View>
        </SafeAreaView>
      </LinearGradient>

      {activeTab === 'MARKETPLACE' ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('market.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => fetchProducts(searchQuery)}
            />
          </View>

          {/* Categories */}
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
              {['ALL', 'FOOD', 'SERVICE'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, activeCategory === cat && styles.activeCategoryChip]}
                  onPress={() => setActiveCategory(cat as any)}
                >
                  <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>
                    {cat === 'ALL' ? t('market.categories.all') : cat === 'FOOD' ? t('market.categories.food') : t('market.categories.service')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Product List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContent}
              numColumns={2}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="store-search-outline" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>{t('market.noProducts')}</Text>
                </View>
              }
            />
          )}
        </>
      ) : activeTab === 'APPROVAL' ? (
        <View style={{ flex: 1 }}>
          {loading ? (
             <View style={styles.centerContainer}>
               <ActivityIndicator size="large" color={colors.primary} />
             </View>
          ) : (
            <FlatList
              data={pendingStores}
              renderItem={renderPendingStoreItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle-outline" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>Tidak ada toko yang perlu disetujui</Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        // My Store View
        <View style={{ flex: 1 }}>
          {renderMyStore()}
        </View>
      )}

      <ImagePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCamera={() => pickImage('camera')}
        onGallery={() => pickImage('gallery')}
      />
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#111827' : '#f8fafc',
  },
  header: {
    backgroundColor: isDarkMode ? '#059669' : '#047857',
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cartButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 4,
    borderRadius: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  activeTabText: {
    color: isDarkMode ? '#059669' : '#047857',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: isDarkMode ? '#374151' : '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activeCategoryChip: {
    backgroundColor: isDarkMode ? '#059669' : '#047857',
    borderColor: isDarkMode ? '#059669' : '#047857',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 0,
  },
  activeCategoryText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#374151' : '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'visible',
  },
  imageContainer: {
    height: 150,
    width: '100%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  grayscaleImage: {
    opacity: 0.5,
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: isDarkMode ? '#374151' : '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.textSecondary,
    opacity: 0.3,
  },
  placeholderIconContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 12,
    elevation: 2,
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardContent: {
    padding: 12,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    height: 40,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: isDarkMode ? '#34d399' : '#059669',
    marginBottom: 10,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#374151' : '#f1f5f9',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: colors.border,
  },
  sellerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    maxWidth: 80,
  },
  locationText: {
    fontSize: 10,
    color: colors.textSecondary,
    opacity: 0.8,
  },
  chatIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Store Form Styles
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  imagePicker: {
    height: 180,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyStateImage: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
  },
  createStoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  storeContainer: {
    flex: 1,
  },
  storeHeader: {
    paddingBottom: 20,
  },
  storeCover: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  storeInfoCard: {
    backgroundColor: colors.card,
    marginTop: -24,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storeNameTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusVerified: { 
    backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : '#dcfce7',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : 'transparent',
  },
  statusPending: { 
    backgroundColor: isDarkMode ? 'rgba(202, 138, 4, 0.2)' : '#fef9c3',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(202, 138, 4, 0.3)' : 'transparent',
  },
  statusRejected: { 
    backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(220, 38, 38, 0.3)' : 'transparent',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textVerified: { color: isDarkMode ? '#34d399' : '#166534' },
  textPending: { color: isDarkMode ? '#facc15' : '#854d0e' },
  textRejected: { color: isDarkMode ? '#f87171' : '#991b1b' },
  storeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  storeDetailsContainer: {
    marginBottom: 16,
    gap: 8,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeDetailText: {
    fontSize: 14,
    color: colors.text,
  },
  manageProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  manageProductsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingNotice: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(202, 138, 4, 0.1)' : '#fefce8',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(202, 138, 4, 0.3)' : '#fef08a',
    marginTop: 16,
  },
  pendingNoticeText: {
    fontSize: 13,
    color: isDarkMode ? '#facc15' : '#854d0e',
    flex: 1,
    lineHeight: 20,
  },
  // Form Category Buttons
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginHorizontal: 4,
  },
  activeCategoryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeCategoryButtonText: {
    color: '#fff',
  },
  // Empty List State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
