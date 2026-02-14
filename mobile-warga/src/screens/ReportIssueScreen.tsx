import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { ImagePickerModal } from '../components/ImagePickerModal';
import api from '../services/api';

const ReportIssueScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { isExpired, isDemo } = useTenant();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
          aspect: [4, 3],
          quality: 0.5,
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
          aspect: [4, 3],
          quality: 0.5,
        });
      }

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.imagePicker.error'));
    }
  };

  const showImagePickerOptions = () => {
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpired'));
      return;
    }

    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('report.demoMode'));
      return;
    }

    if (!title || !description || !location) {
      Alert.alert(t('common.error'), t('report.validationError'));
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      formData.append('title', title);
      formData.append('description', description);
      formData.append('location', location);
      formData.append('status', 'pending');
      
      if (image) {
        const filename = image.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        // @ts-ignore
        formData.append('image', {
          uri: image,
          name: filename || 'report.jpg',
          type,
        });
      }

      await api.post('/reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(
        t('report.successTitle'),
        t('report.successMsg'),
        [{ text: t('common.ok') }]
      );
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || t('report.failedMsg') || 'Gagal mengirim laporan. Silakan coba lagi.';
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>{t('report.title')}</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('report.title')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('report.subtitle')}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('report.form.title')} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder={t('report.form.titlePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('report.form.location')} <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder={t('report.form.locationPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('report.form.description')} <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.textArea}
                placeholder={t('report.form.descriptionPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('report.form.photo')}</Text>
              <TouchableOpacity 
                style={[styles.imageUpload, { padding: 0 }]} 
                onPress={showImagePickerOptions}
                activeOpacity={0.7}
              >
                {image ? (
                  <Image source={{ uri: image }} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.uploadText}>
                      {t('report.form.photoPlaceholder')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {image && (
                <TouchableOpacity 
                  style={[styles.removeImageButton, { backgroundColor: 'transparent', padding: 4 }]}
                  onPress={() => setImage(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeImageText}>{t('report.form.removePhoto')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.submitButton, 
                styles.gradientButton,
                { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }
              ]}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>{t('report.submit')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <ImagePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCamera={() => pickImage('camera')}
        onGallery={() => pickImage('gallery')}
      />
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: -24,
    zIndex: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 24,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderColor: colors.border,
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 120,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderColor: colors.border,
    color: colors.text,
  },
  imageUpload: {
    height: 200,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderColor: colors.border,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  removeImageText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ReportIssueScreen;
