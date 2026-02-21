import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { getStorageUrl } from '../services/api';

interface SettingsScreenProps {
  onLogout: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

const SettingsScreen = ({ onLogout, onNavigate }: SettingsScreenProps) => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [user, setUser] = useState({  
    name: 'User Warga', 
    email: 'user@example.com', 
    role: 'Warga',
    avatar: null 
  });
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'upToDate' | 'updated' | 'error'>('idle');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.logoutButton'),
          onPress: onLogout,
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditAvatar = () => {
    Alert.alert(t('common.info'), t('settings.changeAvatarInfo'));
  };

  const handleChangeLanguage = () => {
    setIsLanguageModalVisible(true);
  };
  
  const handleSelectLanguage = (lang: 'id' | 'en') => {
    setLanguage(lang);
    setIsLanguageModalVisible(false);
  };

  const handleUpdateApp = async () => {
    try {
      setUpdateStatus('checking');
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setUpdateStatus('downloading');
        await Updates.fetchUpdateAsync();
        setUpdateStatus('updated');
        Alert.alert(
          'Pembaruan tersedia',
          'Aplikasi akan dimuat ulang untuk menerapkan versi terbaru.',
          [
            {
              text: 'OK',
              onPress: () => {
                Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        setUpdateStatus('upToDate');
        Alert.alert('Tidak ada pembaruan', 'Anda sudah menggunakan versi terbaru.');
      }
    } catch (error) {
      setUpdateStatus('error');
      Alert.alert('Gagal cek pembaruan', 'Terjadi kesalahan saat memeriksa pembaruan. Coba lagi nanti.');
    } finally {
      setTimeout(() => {
        setUpdateStatus('idle');
      }, 3000);
    }
  };

  const getUpdateStatusLabel = () => {
    switch (updateStatus) {
      case 'checking':
        return 'Memeriksa...';
      case 'downloading':
        return 'Mengunduh...';
      case 'upToDate':
        return 'Sudah terbaru';
      case 'updated':
        return 'Terpasang';
      case 'error':
        return 'Gagal, coba lagi';
      default:
        return '';
    }
  };

  const menuItems = [
    {
      title: t('settings.account'),
      items: [
        { icon: 'person-outline', label: t('settings.profile'), onPress: () => onNavigate('PROFILE') },
        { icon: 'lock-closed-outline', label: t('settings.changePassword'), onPress: () => onNavigate('CHANGE_PASSWORD') },
      ]
    },
    {
      title: t('settings.preferences'),
      items: [
        { 
          icon: isDarkMode ? 'moon-outline' : 'sunny-outline', 
          label: t('settings.darkMode'), 
          type: 'toggle',
          value: isDarkMode,
          onToggle: toggleTheme 
        },
        { 
          icon: 'notifications-outline', 
          label: t('settings.notifications'), 
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: () => setNotificationsEnabled(!notificationsEnabled)
        },
        { icon: 'language-outline', label: t('settings.language'), value: language === 'id' ? 'Bahasa Indonesia' : 'English', onPress: handleChangeLanguage },
      ]
    },
    {
      title: t('settings.others'),
      items: [
        { icon: 'cloud-download-outline', label: 'Update Aplikasi', value: getUpdateStatusLabel(), onPress: handleUpdateApp },
        { icon: 'information-circle-outline', label: t('settings.about'), onPress: () => Alert.alert(t('common.info'), `${t('settings.version')} 1.0.0`) },
        { icon: 'help-circle-outline', label: t('settings.help'), onPress: () => onNavigate('HELP_SUPPORT') },
        { icon: 'document-text-outline', label: t('settings.terms'), onPress: () => onNavigate('TERMS') },
      ]
    },
  ];

  const renderMenuItem = (item: any, index: number, isLast: boolean) => (
    <View key={index}>
      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={item.onPress}
        disabled={item.type === 'toggle'}
      >
        <View style={styles.menuIconContainer}>
          <Ionicons name={item.icon} size={22} color={colors.text} />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.type === 'toggle' ? (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: '#cbd5e1', true: colors.primary }}
              thumbColor={'#fff'}
            />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {item.value && (
                <Text style={[styles.menuValue, { marginRight: 8 }]}>{item.value}</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#059669', '#047857'] : ['#059669', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
             <Image 
               source={{ uri: (user?.avatar && getStorageUrl(user.avatar)) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random` }} 
               style={styles.avatar} 
             />
             <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditAvatar}>
               <Ionicons name="camera" size={16} color="#fff" />
             </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User Warga'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.roleBadge}>
               <Text style={styles.roleText}>{user?.role || 'Warga'}</Text>
            </View>
          </View>
        </View>

        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionHeader}>
              {section.title}
            </Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => 
                renderMenuItem(item, index, index === section.items.length - 1)
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          {t('settings.version')} 1.0.0 (Build 20240520)
        </Text>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLanguageModalVisible}
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              <Text style={styles.modalSubtitle}>{t('settings.selectLanguageDesc')}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.languageOption, language === 'id' && styles.selectedLanguageOption]} 
              onPress={() => handleSelectLanguage('id')}
              activeOpacity={0.7}
            >
              <View style={styles.languageOptionContent}>
                <Text style={{ fontSize: 24 }}>🇮🇩</Text>
                <Text style={[styles.languageText, language === 'id' && styles.selectedLanguageText]}>
                  Bahasa Indonesia
                </Text>
              </View>
              {language === 'id' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.languageOption, language === 'en' && styles.selectedLanguageOption]} 
              onPress={() => handleSelectLanguage('en')}
              activeOpacity={0.7}
            >
              <View style={styles.languageOptionContent}>
                <Text style={{ fontSize: 24 }}>🇬🇧</Text>
                <Text style={[styles.languageText, language === 'en' && styles.selectedLanguageText]}>
                  English
                </Text>
              </View>
              {language === 'en' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setIsLanguageModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  // Profile
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    marginLeft: 60, // Indent divider
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    color: colors.textSecondary,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#fff',
  },
  selectedLanguageOption: {
    borderColor: colors.primary,
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  selectedLanguageText: {
    color: colors.primary,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default SettingsScreen;
