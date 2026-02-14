import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const { colors, isDarkMode } = useTheme();

  const tabs = [
    { id: 'HOME', label: 'Beranda', icon: 'home-outline', activeIcon: 'home' },
    { id: 'MARKET', label: 'UMKM', icon: 'storefront-outline', activeIcon: 'storefront' },
    { id: 'EMERGENCY', label: 'Darurat', icon: 'alert-circle-outline', activeIcon: 'alert-circle' },
    { id: 'REPORT', label: 'Laporan', icon: 'document-text-outline', activeIcon: 'document-text' },
    { id: 'SETTINGS', label: 'Akun', icon: 'person-outline', activeIcon: 'person' },
  ];

  const isTabActive = (tabId: string) => {
    if (currentScreen === tabId) return true;
    
    // HOME Sub-screens
    if (tabId === 'HOME' && [
      'LETTER', 'PATROL', 'INFORMATION', 'INVENTORY', 'GUEST', 
      'POLLING', 'EMERGENCY', 'BOARDING', 'BILLS', 'ANNOUNCEMENT_DETAIL', 
      'CCTV', 'WARGA_LIST', 'PAYMENT'
    ].includes(currentScreen)) return true;

    // MARKET Sub-screens
    if (tabId === 'MARKET' && ['PRODUCT_DETAIL', 'ADD_PRODUCT'].includes(currentScreen)) return true;

    // SETTINGS Sub-screens
    if (tabId === 'SETTINGS' && ['TERMS', 'CHANGE_PASSWORD', 'PROFILE'].includes(currentScreen)) return true;

    return false;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.blurContainer, 
          { 
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
            borderTopWidth: 1, 
            borderTopColor: isDarkMode ? '#334155' : '#f1f5f9'
          }
        ]}
      >
          <NavContent 
            tabs={tabs} 
            currentScreen={currentScreen} 
            onNavigate={onNavigate} 
            isTabActive={isTabActive}
            colors={colors}
            isDarkMode={isDarkMode}
          />
      </View>
    </View>
  );
};

const NavContent = ({ tabs, onNavigate, isTabActive, colors, isDarkMode }: any) => (
  <View style={styles.content}>
    {tabs.map((tab: any) => {
      const active = isTabActive(tab.id);
      
      if (tab.id === 'EMERGENCY') {
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, { marginTop: -24 }]}
            onPress={() => onNavigate(tab.id)}
            activeOpacity={0.8}
          >
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#ef4444',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
              borderWidth: 4,
              borderColor: isDarkMode ? '#0f172a' : '#ffffff'
            }}>
              <MaterialCommunityIcons name="alarm-light-outline" size={30} color="#fff" />
            </View>
            <Text style={[
              styles.label, 
              { color: '#ef4444', fontWeight: '700', marginTop: 4, fontSize: 10 }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onNavigate(tab.id)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.iconContainer,
            // active && { backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : 'rgba(16, 185, 129, 0.1)' }
          ]}>
            <Ionicons 
              name={active ? tab.activeIcon : tab.icon} 
              size={26} 
              color={active ? colors.primary : colors.textSecondary} 
            />
          </View>
          <Text style={[
            styles.label, 
            { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '600' : '500' }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0, // Removed elevation for cleaner look
    zIndex: 1000,
  },
  blurContainer: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 4,
    // borderRadius: 12, // Removed pill shape
    // padding: 4,
  },
  label: {
    fontSize: 11, // Slightly larger
  }
});
