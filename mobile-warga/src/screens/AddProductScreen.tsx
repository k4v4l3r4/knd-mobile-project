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
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { ImagePickerModal } from '../components/ImagePickerModal';

interface AddProductScreenProps {
  onSuccess: () => void;
}

export default function AddProductScreen({ onSuccess }: AddProductScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState(''); // Discount in %
  const [description, setDescription] = useState('');
  const [shopeeUrl, setShopeeUrl] = useState('');
  const [tokopediaUrl, setTokopediaUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  
  // Multiple photos state
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
        setPhotos([...photos, result.assets[0].uri]);
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

    if (photos.length === 0) {
       Alert.alert(t('market.addProduct.errorTitle'), t('market.addProduct.photoError'));
       return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      
      const numericPrice = parseInt(price.replace(/[^0-9]/g, ''), 10);
      formData.append('price', numericPrice.toString());
      
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
      photos.forEach((photoUri, index) => {
        const filename = photoUri.split('/').pop() || `photo_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // @ts-ignore
        formData.append('images[]', {
          uri: photoUri,
          name: filename,
          type: type,
        });
      });

      const response = await api.post('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        Alert.alert(t('market.addProduct.successTitle'), t('market.addProduct.successMsg'), [
          { text: t('common.ok'), onPress: onSuccess }
        ]);
      } else {
        throw new Error('Gagal menambahkan produk');
      }
    } catch (error: any) {
      console.log('Error adding product:', error);
      Alert.alert(t('market.addProduct.errorTitle'), t('market.addProduct.errorMsg') + ". " + (error.response?.data?.message || error.message));
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
              <Text style={styles.headerTitle}>{t('market.addProduct.title')}</Text>
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
                <Text style={styles.submitButtonText}>{t('market.addProduct.submit')}</Text>
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
