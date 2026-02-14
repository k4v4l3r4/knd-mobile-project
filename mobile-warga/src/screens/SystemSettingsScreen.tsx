import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { BackButton } from '../components/BackButton';

const { width } = Dimensions.get('window');

interface SystemSettingsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export default function SystemSettingsScreen({ onNavigate }: SystemSettingsScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const menuGroups = [
    {
      title: t('home.menus.systemSettings'),
      items: [
        { 
          title: t('home.menus.rtProfile'), 
          icon: 'business-outline', 
          color: '#3b82f6',
          action: () => onNavigate('RT_PROFILE')
        },
        { 
          title: t('home.menus.financeSettings'), 
          icon: 'wallet-outline', 
          color: '#10b981',
          action: () => onNavigate('WALLET_SETTINGS')
        },
        { 
          title: t('home.menus.activityCategories'), 
          icon: 'list-outline', 
          color: '#f59e0b',
          action: () => onNavigate('ACTIVITY_SETTINGS')
        },
        { 
          title: t('home.menus.adminManagement'), 
          icon: 'people-outline', 
          color: '#8b5cf6',
          action: () => onNavigate('ADMIN_SETTINGS')
        },
        { 
          title: t('home.menus.roleManagement'), 
          icon: 'shield-checkmark-outline', 
          color: '#ec4899',
          action: () => onNavigate('ROLE_SETTINGS')
        },
        { 
          title: t('home.menus.feeManagement'), 
          icon: 'cash-outline', 
          color: '#06b6d4',
          action: () => onNavigate('FEE_SETTINGS')
        },
        { 
          title: t('home.menus.letterTypes'), 
          icon: 'document-text-outline', 
          color: '#f97316',
          action: () => onNavigate('LETTER_TYPE_SETTINGS')
        },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={[colors.primary, '#064e3b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => onNavigate('HOME')} color="#fff" />
            <Text style={styles.headerTitle}>{t('home.menus.systemSettings')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={item.action}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {itemIndex < group.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Pengaturan ini sinkron dengan dashboard web-admin RT Online.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    marginLeft: 72,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
});
