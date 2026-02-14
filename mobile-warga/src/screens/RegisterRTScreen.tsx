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
  Image,
  TouchableOpacity,
  ActivityIndicator
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
    password: '',
    confirmPassword: '',
    rtNumber: '',
    rwNumber: '',
    rtName: ''
  });

  const handleRegister = async () => {
    if (!formData.name || !formData.phone || !formData.password || !formData.rtNumber || !formData.rwNumber) {
      Alert.alert('Error', 'Mohon lengkapi data wajib (Nama, HP, Password, No RT, No RW)');
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
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Lengkap</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nomor HP (WhatsApp)</Text>
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
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
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
              <Text style={[styles.label, { color: colors.textSecondary }]}>Konfirmasi Password</Text>
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
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nomor RT</Text>
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
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nomor RW</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
