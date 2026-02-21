import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  url?: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  onNavigate?: (screen: string, data?: any) => void;
}

const NotificationsScreen: React.FC<Props> = ({ onNavigate }) => {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<NotificationItem[]>([]);

  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      if (response.data.status === 'success') {
        setData(response.data.data || []);
      } else {
        setData([]);
      }
    } catch (error: any) {
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOpenUrl = (item: NotificationItem) => {
    if (item.url) {
      Linking.openURL(item.url).catch(() => {});
    }
  };

  const handlePressItem = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await api.post(`/notifications/${item.id}/read`);
        setData(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      } catch (error) {}
    }
    handleOpenUrl(item);
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const iconName =
      item.type === 'BILL'
        ? 'receipt-outline'
        : item.type === 'INFO'
        ? 'information-circle-outline'
        : 'notifications-outline';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.is_read && { backgroundColor: isDarkMode ? '#0f172a' : '#ecfeff' },
        ]}
        activeOpacity={0.8}
        onPress={() => handlePressItem(item)}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={22}
            color={item.is_read ? colors.textSecondary : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                !item.is_read && { color: colors.primary },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        {!item.is_read && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => onNavigate && onNavigate('HOME')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
              <DemoLabel />
            </View>
            <View style={styles.headerRightPlaceholder} />
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="notifications-off-outline"
                  size={56}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>
                  {t('notifications.emptyTitle')}
                </Text>
                <Text style={styles.emptyText}>
                  {t('notifications.emptyMsg')}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBackground: {
      paddingBottom: 16,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    headerContent: {
      paddingHorizontal: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    headerCenter: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
    },
    headerRightPlaceholder: {
      width: 40,
      height: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    listContent: {
      paddingBottom: 24,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#0f172a' : '#ecfeff',
      marginRight: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    cardDate: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    cardMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
      marginLeft: 8,
      marginTop: 6,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    emptyText: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

export default NotificationsScreen;

