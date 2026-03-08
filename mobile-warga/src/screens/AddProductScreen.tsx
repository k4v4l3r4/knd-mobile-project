import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Image, 
  Alert, 
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { STORE_CATEGORIES } from '../constants/market';
import { Product } from './ProductDetailScreen';

const { width, height } = Dimensions.get('window');

interface EditingProduct extends Product {
  shopee_url?: string;
  tokopedia_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
}

interface AddProductScreenProps {
  onSuccess: () => void;
  editingProduct?: EditingProduct;
}

export default function AddProductScreen({ onSuccess, editingProduct }: AddProductScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState(''); // Discount in %
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(STORE_CATEGORIES[0].id);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [stock, setStock] = useState('');
  const [variantNote, setVariantNote] = useState('');
  const [shippingType, setShippingType] = useState<'PICKUP' | 'LOCAL' | 'COURIER'>('LOCAL');
  const [shippingFee, setShippingFee] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [isHalal, setIsHalal] = useState(false);
  const [hasBpom, setHasBpom] = useState(false);
  const [isHomemade, setIsHomemade] = useState(false);
  const [shopeeUrl, setShopeeUrl] = useState('');
  const [tokopediaUrl, setTokopediaUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  
  // Multiple photos state
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const compressImage = async (uri: string): Promise<string> => {
    try {
      // Resize to max width 1024px to reduce payload size
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.log('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  };
  
  React.useEffect(() => {
    if (editingProduct) {
      setName(String(editingProduct.name || ''));
      const priceValue = editingProduct.price ? String(Math.floor(Number(editingProduct.price))) : '';
      setPrice(priceValue);
      setDescription(String(editingProduct.description || ''));
      setCategory(String(editingProduct.category || STORE_CATEGORIES[0].id));
      const stockValue = editingProduct.stock != null ? String(editingProduct.stock) : '';
      setStock(stockValue);
      setVariantNote(String(editingProduct.variant_note || ''));
      setSpecifications(String(editingProduct.specifications || ''));
      const labels = Array.isArray(editingProduct.labels) ? editingProduct.labels : [];
      setIsHalal(labels.includes('HALAL'));
      setHasBpom(labels.includes('BPOM'));
      setIsHomemade(labels.includes('HOMEMADE'));
      const shipType = editingProduct.shipping_type || 'LOCAL';
      if (['PICKUP', 'LOCAL', 'COURIER'].includes(shipType)) {
        setShippingType(shipType as 'PICKUP' | 'LOCAL' | 'COURIER');
      } else {
        setShippingType('LOCAL');
      }
      const shipFee = editingProduct.shipping_fee_flat != null ? String(Math.floor(Number(editingProduct.shipping_fee_flat))) : '';
      setShippingFee(shipFee);
      setShopeeUrl(String(editingProduct.shopee_url || ''));
      setTokopediaUrl(String(editingProduct.tokopedia_url || ''));
      setFacebookUrl(String(editingProduct.facebook_url || ''));
      setInstagramUrl(String(editingProduct.instagram_url || ''));
      setTiktokUrl(String(editingProduct.tiktok_url || ''));
    }
  }, [editingProduct]);

  const pickImage = async (mode: 'camera' | 'gallery') => {
    if (photos.length >= 3) {
      Alert.alert(t('market.addProduct.maxPhotosTitle'), t('market.addProduct.maxPhotosMsg'));
      return;
    }

    try {
      let result;
      
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('market.addProduct.permissionDenied'), t('market.addProduct.cameraPermission'));
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.5,
          aspect: [4, 3],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('market.addProduct.permissionDenied'), t('market.addProduct.galleryPermission'));
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.5,
          aspect: [4, 3],
        });
      }

      if (!result.canceled) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setPhotos([...photos, compressedUri]);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert(t('market.addProduct.errorTitle'), t('market.addProduct.pickImageError'));
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const normalizeBulletInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (!trimmed.includes('\n') && trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .join('\n');
    }
    return trimmed;
  };

  const handleSubmit = async () => {
    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('market.addProduct.demoLimit'));
      return;
    }
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('market.addProduct.accessLimit'));
      return;
    }

    if (!name || !price || !description) {
      Alert.alert(t('market.addProduct.errorTitle'), t('market.addProduct.validationError'));
      return;
    }

    if (!editingProduct) {
      if (photos.length === 0) {
        Alert.alert(t('market.addProduct.errorTitle'), t('market.addProduct.photoError'));
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      
      const numericPrice = parseInt(price.replace(/[^0-9]/g, ''), 10);
      formData.append('price', numericPrice.toString());
      formData.append('category', category);

      if (stock) {
        const numericStock = parseInt(stock.replace(/[^0-9]/g, ''), 10) || 0;
        formData.append('stock', numericStock.toString());
      }

      formData.append('shipping_type', shippingType);

      if (shippingFee) {
        const fee = parseInt(shippingFee.replace(/[^0-9]/g, ''), 10) || 0;
        formData.append('shipping_fee_flat', fee.toString());
      }

      const normalizedVariant = normalizeBulletInput(variantNote);
      if (normalizedVariant) {
        formData.append('variant_note', normalizedVariant);
      }

      const normalizedSpecifications = normalizeBulletInput(specifications);
      if (normalizedSpecifications) {
        formData.append('specifications', normalizedSpecifications);
      }

      const labels: string[] = [];
      if (isHalal) labels.push('HALAL');
      if (hasBpom) labels.push('BPOM');
      if (isHomemade) labels.push('HOMEMADE');
      labels.forEach((label, idx) => {
        formData.append(`labels[${idx}]`, label);
      });
      
      // Calculate Discount Price if Discount % is provided
      if (discount) {
        const discountPercent = parseFloat(discount.replace(/[^0-9.]/g, ''));
        if (discountPercent > 0 && discountPercent <= 100) {
           const discountAmount = numericPrice * (discountPercent / 100);
           const finalPrice = numericPrice - discountAmount;
           formData.append('discount_price', Math.round(finalPrice).toString());
        }
      }

      formData.append('description', description);
      
      if (shopeeUrl) formData.append('shopee_url', shopeeUrl);
      if (tokopediaUrl) formData.append('tokopedia_url', tokopediaUrl);
      if (facebookUrl) formData.append('facebook_url', facebookUrl);
      if (instagramUrl) formData.append('instagram_url', instagramUrl);
      if (tiktokUrl) formData.append('tiktok_url', tiktokUrl);
      
      // Append Images
      if (photos.length > 0) {
        photos.forEach((photoUri, index) => {
          const filename = photoUri.split('/').pop() || `photo_${index}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append('images[]', {
            uri: photoUri,
            name: filename,
            type: type,
          } as any);
        });
      }

      if (editingProduct) {
        formData.append('_method', 'PUT');
        const response = await api.post(`/products/${editingProduct.id}`, formData, {
          transformRequest: (data, headers) => {
            // Remove Content-Type header to let browser set it with boundary
            if (headers && typeof headers.delete === 'function') {
              headers.delete('Content-Type');
            }
            return data;
          },
        });
        if (response.status === 200) {
          Alert.alert('Sukses', 'Produk berhasil diperbarui', [
            { text: t('common.ok'), onPress: onSuccess }
          ]);
        } else {
          throw new Error('Gagal memperbarui produk');
        }
      } else {
        const response = await api.post('/products', formData, {
          transformRequest: (data, headers) => {
            if (headers && typeof headers.delete === 'function') {
              headers.delete('Content-Type');
            }
            return data;
          },
        });
        if (response.status === 201) {
          Alert.alert(t('market.addProduct.successTitle'), t('market.addProduct.successMsg'), [
            { text: t('common.ok'), onPress: onSuccess }
          ]);
        } else {
          throw new Error('Gagal menambahkan produk');
        }
      }
    } catch (error: any) {
      console.log('Error adding product:', error);
      console.log('Error Detail:', error.response);
      
      let errorMessage = t('market.addProduct.errorMsg');
      
      // Handle Validation Errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
        } else if (typeof firstError === 'string') {
            errorMessage = firstError;
        } else {
            errorMessage = 'Terjadi kesalahan validasi data.';
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === 'Network Error') {
        errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet atau ukuran foto terlalu besar.';
      }
      
      Alert.alert(t('market.addProduct.errorTitle'), errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.headerBackground, { backgroundColor: isDarkMode ? '#059669' : '#047857' }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={styles.headerTitle}>{editingProduct ? 'Edit Produk' : t('market.addProduct.title')}</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.mainContent}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.card}>
              <Text style={styles.label}>{t('market.addProduct.photoLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                {photos.map((uri, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.removePhoto} 
                      onPress={() => removePhoto(index)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {photos.length < 3 && (
                  <TouchableOpacity 
                    style={styles.addPhotoBtn} 
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.addPhotoText}>{t('market.addProduct.addPhoto')}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            <View style={styles.card}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Kategori Produk</Text>
                
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setCategoryDropdownVisible(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {STORE_CATEGORIES.find(c => c.id === category)?.label || 'Pilih Kategori'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <Modal
                  visible={categoryDropdownVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setCategoryDropdownVisible(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setCategoryDropdownVisible(false)}
                  >
                    <View style={styles.dropdownModalContent}>
                      <Text style={styles.dropdownModalTitle}>Pilih Kategori Produk</Text>
                      <ScrollView style={{ maxHeight: height * 0.5 }}>
                        {STORE_CATEGORIES.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.dropdownItem,
                              category === cat.id && styles.activeDropdownItem
                            ]}
                            onPress={() => {
                              setCategory(cat.id);
                              setCategoryDropdownVisible(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              category === cat.id && styles.activeDropdownItemText
                            ]}>
                              {cat.label}
                            </Text>
                            {category === cat.id && (
                              <Ionicons name="checkmark" size={20} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('market.addProduct.nameLabel')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('market.addProduct.namePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.rowGroup}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>{t('market.addProduct.priceLabel')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('market.addProduct.pricePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={price}
                      onChangeText={setPrice}
                    />
                  </View>

                  <View style={[styles.formGroup, { width: 100 }]}>
                    <Text style={styles.label}>{t('market.addProduct.discountLabel')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={discount}
                      onChangeText={setDiscount}
                      maxLength={3}
                    />
                  </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Stok Tersedia</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 10"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={stock}
                  onChangeText={setStock}
                />
              </View>

              {/* Price Preview */}
              {price && discount ? (
                 <View style={styles.pricePreview}>
                    <Text style={styles.pricePreviewLabel}>{t('market.addProduct.finalPrice')}</Text>
                    <Text style={styles.pricePreviewValue}>
                        Rp {parseInt(price.replace(/[^0-9]/g, '') || '0') * (1 - (parseFloat(discount.replace(/[^0-9.]/g, '') || '0') / 100)) }
                    </Text>
                 </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('market.addProduct.descriptionLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('market.addProduct.descriptionPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Varian Produk (Opsional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={`Contoh:\nUkuran S/M/L\nRasa Original/Pedas\nWarna Merah/Biru`}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={variantNote}
                  onChangeText={setVariantNote}
                  textAlignVertical="top"
                />
                <Text style={styles.helperText}>Tulis satu poin per baris.</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Spesifikasi Teknis (Opsional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={`Contoh:\nBerat 1 kg\nUkuran 30x20 cm\nBahan katun`}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={specifications}
                  onChangeText={setSpecifications}
                  textAlignVertical="top"
                />
                <Text style={styles.helperText}>Tulis satu poin per baris.</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pengiriman</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Metode Pengiriman</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      shippingType === 'PICKUP' && styles.chipActive,
                    ]}
                    onPress={() => setShippingType('PICKUP')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        shippingType === 'PICKUP' && styles.chipTextActive,
                      ]}
                    >
                      Ambil di Tempat
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      shippingType === 'LOCAL' && styles.chipActive,
                    ]}
                    onPress={() => setShippingType('LOCAL')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        shippingType === 'LOCAL' && styles.chipTextActive,
                      ]}
                    >
                      Antar Sekitar RT/RW
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      shippingType === 'COURIER' && styles.chipActive,
                    ]}
                    onPress={() => setShippingType('COURIER')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        shippingType === 'COURIER' && styles.chipTextActive,
                      ]}
                    >
                      Ekspedisi
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ongkir Flat (Opsional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 5000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={shippingFee}
                  onChangeText={setShippingFee}
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Label dan Legalitas</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsHalal(!isHalal)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isHalal && styles.checkboxChecked]}>
                  {isHalal && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Produk Halal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setHasBpom(!hasBpom)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, hasBpom && styles.checkboxChecked]}>
                  {hasBpom && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Memiliki izin edar (PIRT/BPOM)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsHomemade(!isHomemade)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isHomemade && styles.checkboxChecked]}>
                  {isHomemade && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Homemade / Rumahan</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('market.addProduct.marketplaceLabel')}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Shopee URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://shopee.co.id/..."
                  placeholderTextColor={colors.textSecondary}
                  value={shopeeUrl}
                  onChangeText={setShopeeUrl}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tokopedia URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://tokopedia.com/..."
                  placeholderTextColor={colors.textSecondary}
                  value={tokopediaUrl}
                  onChangeText={setTokopediaUrl}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Facebook URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://facebook.com/..."
                  placeholderTextColor={colors.textSecondary}
                  value={facebookUrl}
                  onChangeText={setFacebookUrl}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Instagram URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://instagram.com/..."
                  placeholderTextColor={colors.textSecondary}
                  value={instagramUrl}
                  onChangeText={setInstagramUrl}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>TikTok URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://tiktok.com/@..."
                  placeholderTextColor={colors.textSecondary}
                  value={tiktokUrl}
                  onChangeText={setTiktokUrl}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.infoBox}>
               <Ionicons name="information-circle" size={24} color={colors.primary} />
               <Text style={styles.infoText}>
                 {t('market.addProduct.whatsappInfo')}
               </Text>
            </View>

            <TouchableOpacity 
              onPress={handleSubmit} 
              disabled={isSubmitting} 
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{editingProduct ? 'Simpan Perubahan' : t('market.addProduct.submit')}</Text>
              )}
            </TouchableOpacity>
            
            <View style={{ height: 40 }} />

          </ScrollView>
        </KeyboardAvoidingView>

        <ImagePickerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onCamera={() => pickImage('camera')}
          onGallery={() => pickImage('gallery')}
        />
      </SafeAreaView>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 1,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  photoList: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  photoItem: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  rowGroup: {
      flexDirection: 'row',
      marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    width: '100%',
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeDropdownItem: {
    backgroundColor: colors.primary + '10',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
  },
  activeDropdownItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  pricePreview: {
      backgroundColor: colors.primary + '10',
      padding: 12,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
  },
  pricePreviewLabel: {
      color: colors.textSecondary,
      fontWeight: '600',
  },
  pricePreviewValue: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 16,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: colors.inputBackground,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
