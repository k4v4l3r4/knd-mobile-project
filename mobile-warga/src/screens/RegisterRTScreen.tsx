import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RegisterRTScreenProps {
  onSuccess: () => void;
}

export default function RegisterRTScreen({ onSuccess }: RegisterRTScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    province: '',
    city: '',
    district: '',
    subdistrict: '',
    postalCode: '',
    password: '',
    confirmPassword: '',
    rtNumber: '',
    rwNumber: '',
    rtName: ''
  });

  const [provinces, setProvinces] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [villages, setVillages] = useState<Record<string, string>>({});

  const [regionCodes, setRegionCodes] = useState({
    province: '',
    city: '',
    district: '',
    subdistrict: '',
  });

  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [regionModalType, setRegionModalType] = useState<'province' | 'city' | 'district' | 'subdistrict' | null>(null);
  const [regionSearch, setRegionSearch] = useState('');

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await api.get('/regions/provinces');
        if (response.data.success) {
          setProvinces(response.data.data);
        }
      } catch (error) {
        console.log('Gagal memuat provinsi:', error);
      }
    };

    fetchProvinces();
  }, []);

  const fetchCities = async (provinceCode: string) => {
    try {
      if (!provinceCode) return;
      const response = await api.get(`/regions/cities/${provinceCode}`);
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (error) {
      console.log('Gagal memuat kota/kabupaten:', error);
    }
  };

  const fetchDistricts = async (cityCode: string) => {
    try {
      if (!cityCode) return;
      const response = await api.get(`/regions/districts/${cityCode}`);
      if (response.data.success) {
        setDistricts(response.data.data);
      }
    } catch (error) {
      console.log('Gagal memuat kecamatan:', error);
    }
  };

  const fetchVillages = async (districtCode: string) => {
    try {
      if (!districtCode) return;
      const response = await api.get(`/regions/villages/${districtCode}`);
      if (response.data.success) {
        setVillages(response.data.data);
      }
    } catch (error) {
      console.log('Gagal memuat kelurahan:', error);
    }
  };

  const openRegionModal = (type: 'province' | 'city' | 'district' | 'subdistrict') => {
    if (type === 'city' && !regionCodes.province) {
      Alert.alert('Info', 'Silakan pilih provinsi terlebih dahulu');
      return;
    }
    if (type === 'district' && !regionCodes.city) {
      Alert.alert('Info', 'Silakan pilih kota/kabupaten terlebih dahulu');
      return;
    }
    if (type === 'subdistrict' && !regionCodes.district) {
      Alert.alert('Info', 'Silakan pilih kecamatan terlebih dahulu');
      return;
    }
    setRegionModalType(type);
    setRegionSearch('');
    setRegionModalVisible(true);
  };

  const handleRegionSelect = (code: string) => {
    if (!regionModalType) return;

    if (regionModalType === 'province') {
      const name = provinces[code] || '';
      setFormData(prev => ({
        ...prev,
        province: name,
        city: '',
        district: '',
        subdistrict: '',
      }));
      setRegionCodes({
        province: code,
        city: '',
        district: '',
        subdistrict: '',
      });
      setCities({});
      setDistricts({});
      setVillages({});
      fetchCities(code);
    } else if (regionModalType === 'city') {
      const name = cities[code] || '';
      setFormData(prev => ({
        ...prev,
        city: name,
        district: '',
        subdistrict: '',
      }));
      setRegionCodes(prev => ({
        ...prev,
        city: code,
        district: '',
        subdistrict: '',
      }));
      setDistricts({});
      setVillages({});
      fetchDistricts(code);
    } else if (regionModalType === 'district') {
      const name = districts[code] || '';
      setFormData(prev => ({
        ...prev,
        district: name,
        subdistrict: '',
      }));
      setRegionCodes(prev => ({
        ...prev,
        district: code,
        subdistrict: '',
      }));
      setVillages({});
      fetchVillages(code);
    } else if (regionModalType === 'subdistrict') {
      const name = villages[code] || '';
      setFormData(prev => ({
        ...prev,
        subdistrict: name,
      }));
      setRegionCodes(prev => ({
        ...prev,
        subdistrict: code,
      }));
    }

    setRegionModalVisible(false);
  };

  const getRegionOptions = () => {
    let data: Record<string, string> = {};
    if (regionModalType === 'province') data = provinces;
    if (regionModalType === 'city') data = cities;
    if (regionModalType === 'district') data = districts;
    if (regionModalType === 'subdistrict') data = villages;

    const entries = Object.entries(data);
    if (!regionSearch.trim()) return entries;

    const keyword = regionSearch.toLowerCase();
    return entries.filter(([, name]) => name.toLowerCase().includes(keyword));
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.phone || !formData.email || !formData.password || !formData.rtNumber || !formData.rwNumber || !formData.address || !formData.province || !formData.city || !formData.district || !formData.subdistrict || !formData.postalCode) {
      Alert.alert('Error', 'Mohon lengkapi semua data wajib (Nama, HP, Email, Password, No RT/RW, Alamat & Wilayah)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/register', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        province: formData.province,
        city: formData.city,
        district: formData.district,
        subdistrict: formData.subdistrict,
        postal_code: formData.postalCode,
        password: formData.password,
        rt_number: formData.rtNumber,
        rw_number: formData.rwNumber,
        rt_name: formData.rtName || undefined,
        level: 'RT'
      });

      if (response.data.success || response.status === 201) {
        const { token, user } = response.data.data;
        await AsyncStorage.multiSet([
          ['user_token', token],
          ['user_data', JSON.stringify(user)]
        ]);
        Alert.alert('Sukses', 'Registrasi RT berhasil!');
        onSuccess();
      } else {
        Alert.alert('Gagal', response.data.message || 'Registrasi gagal');
      }
    } catch (error: any) {
      console.log('Register RT Error:', error);
      const message = error.response?.data?.message || error.message || 'Terjadi kesalahan';
      Alert.alert('Gagal', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingBottom: 24,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          marginBottom: 20,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        }}
      >
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>Daftar RT Baru</Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Data Pengurus RT</Text>
            <Text style={[styles.requiredNote, { color: colors.textSecondary }]}>
              <Text style={{ color: '#ef4444' }}>*</Text> Wajib diisi
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nama Lengkap <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nomor HP (WhatsApp) <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: 08123456789"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email Resmi RT <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="contoh: adminrt@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Password <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Minimal 6 karakter"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({...formData, password: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Konfirmasi Password <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Ulangi password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Data Wilayah</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nomor RT <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: 005"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={formData.rtNumber}
                onChangeText={(text) => setFormData({...formData, rtNumber: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nomor RW <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: 001"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={formData.rwNumber}
                onChangeText={(text) => setFormData({...formData, rwNumber: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nama RT (Opsional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: RT 005 Melati"
                placeholderTextColor={colors.textSecondary}
                value={formData.rtName}
                onChangeText={(text) => setFormData({...formData, rtName: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Alamat Lengkap <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Alamat sekretariat / wilayah RT"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Provinsi <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                  onPress={() => openRegionModal('province')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: formData.province ? colors.text : colors.textSecondary,
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {formData.province || 'Pilih Provinsi'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Kota/Kabupaten <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                  onPress={() => openRegionModal('city')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: formData.city ? colors.text : colors.textSecondary,
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {formData.city || 'Pilih Kota/Kabupaten'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Kecamatan <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                  onPress={() => openRegionModal('district')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: formData.district ? colors.text : colors.textSecondary,
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {formData.district || 'Pilih Kecamatan'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Kelurahan <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                  onPress={() => openRegionModal('subdistrict')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: formData.subdistrict ? colors.text : colors.textSecondary,
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {formData.subdistrict || 'Pilih Kelurahan'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Kode Pos <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="contoh: 12820"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Daftar Sekarang</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={regionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <View style={styles.regionModalOverlay}>
          <View style={[styles.regionModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.regionModalHeader}>
              <Text style={[styles.regionModalTitle, { color: colors.text }]}>
                {regionModalType === 'province' && 'Pilih Provinsi'}
                {regionModalType === 'city' && 'Pilih Kota/Kabupaten'}
                {regionModalType === 'district' && 'Pilih Kecamatan'}
                {regionModalType === 'subdistrict' && 'Pilih Kelurahan'}
              </Text>
              <TouchableOpacity onPress={() => setRegionModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  styles.regionSearchInput,
                  { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9', borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Cari nama wilayah..."
                placeholderTextColor={colors.textSecondary}
                value={regionSearch}
                onChangeText={setRegionSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {getRegionOptions().map(([code, name]) => (
                <TouchableOpacity
                  key={code}
                  style={styles.regionOptionItem}
                  onPress={() => handleRegionSelect(code)}
                >
                  <Text style={{ color: colors.text }}>{name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  requiredNote: {
    fontSize: 12,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  regionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  regionModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  regionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  regionModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  regionSearchInput: {
    height: 44,
    borderRadius: 12,
    fontSize: 14,
  },
  regionOptionItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
