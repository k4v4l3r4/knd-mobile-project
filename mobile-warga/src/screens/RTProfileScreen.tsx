import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { BackButton } from '../components/BackButton';
import { settingService } from '../services/setting';
import { getStorageUrl } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

interface RTProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export default function RTProfileScreen({ onNavigate }: RTProfileScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    rt_name: '',
    address: '',
    province: '',
    city: '',
    district: '',
    subdistrict: '',
    postal_code: '',
    logo_url: null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await settingService.getProfile();
      if (response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Gagal memuat profil RT');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      Object.keys(profile).forEach(key => {
        if (profile[key] !== null && key !== 'logo_url' && key !== 'structure_image_url') {
          formData.append(key, profile[key]);
        }
      });

      await settingService.updateProfile(formData);
      Alert.alert('Sukses', 'Profil RT berhasil diperbarui');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Gagal memperbarui profil RT');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async (field: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append(field, { uri, name: filename, type } as any);
      
      try {
        setSaving(true);
        await settingService.updateProfile(formData);
        fetchProfile();
      } catch (error) {
        Alert.alert('Error', 'Gagal mengunggah gambar');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => onNavigate('SYSTEM_SETTINGS')} />
        <Text style={styles.headerTitle}>{t('home.menus.rtProfile')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveText}>Simpan</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.logoContainer} onPress={() => pickImage('logo')}>
            {profile.logo_url ? (
              <Image source={{ uri: getStorageUrl(profile.logo_url) || undefined }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={30} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageLabel}>Logo Wilayah RT</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama RT</Text>
            <TextInput
              style={styles.input}
              value={profile.rt_name}
              onChangeText={(text) => setProfile({ ...profile, rt_name: text })}
              placeholder="Contoh: RT 001 / RW 002"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alamat Lengkap</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.address}
              onChangeText={(text) => setProfile({ ...profile, address: text })}
              multiline
              numberOfLines={3}
              placeholder="Alamat wilayah RT..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Provinsi</Text>
              <TextInput
                style={styles.input}
                value={profile.province}
                onChangeText={(text) => setProfile({ ...profile, province: text })}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Kota/Kabupaten</Text>
              <TextInput
                style={styles.input}
                value={profile.city}
                onChangeText={(text) => setProfile({ ...profile, city: text })}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Kecamatan</Text>
              <TextInput
                style={styles.input}
                value={profile.district}
                onChangeText={(text) => setProfile({ ...profile, district: text })}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Kelurahan</Text>
              <TextInput
                style={styles.input}
                value={profile.subdistrict}
                onChangeText={(text) => setProfile({ ...profile, subdistrict: text })}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kode Pos</Text>
            <TextInput
              style={styles.input}
              value={profile.postal_code}
              onChangeText={(text) => setProfile({ ...profile, postal_code: text })}
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  saveText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  imageLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  input: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
});
