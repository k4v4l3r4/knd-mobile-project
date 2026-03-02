import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, RefreshControl, StatusBar, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';

interface CctvData {
  id: number;
  label: string;
  stream_url: string;
  location?: string;
  is_active: boolean;
}

interface Props {
}

export default function CctvScreen() {
  const { colors, isDarkMode, setTheme } = useTheme();
  const { isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [cctvs, setCctvs] = useState<CctvData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCctvs = async () => {
    try {
      const response = await api.get('/cctvs');
      if (response.data.success) {
        setCctvs(response.data.data.filter((c: CctvData) => c.is_active));
      }
    } catch (error) {
      console.error('Error fetching CCTVs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCctvs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCctvs();
  };

  const renderItem = ({ item }: { item: CctvData }) => (
    <View style={styles.card}>
      <View style={styles.videoContainer}>
        <Image 
            source={{ uri: item.stream_url }} 
            style={styles.video} 
            resizeMode="cover"
        />
        
        {/* Overlay */}
        <View style={styles.overlay}>
            <View style={styles.headerRow}>
                <View style={styles.liveBadge}>
                    <View style={styles.dot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={styles.timeText}>
                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            
            <View style={styles.footerRow}>
                <View style={styles.labelContainer}>
                    <Text style={styles.labelText}>{item.label}</Text>
                    {item.location && <Text style={styles.locationText}>{item.location}</Text>}
                </View>
            </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header */}
      <View
        style={[styles.headerBackground, { backgroundColor: colors.primary }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRowWrapper}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Monitoring CCTV</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={isDarkMode ? '#059669' : '#059669'} />
        </View>
      ) : isExpired ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Layanan Tidak Tersedia</Text>
            <Text style={[styles.emptyText, { fontSize: 14, marginTop: 4 }]}>
                Masa aktif sistem telah habis. Hubungi Admin.
            </Text>
        </View>
      ) : (
        <FlatList
          data={cctvs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={[isDarkMode ? '#059669' : '#059669']} 
                tintColor={isDarkMode ? '#059669' : '#059669'}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="videocam-off-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Tidak ada CCTV aktif</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
    gap: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: isDarkMode ? '#1e293b' : '#cbd5e1',
  },
  video: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  labelContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    // backdropFilter: 'blur(10px)', // Not supported in React Native directly
  },
  labelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
