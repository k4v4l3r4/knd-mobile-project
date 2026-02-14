import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Vibration,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';

const { width } = Dimensions.get('window');

interface Contact {
  id: number;
  name: string;
  number: string;
  type: string;
}

export default function EmergencyScreen() {
  const { colors, isDarkMode } = useTheme();
  const { isDemo, isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [activeTab, setActiveTab] = useState<'sos' | 'contacts'>('sos');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pressing, setPressing] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchContacts();
    }
  }, [activeTab]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/emergency-contacts');
      setContacts(response.data.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      Alert.alert('Error', 'Gagal memuat kontak darurat');
    } finally {
      setLoading(false);
    }
  };

  const handlePressIn = () => {
    setPressing(true);
    let counter = 0;
    const interval = setInterval(() => {
      counter += 100;
      setProgress(counter / 3000); // 3 seconds
      if (counter >= 3000) {
        clearInterval(interval);
        sendSOS();
        setPressing(false);
        setProgress(0);
      }
    }, 100);
    setPressTimer(interval);
  };

  const handlePressOut = () => {
    setPressing(false);
    setProgress(0);
    if (pressTimer) {
      clearInterval(pressTimer);
      setPressTimer(null);
    }
  };

  const sendSOS = async () => {
    if (isDemo) {
      Alert.alert('Mode Demo', 'Fitur SOS tidak berfungsi di mode demo');
      return;
    }
    if (isExpired) {
      Alert.alert('Akses Terbatas', 'Silakan perpanjang langganan untuk menggunakan fitur SOS');
      return;
    }

    Vibration.vibrate(500);
    setLoading(true);
    try {
      let locationData = null;
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
      }

      await api.post('/emergency/panic', {
        type: 'LAINNYA', // Default to General SOS, could add selector
        ...locationData
      });

      Alert.alert('Sinyal Darurat Terkirim!', 'Satpam segera menuju lokasi.');
    } catch (error) {
      console.error('SOS Error:', error);
      Alert.alert('Gagal', 'Gagal mengirim sinyal darurat. Coba lagi atau hubungi nomor darurat manual.');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={styles.container}>
      {/* Header with Red Gradient for Emergency */}
      <View
        style={[styles.headerBackground, { backgroundColor: '#ef4444' }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={styles.headerTitle}>Darurat & SOS</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'sos' && styles.activeTabButton]}
            onPress={() => setActiveTab('sos')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'sos' && styles.activeTabText]}>Panic Button</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'contacts' && styles.activeTabButton]}
            onPress={() => setActiveTab('contacts')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>Kontak Penting</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'sos' ? (
          <View style={styles.sosContainer}>
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={20} color="#EF4444" />
              <Text style={styles.sosInstruction}>TEKAN & TAHAN 3 DETIK</Text>
            </View>
            
            <View style={styles.sosWrapper}>
              {/* Outer Rings Animation could be added here */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}} // Handled by onPressIn/Out
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[styles.sosButton, pressing && styles.sosButtonPressed]}
              >
                <View style={styles.sosInner}>
                  <MaterialCommunityIcons name="alarm-light-outline" size={64} color="#fff" />
                  <Text style={styles.sosText}>SOS</Text>
                </View>
                {pressing && (
                   <View style={[styles.progressRing, { 
                     borderWidth: 8,
                     borderColor: `rgba(255, 255, 255, ${Math.max(0.3, progress)})`,
                     transform: [{ scale: 1 + progress * 0.2 }]
                   }]} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.sosSubtext}>
                Sinyal darurat akan dikirimkan ke Satpam & Pengurus RT beserta lokasi terkini Anda.
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.contactCard}
                onPress={() => Linking.openURL(`tel:${item.number}`)}
                activeOpacity={0.7}
              >
                <View style={styles.contactContent}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="call" size={24} color="#fff" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactNumber}>{item.number}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.contactType}>{item.type}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.callAction}>
                  <Ionicons name="call-outline" size={20} color={'#ef4444'} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="large" color="#EF4444" style={styles.loader} />
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.emptyTitle}>Belum Ada Kontak</Text>
                  <Text style={styles.emptyText}>Belum ada data kontak darurat yang tersedia.</Text>
                </View>
              )
            }
          />
        )}
      </View>
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginTop: -25, // Overlap header
    zIndex: 20,
    marginBottom: 10,
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTabButton: {
    backgroundColor: '#EF4444', // Red for Emergency context
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  // SOS Styles
  sosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 40,
    gap: 8,
  },
  sosInstruction: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sosWrapper: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    position: 'relative',
    borderWidth: 6,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FEF2F2',
  },
  sosButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#DC2626',
  },
  sosInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sosText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
  },
  progressRing: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 130,
  },
  infoBox: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sosSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Contacts Styles
  listContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  contactNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  contactType: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  callAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
