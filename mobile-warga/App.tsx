import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReportScreen from './src/screens/ReportScreen';
import MarketScreen from './src/screens/MarketScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import BillsScreen from './src/screens/BillsScreen';
import PatrolScreen from './src/screens/PatrolScreen';
import LetterScreen from './src/screens/LetterScreen';
import InformationScreen from './src/screens/InformationScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import GuestReportScreen from './src/screens/GuestReportScreen';
import VotingScreen from './src/screens/VotingScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import BoardingScreen from './src/screens/BoardingScreen';
import ProductDetailScreen, { Product } from './src/screens/ProductDetailScreen';
import AddProductScreen from './src/screens/AddProductScreen';
import AnnouncementDetailScreen, { Announcement } from './src/screens/AnnouncementDetailScreen';
import CctvScreen from './src/screens/CctvScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TermsConditionsScreen from './src/screens/TermsConditionsScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WargaListScreen from './src/screens/WargaListScreen';
import SystemSettingsScreen from './src/screens/SystemSettingsScreen';
import RTProfileScreen from './src/screens/RTProfileScreen';
import WalletSettingsScreen from './src/screens/WalletSettingsScreen';
import GenericListSettingsScreen from './src/screens/GenericListSettingsScreen';
import { authEvents } from './src/services/authEvent';
import RegisterRTScreen from './src/screens/RegisterRTScreen';
import RegisterWargaScreen from './src/screens/RegisterWargaScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import FinanceReportScreen from './src/screens/FinanceReportScreen';
import RondaFineSettingsScreen from './src/screens/RondaFineSettingsScreen';
import RondaFineReportScreen from './src/screens/RondaFineReportScreen';
import RondaLocationScreen from './src/screens/RondaLocationScreen';
import BansosScreen from './src/screens/BansosScreen';

import { BottomNav } from './src/components/BottomNav';
import { TenantProvider, useTenant } from './src/context/TenantContext';
import { TrialBanner, ExpiredOverlay } from './src/components/TenantStatusComponents';

const ThemedContainer = ({ children }: { children: React.ReactNode }) => {
  const { colors, isDarkMode } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {children}
    </View>
  );
};

type ScreenState = 'LOGIN' | 'HOME' | 'REPORT' | 'MARKET' | 'PAYMENT' | 'PATROL' | 'LETTER' | 'INFORMATION' | 'INVENTORY' | 'GUEST' | 'POLLING' | 'EMERGENCY' | 'BOARDING' | 'ANNOUNCEMENT_DETAIL' | 'PRODUCT_DETAIL' | 'ADD_PRODUCT' | 'CCTV' | 'SETTINGS' | 'BILLS' | 'FINANCE_REPORT' | 'WARGA_LIST' | 'TERMS' | 'CHANGE_PASSWORD' | 'PROFILE' | 'REGISTER_RT' | 'REGISTER_WARGA' | 'HELP_SUPPORT' | 'RONDA_FINE_SETTINGS' | 'RONDA_FINE_REPORT' | 'RONDA_LOCATION' | 'BANSOS' | 'SYSTEM_SETTINGS' | 'RT_PROFILE' | 'WALLET_SETTINGS' | 'ACTIVITY_SETTINGS' | 'ROLE_SETTINGS' | 'ADMIN_SETTINGS' | 'FEE_SETTINGS' | 'LETTER_TYPE_SETTINGS';

const AppContent = () => {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...Feather.font,
  });

  const { refreshStatus } = useTenant();

  const [currentScreen, setCurrentScreen] = useState<ScreenState>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [billsInitialTab, setBillsInitialTab] = useState<'bills' | 'history'>('bills');
  const [paymentData, setPaymentData] = useState<any>(null);

  const shouldShowNav = useMemo(() => {
    const hiddenScreens = ['LOGIN', 'REGISTER_RT', 'REGISTER_WARGA', 'PRODUCT_DETAIL', 'ADD_PRODUCT'];
    return !hiddenScreens.includes(currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    const backAction = () => {
      if (currentScreen === 'LOGIN' || currentScreen === 'HOME') {
        return false;
      }

      if (currentScreen === 'PRODUCT_DETAIL' || currentScreen === 'ADD_PRODUCT') {
        setCurrentScreen('MARKET');
        return true;
      }

      if (currentScreen === 'TERMS' || currentScreen === 'CHANGE_PASSWORD' || currentScreen === 'PROFILE' || currentScreen === 'HELP_SUPPORT') {
        setCurrentScreen('SETTINGS');
        return true;
      }

      if (currentScreen === 'REGISTER_RT' || currentScreen === 'REGISTER_WARGA') {
        setCurrentScreen('LOGIN');
        return true;
      }

      if (['RONDA_FINE_SETTINGS', 'RONDA_FINE_REPORT', 'RONDA_LOCATION'].includes(currentScreen)) {
        setCurrentScreen('PATROL');
        return true;
      }

      setCurrentScreen('HOME');
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [currentScreen]);

  useEffect(() => {
    checkLoginStatus();

    const unsubscribe = authEvents.subscribe((event) => {
      if (event === 'UNAUTHORIZED') {
        handleLogout();
      } else if (event === 'PAYMENT_REQUIRED') {
        refreshStatus();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        setCurrentScreen('HOME');
        // Refresh tenant status on login check
        refreshStatus();
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['user_token', 'user_data', 'tenant_status_cache']);
      setCurrentScreen('LOGIN');
    } catch (error) {
      console.error('Error logout:', error);
    }
  };

  const handleNavigate = (screen: string, data?: any) => {
    if (screen === 'ANNOUNCEMENT_DETAIL' && data) {
      setSelectedAnnouncement(data);
    }
    if (screen === 'PRODUCT_DETAIL' && data) {
      setSelectedProduct(data);
    }
    if (screen === 'BILLS') {
      setBillsInitialTab(data?.initialTab || 'bills');
    }
    if (screen === 'PAYMENT' && data) {
      setPaymentData(data);
    } else if (screen === 'PAYMENT' && !data) {
      setPaymentData(null);
    }
    setCurrentScreen(screen as ScreenState);
  };

  if (loading || !fontsLoaded) {
    return (
      <ThemedContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </ThemedContainer>
    );
  }

  return (
    <ThemedContainer>
      <ExpiredOverlay onLogout={handleLogout} />
      
      {shouldShowNav && <TrialBanner />}

      {currentScreen === 'LOGIN' && (
        <LoginScreen 
          onLoginSuccess={() => {
            setCurrentScreen('HOME');
            refreshStatus();
          }} 
          onRegisterRT={() => setCurrentScreen('REGISTER_RT')}
          onRegisterWarga={() => setCurrentScreen('REGISTER_WARGA')}
        />
      )}
      {currentScreen === 'REGISTER_RT' && (
        <RegisterRTScreen
          onSuccess={() => setCurrentScreen('HOME')}
        />
      )}
      {currentScreen === 'REGISTER_WARGA' && (
        <RegisterWargaScreen
          onSuccess={() => setCurrentScreen('HOME')}
        />
      )}
      {currentScreen === 'HOME' && <HomeScreen onNavigate={handleNavigate} onLogout={handleLogout} />}
      {currentScreen === 'REPORT' && <ReportScreen />}
      {currentScreen === 'MARKET' && (
        <MarketScreen 
          onNavigate={handleNavigate}
        />
      )}
      {currentScreen === 'PAYMENT' && <PaymentScreen initialData={paymentData} onSuccess={() => setCurrentScreen('HOME')} />}
      {currentScreen === 'PATROL' && <PatrolScreen onNavigate={handleNavigate} />}
      {currentScreen === 'LETTER' && <LetterScreen />}
      {currentScreen === 'INFORMATION' && <InformationScreen />}
      {currentScreen === 'INVENTORY' && <InventoryScreen />}
      {currentScreen === 'GUEST' && <GuestReportScreen />}
      {currentScreen === 'POLLING' && <VotingScreen />}
      {currentScreen === 'EMERGENCY' && <EmergencyScreen />}
      {currentScreen === 'BOARDING' && <BoardingScreen />}
      {currentScreen === 'BILLS' && <BillsScreen initialTab={billsInitialTab} onNavigate={handleNavigate} />}
      {currentScreen === 'FINANCE_REPORT' && <FinanceReportScreen onNavigate={handleNavigate} />}
      {currentScreen === 'ANNOUNCEMENT_DETAIL' && selectedAnnouncement && (
        <AnnouncementDetailScreen 
          announcement={selectedAnnouncement} 
        />
      )}
      {currentScreen === 'PRODUCT_DETAIL' && selectedProduct && (
        <ProductDetailScreen 
          product={selectedProduct} 
        />
      )}
      {currentScreen === 'ADD_PRODUCT' && <AddProductScreen onSuccess={() => setCurrentScreen('MARKET')} />}
      {currentScreen === 'CCTV' && <CctvScreen />}
      {currentScreen === 'SETTINGS' && <SettingsScreen onLogout={handleLogout} onNavigate={handleNavigate} />}
      {currentScreen === 'WARGA_LIST' && <WargaListScreen />}
      {currentScreen === 'TERMS' && <TermsConditionsScreen />}
      {currentScreen === 'CHANGE_PASSWORD' && <ChangePasswordScreen onSuccess={() => setCurrentScreen('SETTINGS')} />}
      {currentScreen === 'PROFILE' && <ProfileScreen />}
      {currentScreen === 'HELP_SUPPORT' && <HelpSupportScreen onNavigate={handleNavigate} />}
      
      {currentScreen === 'RONDA_FINE_SETTINGS' && <RondaFineSettingsScreen navigation={{ goBack: () => setCurrentScreen('PATROL') }} />}
      {currentScreen === 'RONDA_FINE_REPORT' && <RondaFineReportScreen navigation={{ goBack: () => setCurrentScreen('PATROL') }} />}
      {currentScreen === 'RONDA_LOCATION' && <RondaLocationScreen navigation={{ goBack: () => setCurrentScreen('PATROL') }} />}
      {currentScreen === 'BANSOS' && <BansosScreen onNavigate={handleNavigate} />}
      {currentScreen === 'SYSTEM_SETTINGS' && <SystemSettingsScreen onNavigate={handleNavigate} />}
        {currentScreen === 'RT_PROFILE' && <RTProfileScreen onNavigate={handleNavigate} />}
        {currentScreen === 'WALLET_SETTINGS' && <WalletSettingsScreen onNavigate={handleNavigate} />}
        {currentScreen === 'ACTIVITY_SETTINGS' && <GenericListSettingsScreen onNavigate={handleNavigate} type="ACTIVITIES" />}
        {currentScreen === 'ROLE_SETTINGS' && <GenericListSettingsScreen onNavigate={handleNavigate} type="ROLES" />}
         {currentScreen === 'ADMIN_SETTINGS' && <GenericListSettingsScreen onNavigate={handleNavigate} type="ADMINS" />}
         {currentScreen === 'FEE_SETTINGS' && <GenericListSettingsScreen onNavigate={handleNavigate} type="FEES" />}
         {currentScreen === 'LETTER_TYPE_SETTINGS' && <GenericListSettingsScreen onNavigate={handleNavigate} type="LETTER_TYPES" />}

         {shouldShowNav && (
        <BottomNav 
          currentScreen={currentScreen} 
          onNavigate={(screen) => handleNavigate(screen)} 
        />
      )}
    </ThemedContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <TenantProvider>
            <AppContent />
          </TenantProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
