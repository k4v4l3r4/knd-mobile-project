import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  ScrollView, Image, Alert, ActivityIndicator, FlatList, 
  Platform, KeyboardAvoidingView, RefreshControl, TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { useLanguage } from '../context/LanguageContext';
import { ImagePickerModal } from '../components/ImagePickerModal';

interface Guest {
  id: number;
  guest_name: string;
  guest_phone: string;
  origin: string;
  purpose: string;
  visit_date: string;
  id_card_photo: string;
  status: 'CHECK_IN' | 'CHECK_OUT';
  created_at: string;
}

export default function GuestReportScreen() {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const { t, language } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    origin: '',
    purpose: '',
    visit_date: new Date().toISOString(),
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchGuests();
    }
  }, [activeTab]);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/guest-books');
      setGuests(response.data.data);
    } catch (error: any) {
      console.log('Error fetching guests:', error);
      if (error.response?.status === 401) {
         Alert.alert(t('common.sessionExpired'), t('common.sessionExpiredMsg'));
      } else {
         Alert.alert(t('common.error'), t('guest.alert.loadFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGuests();
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
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.failed'));
    }
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

    if (!formData.guest_name || !formData.purpose) {
      Alert.alert(t('common.error'), t('guest.alert.validation'));
      return;
    }

    try {
      setSubmitting(true);
      
      const data = new FormData();
      data.append('guest_name', formData.guest_name);
      data.append('guest_phone', formData.guest_phone);
      data.append('origin', formData.origin);
      data.append('purpose', formData.purpose);
      data.append('visit_date', formData.visit_date); // Send ISO string directly

      if (photo) {
        const filename = photo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        // @ts-ignore
        data.append('id_card_photo', { uri: photo, name: filename, type });
      }

      await api.post('/guest-books', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(t('common.success'), t('guest.alert.success'), [
        { text: 'OK', onPress: () => {
          setFormData({
            guest_name: '',
            guest_phone: '',
            origin: '',
            purpose: '',
            visit_date: new Date().toISOString(),
          });
          setPhoto(null);
          setActiveTab('history');
        }}
      ]);
    } catch (error: any) {
      console.error('Error submitting guest:', error);
      Alert.alert(t('common.error'), error.response?.data?.message || t('guest.alert.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: Guest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.guest_name}</Text>
        <View style={[
          styles.statusBadge, 
          item.status === 'CHECK_IN' ? styles.bgGreen : styles.bgGray
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'CHECK_IN' ? styles.textGreen : styles.textGray
          ]}>
            {item.status === 'CHECK_IN' ? t('guest.history.status.checkIn') : t('guest.history.status.checkOut')}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        {item.id_card_photo ? (
          <Image 
            source={{ uri: getStorageUrl(item.id_card_photo) || '' }} 
            style={styles.guestImage} 
          />
        ) : (
          <View style={[styles.guestImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person" size={24} color={colors.textSecondary} />
          </View>
        )}
        
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText}>{item.origin || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={2}>{item.purpose}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText}>{new Date(item.visit_date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Premium Header */}
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
                <Text style={styles.headerTitle}>{t('guest.title')}</Text>
                <DemoLabel />
              </View>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
      </View>

      {/* Floating Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity 
            style={[styles.tab, { marginRight: 8 }, activeTab === 'form' && { backgroundColor: '#059669' }]}
            onPress={() => setActiveTab('form')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'form' && { color: '#fff' }]}>{t('guest.tabs.form')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && { backgroundColor: '#059669' }]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'history' && { color: '#fff' }]}>{t('guest.tabs.history')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {activeTab === 'form' ? (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                   <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="account-group-outline" size={24} color={colors.primary} />
                   </View>
                   <View>
                      <Text style={styles.sectionTitle}>{t('guest.form.title')}</Text>
                      <Text style={styles.sectionSubtitle}>{t('guest.form.subtitle')}</Text>
                   </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('guest.form.name')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.guest_name}
                    onChangeText={t => setFormData({...formData, guest_name: t})}
                    placeholder={t('guest.form.namePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('guest.form.phone')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.guest_phone}
                    onChangeText={t => setFormData({...formData, guest_phone: t})}
                    keyboardType="phone-pad"
                    placeholder="08..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('guest.form.origin')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.origin}
                    onChangeText={t => setFormData({...formData, origin: t})}
                    placeholder={t('guest.form.originPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('guest.form.purpose')}</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    value={formData.purpose}
                    onChangeText={t => setFormData({...formData, purpose: t})}
                    placeholder={t('guest.form.purposePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('guest.form.photo')}</Text>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.previewImage} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <View style={styles.cameraIconCircle}>
                           <Ionicons name="camera" size={28} color={colors.primary} />
                        </View>
                        <Text style={styles.photoText}>{t('guest.form.photoPlaceholder')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[
                    styles.submitButton, 
                    submitting && { opacity: 0.7, backgroundColor: colors.border },
                    { backgroundColor: colors.primary, marginTop: 12, borderRadius: 16 }
                  ]}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>{t('guest.form.submit')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <FlatList
            data={guests}
            renderItem={renderHistoryItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="account-off-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>{t('guest.history.empty')}</Text>
              </View>
            }
          />
        )}
      </View>

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
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginTop: -25, // Overlap header
    zIndex: 20,
    marginBottom: 10,
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.text,
  },
  photoButton: {
    height: 180,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  cameraIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  submitButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 12,
  },
  submitButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bgGreen: { backgroundColor: colors.primary + '20' },
  bgGray: { backgroundColor: colors.border },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  textGreen: { color: colors.primary },
  textGray: { color: colors.textSecondary },
  cardBody: {
    flexDirection: 'row',
    gap: 16,
  },
  guestImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
