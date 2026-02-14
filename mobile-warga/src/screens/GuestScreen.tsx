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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import api, { getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';

interface Guest {
  id: number;
  guest_name: string;
  guest_nik: string;
  relation: string;
  start_date: string;
  duration_days: number;
  photo_url: string;
  status: 'REPORTED' | 'CHECKED';
}

export default function GuestScreen() {
  const { colors, isDarkMode, setTheme } = useTheme();
  const { t } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestNik, setGuestNik] = useState('');
  const [relation, setRelation] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchGuests();
    }
  }, [activeTab]);

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/guest-books');
      setGuests(response.data.data);
    } catch (error) {
      console.error('Error fetching guests:', error);
      Alert.alert(t('common.error'), t('guest.alert.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGuests();
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(t('guest.alert.permissionDenied'), t('guest.alert.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!guestName || !guestNik || !relation || !duration || !photo) {
      Alert.alert(t('common.validation'), t('guest.alert.completeData'));
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('guest_name', guestName);
      formData.append('guest_nik', guestNik);
      formData.append('relation', relation);
      formData.append('duration_days', duration);
      formData.append('start_date', startDate.toISOString().split('T')[0]);

      const filename = photo.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri: photo,
        name: filename || 'guest_photo.jpg',
        type
      } as any);

      await api.post('/guest-books', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(t('common.success'), t('guest.alert.success'), [
        { text: t('common.ok'), onPress: () => {
          resetForm();
          setActiveTab('history');
        }}
      ]);
    } catch (error: any) {
      console.error('Submit Error:', error);
      Alert.alert(t('common.failed'), error.response?.data?.message || t('guest.alert.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setGuestName('');
    setGuestNik('');
    setRelation('');
    setDuration('');
    setStartDate(new Date());
    setPhoto(null);
  };

  const renderHistoryItem = ({ item }: { item: Guest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.guest_name}</Text>
        <View style={[
          styles.statusBadge, 
          item.status === 'CHECKED' ? styles.bgGreen : styles.bgRed
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'CHECKED' ? styles.textGreen : styles.textRed
          ]}>
            {item.status === 'CHECKED' ? t('guest.status.checked') : t('guest.status.reported')}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Image 
          source={{ uri: getStorageUrl(item.photo_url) || 'https://placehold.co/100x100' }} 
          style={styles.guestImage} 
        />
        <View style={styles.cardInfo}>
          <Text style={styles.infoText}>NIK: {item.guest_nik || '-'}</Text>
          <Text style={styles.infoText}>{t('guest.form.relation')}: {item.relation}</Text>
          <Text style={styles.infoText}>{t('guest.form.startDate')}: {item.start_date}</Text>
          <Text style={styles.infoText}>{t('guest.form.duration')}: {item.duration_days} Hari</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
            <TouchableOpacity 
              onPress={() => setTheme(isDarkMode ? 'light' : 'dark')} 
              style={styles.themeButton}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isDarkMode ? 'sunny' : 'moon'} 
                size={20} 
                color={'#fff'} 
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            { marginRight: 8 },
            activeTab === 'form' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('form')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'form' && { color: '#fff' }]}>{t('guest.tabs.form')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab,
            activeTab === 'history' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'history' && { color: '#fff' }]}>{t('guest.tabs.history')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'form' ? (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.formContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('guest.form.name')}</Text>
              <TextInput
                style={styles.input}
                value={guestName}
                onChangeText={setGuestName}
                placeholder={t('guest.form.namePlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('guest.form.nik')}</Text>
              <TextInput
                style={styles.input}
                value={guestNik}
                onChangeText={setGuestNik}
                keyboardType="numeric"
                placeholder={t('guest.form.nikPlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('guest.form.relation')}</Text>
              <TextInput
                style={styles.input}
                value={relation}
                onChangeText={setRelation}
                placeholder={t('guest.form.relationPlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>{t('guest.form.startDate')}</Text>
                <TouchableOpacity 
                  style={[styles.dateInput, { borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={{color: colors.text}}>{startDate.toLocaleDateString()}</Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event: any, date?: Date) => {
                      setShowDatePicker(false);
                      if (date) setStartDate(date);
                    }}
                  />
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>{t('guest.form.duration')}</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  placeholder={t('guest.form.durationPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('guest.form.photo')}</Text>
              <TouchableOpacity 
                style={[styles.photoButton, { padding: 0 }]} 
                onPress={pickImage}
                activeOpacity={0.7}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.previewImage} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={32} color={colors.textSecondary} />
                    <Text style={styles.photoText}>{t('guest.form.takePhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[
                styles.submitButton, 
                submitting && styles.disabledButton
              ]}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('guest.form.submit')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={guests}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('guest.history.empty')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    // backdropFilter: 'blur(10px)',
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 6,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: colors.primary, // Lime-500 or Theme Primary
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  formContent: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  photoButton: {
    height: 180,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
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
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  bgGreen: { backgroundColor: isDarkMode ? '#064e3b' : colors.primary + '20' },
  bgRed: { backgroundColor: isDarkMode ? '#450a0a' : '#fee2e2' }, // Keep red for error/warning/unchecked
  textGreen: { color: isDarkMode ? '#059669' : colors.primary, fontSize: 10, fontWeight: 'bold' },
  textRed: { color: isDarkMode ? '#fca5a5' : '#991b1b', fontSize: 10, fontWeight: 'bold' },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
  },
  guestImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 16,
  },
});
