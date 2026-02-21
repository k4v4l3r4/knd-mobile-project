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
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RegisterWargaScreenProps {
  onSuccess: () => void;
}

export default function RegisterWargaScreen({ onSuccess }: RegisterWargaScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  });

  const handleRegister = async () => {
    if (!formData.name || !formData.phone || !formData.password || !formData.inviteCode) {
      Alert.alert('Error', 'Mohon lengkapi data wajib (Nama, HP, Password, Kode Undangan)');
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
        password: formData.password,
        invite_code: formData.inviteCode
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        await AsyncStorage.multiSet([
          ['user_token', token],
          ['user_data', JSON.stringify(user)]
        ]);
        Alert.alert('Sukses', 'Registrasi Warga berhasil!');
        onSuccess();
      } else {
        Alert.alert('Gagal', response.data.message || 'Registrasi gagal');
      }
    } catch (error: any) {
      console.log('Register Warga Error:', error);
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
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>Daftar Akun Warga</Text>
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
              Silakan masukkan Kode Undangan yang diberikan oleh Ketua RT Anda untuk mendaftar.
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
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, textAlign: 'center', letterSpacing: 2, fontWeight: 'bold' }]}
                placeholder="XXXXXX"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                value={formData.inviteCode}
                onChangeText={(text) => setFormData({...formData, inviteCode: text.toUpperCase()})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nama Lengkap
                <Text style={{ color: '#ef4444' }}> *</Text>
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
                Nomor HP (WhatsApp)
                <Text style={{ color: '#ef4444' }}> *</Text>
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
                Password
                <Text style={{ color: '#ef4444' }}> *</Text>
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
                Konfirmasi Password
                <Text style={{ color: '#ef4444' }}> *</Text>
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
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
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
