import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import api, { getStorageUrl } from '../services/api';

const ProfileScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [user, setUser] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: null as string | null,
    role: '',
    rt_id: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/profile');
      const userData = response.data.data;
      setUser({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        avatar: userData.avatar || null,
        role: userData.role || '',
        rt_id: userData.rt_id || '',
      });
      // Update cached user data
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert(t('common.error'), t('profile.fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('profile.demoFeature'));
      return;
    }
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('profile.accessLimitAvatar'));
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(t('profile.permissionDenied'), t('profile.galleryPermission'));
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      handleUploadAvatar(result.assets[0].uri);
    }
  };

  const handleUploadAvatar = async (uri: string) => {
    setIsUploading(true);
    
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore
    formData.append('avatar', { uri, name: filename || 'avatar.jpg', type });

    try {
      const response = await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(prev => ({ ...prev, avatar: response.data.avatar_url }));
      Alert.alert(t('profile.successTitle'), t('profile.avatarSuccess'));
      
      // Update cached data if needed
      const cachedData = await AsyncStorage.getItem('user_data');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        parsedData.avatar = response.data.avatar_url;
        await AsyncStorage.setItem('user_data', JSON.stringify(parsedData));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert(t('common.error'), t('profile.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (isDemo) {
      Alert.alert(t('common.demoMode'), t('profile.demoEdit'));
      return;
    }
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('profile.accessLimit'));
      return;
    }

    if (!user.name || !user.phone) {
      Alert.alert(t('common.validation'), t('profile.validationError'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put('/profile', {
        name: user.name,
        phone: user.phone,
      });

      Alert.alert(t('profile.successTitle'), t('profile.successMsg'));
      
      // Update cached data
      await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data));
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const message = error.response?.data?.message || t('profile.updateFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
          <DemoLabel />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            onPress={handlePickImage} 
            disabled={isUploading}
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            {user.avatar ? (
              <Image source={{ uri: getStorageUrl(user.avatar) || undefined }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View
              style={[styles.cameraIconContainer, { backgroundColor: colors.primary }]}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.changePhotoText, { color: colors.primary }]}>
            {t('profile.changePhoto')}
          </Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.fullName')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                color: colors.text,
                borderColor: isDarkMode ? '#334155' : '#e2e8f0'
              }]}
              value={user.name}
              onChangeText={(text) => setUser({ ...user, name: text })}
              placeholder={t('profile.fullName')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.email')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                color: colors.textSecondary,
                borderColor: isDarkMode ? '#334155' : '#e2e8f0'
              }]}
              value={user.email}
              editable={false}
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              {t('profile.emailHelper')}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.phone')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                color: colors.text,
                borderColor: isDarkMode ? '#334155' : '#e2e8f0'
              }]}
              value={user.phone}
              onChangeText={(text) => setUser({ ...user, phone: text })}
              placeholder="08xxxxxxxxxx"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.role')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                color: colors.textSecondary,
                borderColor: isDarkMode ? '#334155' : '#e2e8f0'
              }]}
              value={user.role}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
            ]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  footer: {
    marginTop: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;
