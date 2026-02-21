import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTenant } from '../context/TenantContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../services/api';

export const TrialBanner = () => {
  const { isTrial, daysRemaining, isExpired, status } = useTenant();
  const { colors } = useTheme();

  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!status?.trial_end_at || !isTrial || isExpired) {
      setCountdown(null);
      return;
    }

    const update = () => {
      const end = new Date(status.trial_end_at as string).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setCountdown('00:00:00');
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (v: number) => v.toString().padStart(2, '0');
      const dayPart = days > 0 ? `${days} hari ` : '';

      setCountdown(`${dayPart}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    update();
    const interval = setInterval(update, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [status?.trial_end_at, isTrial, isExpired]);

  if (!isTrial || isExpired) return null;

  const isCritical = daysRemaining <= 2;
  const backgroundColor = isCritical ? colors.danger : colors.primary;

  const handleUpgrade = () => {
    const baseUrl = BASE_URL.replace(/\/api$/, '');
    const url = `${baseUrl}/dashboard/billing/subscribe`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor }}>
      <View style={[styles.banner, { backgroundColor }]}>
        <Text style={styles.bannerText}>
          {isCritical 
            ? `Trial hampir berakhir (${Math.ceil(daysRemaining)} hari${countdown ? ` - ${countdown}` : ''}). Segera lakukan pembayaran.` 
            : `Masa trial tersisa ${Math.ceil(daysRemaining)} hari${countdown ? ` (${countdown})` : ''}`}
        </Text>
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
          <Text style={[styles.upgradeText, { color: backgroundColor }]}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export const ExpiredOverlay = ({ onLogout }: { onLogout: () => void }) => {
  const { isExpired } = useTenant();
  const { colors } = useTheme();

  if (!isExpired) return null;

  const handleContinuePayment = () => {
    const baseUrl = BASE_URL.replace(/\/api$/, '');
    const url = `${baseUrl}/dashboard/billing/subscribe`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <Ionicons name="lock-closed-outline" size={64} color={colors.danger} />
      <Text style={[styles.title, { color: colors.text }]}>Langganan Berakhir</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        Akses sistem dikunci hingga pembayaran dilakukan.
      </Text>
      
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleContinuePayment}>
        <Text style={styles.buttonText}>Lanjutkan Pembayaran</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
        <Text style={{ color: colors.danger }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export const DemoLabel = () => {
  const { isDemo } = useTenant();
  if (!isDemo) return null;
  
  return (
    <View style={styles.demoBadge}>
      <Text style={styles.demoText}>MODE DEMO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bannerText: {
    color: 'white',
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  upgradeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 16,
  },
  demoBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  demoText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
