import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import api from '../services/api';

interface ChangePasswordScreenProps {
  onSuccess: () => void;
}

export default function ChangePasswordScreen({ onSuccess }: ChangePasswordScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Peringatan', 'Mohon lengkapi semua kolom');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Peringatan', 'Password baru minimal 8 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Peringatan', 'Konfirmasi password tidak sesuai');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/profile/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword
      });

      if (response.data) {
        Alert.alert('Sukses', 'Password berhasil diperbarui', [
          { text: 'OK', onPress: onSuccess }
        ]);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gagal memperbarui password';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordInput = (
    label: string, 
    value: string, 
    setValue: (text: string) => void,
    showPass: boolean,
    setShowPass: (show: boolean) => void,
    placeholder: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Feather name="lock" size={20} color={colors.primary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={setValue}
          secureTextEntry={!showPass}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        <TouchableOpacity 
          onPress={() => setShowPass(!showPass)}
          style={styles.eyeIcon}
          activeOpacity={0.7}
        >
          <Feather 
            name={showPass ? "eye" : "eye-off"} 
            size={20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View
        style={[styles.headerBackground, { backgroundColor: isDarkMode ? '#059669' : '#047857' }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Ubah Password</Text>
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
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formCard}>
            <Text style={styles.helperText}>
              Pastikan password baru Anda kuat dan mudah diingat. Minimal 8 karakter.
            </Text>

            {renderPasswordInput(
              "Password Saat Ini",
              currentPassword,
              setCurrentPassword,
              showCurrentPassword,
              setShowCurrentPassword,
              "Masukkan password saat ini"
            )}

            {renderPasswordInput(
              "Password Baru",
              newPassword,
              setNewPassword,
              showNewPassword,
              setShowNewPassword,
              "Minimal 8 karakter"
            )}

            {renderPasswordInput(
              "Konfirmasi Password Baru",
              confirmPassword,
              setConfirmPassword,
              showConfirmPassword,
              setShowConfirmPassword,
              "Ulangi password baru"
            )}

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={loading}
              style={[styles.submitButton, loading && styles.disabledButton]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Ubah Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
