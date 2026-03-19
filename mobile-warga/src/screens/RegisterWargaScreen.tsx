import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatPhoneNumber } from '../utils/phoneUtils';

interface RegisterWargaScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function RegisterWargaScreen({ onSuccess, onBack }: RegisterWargaScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMaritalStatusModal, setShowMaritalStatusModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    rt: '',
    rw: '',
    maritalStatus: 'Belum Kawin'
  });

  const maritalStatusOptions = [
    'Belum Kawin',
    'Kawin',
    'Cerai Hidup',
    'Cerai Mati'
  ];

  const handleRegister = async () => {
    // Validasi data wajib termasuk RT dan RW
    if (!formData.name || !formData.phone || !formData.email || !formData.password || !formData.inviteCode || !formData.rt || !formData.rw) {
      Alert.alert('Error', 'Mohon lengkapi semua data wajib (Nama, HP, Email, Password, Kode Undangan, RT, RW)');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Format email tidak valid');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.registerWarga({
        name: formData.name,
        phone: formatPhoneNumber(formData.phone),
        email: formData.email,
        password: formData.password,
        invite_code: formData.inviteCode,
        address_rt: formData.rt,
        address_rw: formData.rw,
        marital_status: formData.maritalStatus
      });

      if (response.success) {
        const { token, user } = response.data;
        await AsyncStorage.multiSet([
          ['user_token', token],
          ['user_data', JSON.stringify(user)]
        ]);
        Alert.alert('Sukses', 'Registrasi Warga berhasil!');
        onSuccess();
      } else {
        Alert.alert('Gagal', response.message || 'Registrasi gagal');
      }
    } catch (error: any) {
      console.log('Register Warga Error:', error);
      let message = error.message || 'Terjadi kesalahan';
      if (error.errors) {
        const firstKey = Object.keys(error.errors)[0];
        if (firstKey && error.errors[firstKey][0]) {
            message = error.errors[firstKey][0];
        }
      }
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
            <TouchableOpacity 
              onPress={onBack}
              style={{ position: 'absolute', left: 0, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>Daftar Akun (WARGA)</Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formSection}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Form ini khusus untuk warga yang BELUM terdaftar di data warga RT. Jika nama Anda sudah ada di data warga, silakan gunakan menu "Login" atau fitur "Lupa Password" di halaman login, bukan daftar ulang.
            </Text>
            <Text style={[styles.requiredHint, { color: colors.textSecondary }]}>
              Kolom bertanda
              <Text style={{ color: '#ef4444' }}> *</Text>
              {' '}wajib diisi.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Kode Undangan RT
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialIcons name="vpn-key" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.inputField, { color: colors.text, fontWeight: 'bold', letterSpacing: 2 }]}
                  placeholder="XXXXXX"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  value={formData.inviteCode}
                  onChangeText={(text) => setFormData({...formData, inviteCode: text.toUpperCase()})}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  RT
                  <Text style={{ color: '#ef4444' }}> *</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MaterialIcons name="home" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="001"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={formData.rt}
                    onChangeText={(text) => setFormData({...formData, rt: text.replace(/\D/g, '')})}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  RW
                  <Text style={{ color: '#ef4444' }}> *</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MaterialIcons name="home" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="001"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={formData.rw}
                    onChangeText={(text) => setFormData({...formData, rw: text.replace(/\D/g, '')})}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nama Lengkap
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.inputField, { color: colors.text }]}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nomor HP (WhatsApp)
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="smartphone" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.inputField, { color: colors.text }]}
                  placeholder="Contoh: 628123456789"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={15}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Status Pernikahan
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowMaritalStatusModal(true)}
                style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}
              >
                <MaterialIcons name="wc" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <Text style={[styles.inputField, { color: colors.text, flex: 1, paddingVertical: 12 }]}>
                  {formData.maritalStatus}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialIcons name="email" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.inputField, { color: colors.text }]}
                  placeholder="contoh: nama@email.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text.trim()})}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Password
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.inputField, { color: colors.text }]}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Konfirmasi Password
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.inputField, { color: colors.text }]}
                  placeholder="Ulangi password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Terms & Conditions Checkbox */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity 
              onPress={() => setTermsAccepted(!termsAccepted)}
              style={{ marginRight: 10, marginTop: 2 }}
            >
              <Ionicons 
                name={termsAccepted ? "checkbox" : "square-outline"} 
                size={24} 
                color={termsAccepted ? colors.primary : colors.textSecondary} 
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                Saya menyatakan data yang diisi adalah benar dan menyetujui{' '}
                <Text 
                  style={{ color: colors.primary, fontWeight: 'bold' }}
                  onPress={() => setShowTermsModal(true)}
                >
                  Aturan & Ketentuan
                </Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading || !termsAccepted}
            style={[
              styles.submitButton, 
              { backgroundColor: loading || !termsAccepted ? '#ccc' : colors.primary }
            ]}
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

      {/* Marital Status Modal */}
      <Modal
        visible={showMaritalStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMaritalStatusModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setShowMaritalStatusModal(false)}
        >
          <View style={{ width: '80%', backgroundColor: colors.card, borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
              Pilih Status Pernikahan
            </Text>
            {maritalStatusOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={() => {
                  setFormData({ ...formData, maritalStatus: option });
                  setShowMaritalStatusModal(false);
                }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 25, maxHeight: '80%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 15, textAlign: 'center' }}>
              Aturan & Ketentuan
            </Text>
            
            <ScrollView style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, marginRight: 8 }}>1.</Text>
                <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 22 }}>
                  Data yang diisi adalah benar dan sesuai dengan KTP/KK yang berlaku.
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, marginRight: 8 }}>2.</Text>
                <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 22 }}>
                  Warga memberikan izin pengelolaan data untuk keperluan administrasi RT dan kegiatan lingkungan.
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, marginRight: 8 }}>3.</Text>
                <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 22 }}>
                  Kerahasiaan akun (username dan password) adalah tanggung jawab penuh masing-masing warga.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setShowTermsModal(false);
                setTermsAccepted(true);
              }}
              style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Saya Setuju</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowTermsModal(false)}
              style={{ marginTop: 15, alignItems: 'center' }}
            >
              <Text style={{ color: colors.textSecondary }}>Tutup</Text>
            </TouchableOpacity>
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
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  requiredHint: {
    fontSize: 12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 16,
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
