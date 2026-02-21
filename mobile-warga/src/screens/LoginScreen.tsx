import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { authService } from '../services/auth';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onRegisterRT: () => void;
  onRegisterWarga: () => void;
}

export default function LoginScreen({ onLoginSuccess, onRegisterRT, onRegisterWarga }: LoginScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    checkRememberedUser();
  }, []);

  const checkRememberedUser = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('remembered_phone');
      const savedPassword = await AsyncStorage.getItem('remembered_password');
      if (savedPhone && savedPassword) {
        setPhone(savedPhone);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.log('Error checking remembered user:', error);
    }
  };

  const handleLogin = async (overridePhone?: string, overridePassword?: string) => {
    const targetPhone = typeof overridePhone === 'string' ? overridePhone : phone;
    const targetPassword = typeof overridePassword === 'string' ? overridePassword : password;

    if (!targetPhone || !targetPassword) {
      Alert.alert(t('login.alert.warning'), t('login.alert.fillFields'));
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = targetPhone.trim();
      const cleanPassword = targetPassword.trim();
      const response = await authService.login(cleanPhone, cleanPassword);

      if (response.success && response.data) {
        const { token, user } = response.data;
        
        await AsyncStorage.multiSet([
          ['user_token', token],
          ['user_data', JSON.stringify(user)]
        ]);
        
        if (rememberMe) {
          await AsyncStorage.multiSet([
            ['remembered_phone', cleanPhone],
            ['remembered_password', cleanPassword]
          ]);
        } else {
          await AsyncStorage.multiRemove(['remembered_phone', 'remembered_password']);
        }

        onLoginSuccess();
      } else {
        Alert.alert(t('login.alert.failed'), response.message || t('login.alert.loginFailed'));
      }
    } catch (error: any) {
      console.log('Login error:', error);
      const message = error.message || t('login.alert.connectionError');
      Alert.alert(t('login.alert.failed'), message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'WARGA' | 'RT') => {
    setLoading(true);
    try {
      const role = type === 'RT' ? 'ADMIN_RT' : 'WARGA';
      const response = await api.post('/auth/login/demo-mobile', { demo_role: role });

      if (response.data.token) {
        const { token, user } = response.data;

        await AsyncStorage.multiSet([
          ['user_token', token],
          ['user_data', JSON.stringify(user)],
        ]);

        await AsyncStorage.multiRemove(['remembered_phone', 'remembered_password']);

        onLoginSuccess();
      } else {
        Alert.alert(t('login.alert.failed'), t('login.demoError'));
      }
    } catch (error: any) {
      console.log('Demo login error:', error);
      Alert.alert(t('login.alert.failed'), t('login.alert.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetError(null);
    setResetStep(1);
    setResetPhone(phone);
    setResetOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetToken('');
    setResetVisible(true);
  };

  const handleResetRequestOtp = async () => {
    const targetPhone = (resetPhone || phone).trim();
    if (!targetPhone) {
      setResetError('Mohon isi nomor WhatsApp terlebih dahulu.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await api.post('/auth/forgot-password', { phone: targetPhone });
      setResetPhone(targetPhone);
      Alert.alert('Berhasil', 'Kode verifikasi telah dikirim ke WhatsApp Anda.');
      setResetStep(2);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gagal mengirim kode verifikasi. Mohon coba lagi.';
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetVerifyOtp = async () => {
    if (!resetPhone.trim()) {
      setResetError('Nomor WhatsApp tidak boleh kosong.');
      return;
    }
    if (!resetOtp || resetOtp.length !== 6) {
      setResetError('Mohon isi kode verifikasi 6 digit.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const response = await api.post('/auth/verify-otp', {
        phone: resetPhone.trim(),
        otp: resetOtp,
      });
      const token = response.data?.data?.token;
      if (!token) {
        setResetError('Token reset tidak ditemukan. Mohon coba lagi.');
        return;
      }
      setResetToken(token);
      Alert.alert('Berhasil', 'Kode verifikasi benar. Silakan buat kata sandi baru.');
      setResetStep(3);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Kode verifikasi tidak valid. Mohon coba lagi.';
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetSubmitPassword = async () => {
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (!resetPhone.trim() || !resetToken) {
      setResetError('Data reset tidak lengkap. Mohon ulangi proses reset sandi.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const response = await api.post('/auth/reset-password', {
        phone: resetPhone.trim(),
        password: resetNewPassword,
        token: resetToken,
      });
      const data = response.data?.data;
      if (data?.token && data?.user) {
        const { token, user } = data;
        await AsyncStorage.multiSet([
          ['user_token', token],
          ['user_data', JSON.stringify(user)],
        ]);
        await AsyncStorage.multiRemove(['remembered_phone', 'remembered_password']);
        setResetVisible(false);
        Alert.alert('Berhasil', 'Kata sandi berhasil direset. Anda akan masuk ke aplikasi.', [
          {
            text: 'OK',
            onPress: () => {
              onLoginSuccess();
            },
          },
        ]);
        return;
      }
      setResetVisible(false);
      Alert.alert('Berhasil', 'Kata sandi berhasil direset. Silakan login dengan kata sandi baru.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gagal menyimpan kata sandi baru. Mohon coba lagi.';
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const isSmallDevice = width < 375;

  return (
    <View style={styles.container}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Background Decor */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.headerContainer}>
              <Image 
                source={require('../../assets/icon.png')}
                style={{ 
                  width: isSmallDevice ? 120 : 150, 
                  height: isSmallDevice ? 120 : 150, 
                  resizeMode: 'contain', 
                  marginBottom: isSmallDevice ? -10 : -20, 
                  marginTop: isSmallDevice ? 0 : 20,
                  // tintColor: isDarkMode ? '#ffffff' : undefined
                }}
              />
              <Text style={[styles.tagline, { color: colors.text }]}>{t('login.tagline')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 16 }]}>{t('login.subtitle')}</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="phone" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('login.phonePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.checkboxContainer} 
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}>
                  {rememberMe && <Feather name="check" size={12} color="#fff" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>{t('login.rememberMe')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={[styles.forgotPassword, { color: colors.primary }]}>{t('login.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            {resetVisible && (
              <View style={[styles.resetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.resetHeader}>
                  <Text style={[styles.resetTitle, { color: colors.text }]}>Reset Kata Sandi</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setResetVisible(false);
                      setResetError(null);
                    }}
                  >
                    <Text style={[styles.resetClose, { color: colors.textSecondary }]}>Tutup</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.resetStepText, { color: colors.textSecondary }]}>
                  Langkah {resetStep} dari 3
                </Text>
                {resetError && (
                  <Text style={[styles.resetErrorText, { color: '#DC2626' }]}>
                    {resetError}
                  </Text>
                )}

                {resetStep === 1 && (
                  <View style={styles.resetSection}>
                    <Text style={[styles.resetLabel, { color: colors.textSecondary }]}>
                      Nomor WhatsApp yang terdaftar
                    </Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="phone" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder={t('login.phonePlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        value={resetPhone}
                        onChangeText={setResetPhone}
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleResetRequestOtp}
                      disabled={resetLoading}
                      style={[
                        styles.resetButton,
                        { backgroundColor: colors.primary, opacity: resetLoading ? 0.7 : 1 },
                      ]}
                      activeOpacity={0.8}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.resetButtonText}>Kirim Kode Verifikasi</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {resetStep === 2 && (
                  <View style={styles.resetSection}>
                    <Text style={[styles.resetLabel, { color: colors.textSecondary }]}>
                      Masukkan kode verifikasi 6 digit yang dikirim ke WhatsApp {resetPhone}.
                    </Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="key" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.text, letterSpacing: 6, textAlign: 'center' }]}
                        placeholder="••••••"
                        placeholderTextColor={colors.textSecondary}
                        value={resetOtp}
                        onChangeText={(text) => setResetOtp(text.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleResetVerifyOtp}
                      disabled={resetLoading}
                      style={[
                        styles.resetButton,
                        { backgroundColor: colors.primary, opacity: resetLoading ? 0.7 : 1 },
                      ]}
                      activeOpacity={0.8}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.resetButtonText}>Verifikasi Kode</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {resetStep === 3 && (
                  <View style={styles.resetSection}>
                    <Text style={[styles.resetLabel, { color: colors.textSecondary }]}>
                      Buat kata sandi baru
                    </Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="lock" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Minimal 6 karakter"
                        placeholderTextColor={colors.textSecondary}
                        value={resetNewPassword}
                        onChangeText={setResetNewPassword}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="lock" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Ulangi kata sandi baru"
                        placeholderTextColor={colors.textSecondary}
                        value={resetConfirmPassword}
                        onChangeText={setResetConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleResetSubmitPassword}
                      disabled={resetLoading}
                      style={[
                        styles.resetButton,
                        { backgroundColor: colors.primary, opacity: resetLoading ? 0.7 : 1 },
                      ]}
                      activeOpacity={0.8}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.resetButtonText}>Simpan Kata Sandi Baru</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleLogin()}
              disabled={loading}
              style={[
                styles.loginButton, 
                { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1, marginBottom: 0 }
              ]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{t('login.loginButton')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>{t('login.registerText')}</Text>
              <TouchableOpacity 
                onPress={onRegisterRT}
                style={[styles.registerButton, { borderColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.registerButtonText, { color: colors.primary }]}>{t('login.registerButton')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>{t('login.registerWargaText')}</Text>
              <TouchableOpacity 
                onPress={onRegisterWarga}
                style={[styles.registerButton, { borderColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.registerButtonText, { color: colors.primary }]}>{t('login.registerWargaButton')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.demoContainer}>
              <Text style={[styles.demoTitle, { color: colors.textSecondary }]}>{t('login.demoTitle')}</Text>
              <View style={styles.demoButtons}>
                <TouchableOpacity 
                  style={styles.demoButton}
                  onPress={() => handleDemoLogin('RT')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.demoButtonText, { color: colors.text }]}>{t('login.viewDemo')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('login.footer')}</Text>
            <Text style={styles.versionText}>v1.2.0 (Fresh Mint)</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.background : '#ffffff',
  },
  decorCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5',
    opacity: 0.5,
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5',
    opacity: 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  formContainer: {
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: '100%',
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  forgotPassword: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resetContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  resetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resetTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resetClose: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetStepText: {
    fontSize: 12,
    marginBottom: 4,
  },
  resetErrorText: {
    fontSize: 12,
    marginBottom: 8,
  },
  resetSection: {
    gap: 8,
    marginTop: 4,
  },
  resetLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  registerContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  registerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  demoContainer: {
    marginTop: 48,
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 24,
  },
  demoTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  demoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  demoButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  versionText: {
    color: colors.textSecondary,
    fontSize: 11,
    opacity: 0.6,
  },
});
