import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  FlatList,
  ScrollView,
  Share,
  Image,
  TouchableOpacity,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeableAnnouncementModal from '../components/SwipeableAnnouncementModal';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onLogout: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

interface DashboardData {
  user: {
    name: string;
    email: string;
    phone: string;
    photo_url: string | null;
    rt_id: number;
    rt_number?: string;
    rw_name?: string;
    role: string;
  };
  iuran_status: 'LUNAS' | 'BELUM_LUNAS';
  announcements: Array<{
    id: number;
    title: string;
    content: string;
    category?: string;
    image_url: string | null;
    created_at: string;
    is_liked?: boolean;
    likes_count?: number;
    comments_count?: number;
  }>;
}

// --- Helpers & Memoized Components ---

const PAGE_SIZE = 8; // 4 rows x 2 cols

const chunkArray = (array: any[], size: number) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const MenuItem = React.memo(({ item, onPress, styles, isDarkMode, colors }: any) => {
  if (item.empty) {
    return <View style={styles.menuItem} />;
  }
  return (
    <View style={styles.menuItem}>
      <TouchableOpacity 
        onPress={onPress}
        style={styles.menuItemTouch}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <item.library name={item.icon} size={28} color={colors.primary} />
        </View>
        <Text style={styles.menuLabel} numberOfLines={2}>{item.title}</Text>
      </TouchableOpacity>
    </View>
  );
}, (prev, next) => prev.item.title === next.item.title && prev.styles === next.styles && prev.isDarkMode === next.isDarkMode && prev.colors === next.colors);

const AnnouncementItem = React.memo(({ item, index, onNavigate, onLongPress, onLike, onComment, styles, colors, t }: any) => {
  const cardColors = ['#f59e0b', '#3b82f6', '#a855f7'];
  const color = cardColors[index % cardColors.length];
  
  return (
    <View style={styles.announcementCard}>
      {/* Instagram Header: Avatar + Username + More */}
      <View style={styles.instaHeader}>
        <View style={styles.instaUserContainer}>
          <View style={[styles.instaAvatar, { backgroundColor: color }]}>
            <Text style={styles.instaAvatarText}>{item.category ? item.category.charAt(0) : 'A'}</Text>
          </View>
          <View>
            <Text style={styles.instaUsername}>{item.category || 'Admin RT'}</Text>
            <Text style={styles.instaLocation}>{t('home.roles.admin_rt')}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onLongPress(item, color)}>
          <MaterialCommunityIcons name="dots-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Instagram Image */}
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => onNavigate('ANNOUNCEMENT_DETAIL', item)}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.instaImage} />
        ) : (
          <View style={[styles.instaPlaceholder, { backgroundColor: color + '20' }]}>
             <MaterialCommunityIcons name="image-outline" size={48} color={color} />
          </View>
        )}
      </TouchableOpacity>

      {/* Instagram Action Bar */}
      <View style={styles.instaActions}>
        <View style={styles.instaActionsLeft}>
          <TouchableOpacity onPress={() => onLike(item)}>
            <Ionicons name={item.is_liked ? "heart" : "heart-outline"} size={28} color={item.is_liked ? "#ef4444" : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onComment(item.id)}>
            <Ionicons name="chatbubble-outline" size={26} color={colors.text} style={{ transform: [{rotate: '-90deg'}] }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="paper-plane-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
           <Ionicons name="bookmark-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Instagram Content */}
      <View style={styles.instaContent}>
        <Text style={styles.instaLikes}>
          {item.likes_count || 0} {t('home.likes')}
        </Text>
        
        <Text style={styles.instaCaption} numberOfLines={2}>
          <Text style={styles.instaUsernameCaption}>{item.category || 'Admin RT'} </Text>
          {item.title} - {item.content}
        </Text>

        {item.comments_count > 0 && (
          <TouchableOpacity onPress={() => onComment(item.id)}>
            <Text style={styles.instaViewComments}>
              {t('home.viewAllComments')} {item.comments_count}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.instaDate}>{item.created_at}</Text>
      </View>
    </View>
  );
}, (prev, next) => prev.item === next.item && prev.styles === next.styles && prev.colors === next.colors && prev.t === next.t);

const getRoleLabel = (role: string, t: any) => {
  switch (role) {
    case 'ADMIN_RT': return t('home.roles.admin_rt');
    case 'RT': return t('home.roles.admin_rt'); // Use same label for RT
    case 'WARGA': return t('home.roles.warga');
    case 'SECRETARY': return t('home.roles.secretary');
    case 'TREASURER': return t('home.roles.treasurer');
    case 'OFFICER': return t('home.roles.officer');
    default: return role || t('home.roles.warga');
  }
};

const DashboardSummary = React.memo(({ data, onNavigate, menuItems, styles, colors, inviteCode, onShareInvite, isDarkMode, greeting, activeTab, setActiveTab, t, language }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Animation for Unpaid Status
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse Animation Effect
  useEffect(() => {
    if (data?.iuran_status && data.iuran_status !== 'LUNAS') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    return () => pulseAnim.stopAnimation();
  }, [data?.iuran_status]);

  const menuPages = useMemo(() => {
    const items = [...menuItems];
    return chunkArray(items, 8);
  }, [menuItems]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / width);
    setCurrentPage(pageIndex);
  };

  const getIndonesianPeriod = () => {
    const date = new Date();
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
  };

  const getDueDate = () => {
    const date = new Date();
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const currentPeriod = useMemo(() => getIndonesianPeriod(), [language]);
  const dueDate = useMemo(() => getDueDate(), [language]);

  return (
    <View>
      {/* Clean Digital Bank Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <DemoLabel />
          <Text style={styles.greeting}>{greeting}</Text>
          <View>
            <Text style={styles.userName} numberOfLines={1}>{data?.user?.name || t('home.roles.warga')}</Text>
            <View style={{ 
              backgroundColor: colors.primaryLight, 
              alignSelf: 'flex-start',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
              marginTop: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Text style={{ 
                fontSize: 10, 
                color: colors.primary, 
                fontWeight: '700' 
              }}>
                {getRoleLabel(data?.user?.role, t)}
              </Text>
              {(data?.user?.rt_number || data?.user?.rw_name) && (
                <Text style={{ 
                  fontSize: 10, 
                  color: colors.primary, 
                  fontWeight: '700',
                  marginLeft: 4
                }}>
                  {`• RT ${data?.user?.rt_number || '-'} / ${data?.user?.rw_name || '-'}`}
                </Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => Alert.alert(t('common.info'), t('home.noNotifications'))}
            activeOpacity={0.7}
          >
             <Ionicons name="notifications-outline" size={24} color={isDarkMode ? "#fff" : "#1e293b"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => onNavigate('SETTINGS')}
            activeOpacity={0.7}
          >
             <Ionicons name="settings-outline" size={24} color={isDarkMode ? "#fff" : "#1e293b"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Status Card - Focus Point */}
      <View style={styles.statusCardWrapper}>
        <View style={[styles.statusCard, { backgroundColor: colors.primary }]}>
          <View style={styles.statusCardTop}>
            <View>
              <Text style={styles.statusCardLabel}>{t('home.contributionStatus')} {currentPeriod}</Text>
              <Text style={styles.statusCardValue}>
                {data?.iuran_status === 'LUNAS' ? t('home.paid') : t('home.unpaid')}
              </Text>
              <Text style={[styles.statusCardDate, { marginTop: 4, opacity: 0.9 }]}>{t('home.dueDate')}: {dueDate}</Text>
            </View>
            <TouchableOpacity 
              style={styles.statusCardIcon}
              disabled={data?.iuran_status === 'LUNAS'}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  'Status Iuran',
                  'Masih ada iuran yang belum lunas. Mohon segera lakukan pembayaran.',
                  [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Bayar Sekarang', onPress: () => onNavigate('PAYMENT') }
                  ]
                );
              }}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                 <Ionicons name={data?.iuran_status === 'LUNAS' ? "checkmark-circle" : "alert-circle"} size={24} color="#fff" />
               </Animated.View>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.statusCardBottom, { justifyContent: 'flex-end' }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {data?.iuran_status !== 'LUNAS' && (
                <TouchableOpacity 
                  onPress={() => onNavigate('BILLS', { initialTab: 'history' })}
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    paddingHorizontal: 12, 
                    paddingVertical: 8, 
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Ionicons name="time-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('home.paymentHistory')}</Text>
                </TouchableOpacity>
              )}

              {data?.iuran_status !== 'LUNAS' ? (
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => onNavigate('PAYMENT')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.payButtonText}>{t('home.payNow')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => onNavigate('BILLS', { initialTab: 'history' })}
                  activeOpacity={0.9}
                >
                  <Text style={styles.payButtonText}>{t('home.viewDetails')}</Text>
                  <Ionicons name="list-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {inviteCode && (
        <TouchableOpacity 
          style={styles.inviteCard}
          onPress={onShareInvite}
          activeOpacity={0.9}
        >
          <View>
            <Text style={styles.inviteLabel}>{t('home.inviteCode')}</Text>
            <Text style={styles.inviteCode}>{inviteCode}</Text>
          </View>
          <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Services Grid - Clean Layout */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>{t('home.mainServices')}</Text>
      </View>
      
      <View style={styles.menuContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ width: width }}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {menuPages.map((page: any[], pageIndex: number) => (
            <View key={pageIndex} style={[styles.menuPage, { width: width, paddingHorizontal: 24 }]}>
              <View style={styles.menuGrid}>
                {page.map((item: any, index: number) => (
                  <MenuItem 
                    key={index} 
                    item={item} 
                    onPress={item.action} 
                    styles={styles}
                    isDarkMode={isDarkMode}
                    colors={colors}
                  />
                ))}
                {Array.from({ length: 8 - page.length }).map((_, i) => (
                   <View key={`empty-${i}`} style={styles.menuItem} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        
        {menuPages.length > 1 && (
          <View style={styles.paginationContainer}>
            {menuPages.map((_: any, index: number) => (
              <View 
                key={index} 
                style={[
                  styles.paginationDot, 
                  { 
                    backgroundColor: currentPage === index ? colors.primary : '#e2e8f0',
                    width: currentPage === index ? 20 : 6 
                  }
                ]} 
              />
            ))}
          </View>
        )}
      </View>

      {/* Announcements Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>{t('home.latestInfo')}</Text>
        <TouchableOpacity onPress={() => onNavigate('INFORMATION')}>
           <Text style={styles.seeAllLink}>{t('home.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 8 }}
      >
        {[
          { id: 'all', label: t('home.tabs.all') },
          { id: 'announcement', label: t('home.tabs.announcement') },
          { id: 'security', label: t('home.tabs.security') },
          { id: 'activity', label: t('home.tabs.activity') }
        ].map((tab) => (
            <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: activeTab === tab.id ? colors.primary : (isDarkMode ? '#1e293b' : '#f1f5f9'),
                    borderWidth: 1,
                    borderColor: activeTab === tab.id ? colors.primary : (isDarkMode ? '#334155' : '#e2e8f0'),
                }}
            >
                <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: activeTab === tab.id ? '#fff' : colors.textSecondary
                }}>{tab.label}</Text>
            </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}, (prev, next) => prev.data === next.data && prev.colors === next.colors && prev.styles === next.styles && prev.inviteCode === next.inviteCode && prev.isDarkMode === next.isDarkMode && prev.greeting === next.greeting && prev.activeTab === next.activeTab);

// --- Main Component ---

import CommentModal from '../components/CommentModal';
import { FloatingAssistant } from '../components/FloatingAssistant';

export default function HomeScreen({ onLogout, onNavigate }: HomeScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();

  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [hiddenAnnouncements, setHiddenAnnouncements] = useState<number[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [selectedAnnouncementColor, setSelectedAnnouncementColor] = useState('#3b82f6');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const { isDemo, isTrial } = useTenant();

  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  // Modal States
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<number | null>(null);

  const handleOpenComments = useCallback((announcementId: number) => {
    setSelectedAnnouncementId(announcementId);
    setCommentModalVisible(true);
  }, []);

  useEffect(() => {
    loadHiddenAnnouncements();
    updateGreeting();
    fetchDashboard();
  }, [language]);

  const loadHiddenAnnouncements = async () => {
    try {
      const stored = await AsyncStorage.getItem('hidden_announcements');
      if (stored) {
        setHiddenAnnouncements(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading hidden announcements:', error);
    }
  };

  const handleOpenHideModal = useCallback((item: any, color: string) => {
    setSelectedAnnouncement(item);
    setSelectedAnnouncementColor(color);
  }, []);

  const handleDeleteAnnouncement = async () => {
    if (selectedAnnouncement) {
      const newHidden = [...hiddenAnnouncements, selectedAnnouncement.id];
      setHiddenAnnouncements(newHidden);
      await AsyncStorage.setItem('hidden_announcements', JSON.stringify(newHidden));
      setSelectedAnnouncement(null);
    }
  };

  const handleLike = useCallback(async (item: any) => {
    try {
      // Optimistic update
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          announcements: prev.announcements.map(a => 
            a.id === item.id 
              ? { ...a, is_liked: !a.is_liked, likes_count: (a.likes_count || 0) + (a.is_liked ? -1 : 1) }
              : a
          )
        };
      });
      
      await api.post(`/announcements/${item.id}/like`);
    } catch (error) {
      console.log('Error liking announcement:', error);
      fetchDashboard(); // Revert on error
    }
  }, []);

  const handleShareInvite = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `${t('home.joinCodeMsg')} ${inviteCode}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const dashboardRes = await api.get('/warga/dashboard');
      if (!dashboardRes.data?.success) {
        throw new Error('Failed to load dashboard');
      }

      const dashboardData = dashboardRes.data.data;
      const userData = dashboardData.user;

      if (['ADMIN_RT', 'SECRETARY', 'TREASURER'].includes(userData.role)) {
        try {
           const inviteRes = await api.get('/rt/invite-code');
           setInviteCode(inviteRes.data.data.code);
        } catch (e) {
           console.log('Error fetching invite code', e);
        }
      }

      setData({
        user: userData,
        iuran_status: dashboardData.iuran_status || 'LUNAS',
        announcements: dashboardData.announcements || []
      });

    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        console.log('Session expired, logging out...');
        Alert.alert(
          t('common.sessionExpired'), 
          t('common.sessionExpiredMsg'),
          [{ text: t('common.ok'), onPress: onLogout }]
        );
      } else {
        console.log('Error fetching dashboard:', error.message || error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting(t('home.goodMorning'));
    else if (hour < 15) setGreeting(t('home.goodAfternoon'));
    else if (hour < 19) setGreeting(t('home.goodEvening'));
    else setGreeting(t('home.goodNight'));
  };

  const checkRestriction = (action: () => void, type: 'write' | 'billing') => {
    action();
  };

  const menuItems = useMemo(() => {
    const items = [
      { title: t('home.menus.bills'), icon: 'stats-chart-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('FINANCE_REPORT'), 'billing') },
      { title: t('home.menus.report'), icon: 'megaphone-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('REPORT'), 'write') },
      { title: t('home.menus.letter'), icon: 'document-text-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('LETTER'), 'write') },
      { title: t('home.menus.patrol'), icon: 'shield-outline', library: Ionicons, action: () => onNavigate('PATROL') },
      { title: t('home.menus.warga'), icon: 'people-outline', library: Ionicons, action: () => onNavigate('WARGA_LIST') },
      { title: t('home.menus.boarding'), icon: 'business-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('BOARDING'), 'write') },
      { title: t('home.menus.inventory'), icon: 'cube-outline', library: Ionicons, action: () => onNavigate('INVENTORY') },
      { title: t('home.menus.guest'), icon: 'person-add-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('GUEST'), 'write') },
      { title: t('home.menus.voting'), icon: 'vote-outline', library: MaterialCommunityIcons, action: () => checkRestriction(() => onNavigate('POLLING'), 'write') },
      { title: t('home.menus.market'), icon: 'storefront-outline', library: Ionicons, action: () => onNavigate('MARKET') },
      { title: t('home.menus.cctv'), icon: 'videocam-outline', library: Ionicons, action: () => onNavigate('CCTV') },
      { title: t('home.menus.announcement'), icon: 'newspaper-outline', library: Ionicons, action: () => onNavigate('INFORMATION') },
    ];

    if (data?.user?.role === 'ADMIN_RT' || data?.user?.role === 'RT') {
      items.push({ 
        title: t('home.menus.bansos'), 
        icon: 'gift-outline', 
        library: Ionicons, 
        action: () => onNavigate('BANSOS') 
      });

      // System Settings for RT
      items.push({ 
        title: t('home.menus.systemSettings'), 
        icon: 'settings-outline', 
        library: Ionicons, 
        action: () => onNavigate('SYSTEM_SETTINGS') 
      });
    }

    return items;
  }, [onNavigate, isDemo, isTrial, language, data?.user?.role]);

  const filteredAnnouncements = useMemo(() => {
    if (!data?.announcements) return [];
    
    let filtered = data.announcements.filter(a => !hiddenAnnouncements.includes(a.id));

    if (activeTab !== 'all') {
        const categoryMap: Record<string, string> = {
            'announcement': 'announcement',
            'security': 'security',
            'event': 'event',
            'activity': 'event' // Handle potential alias
        };
        const targetCategory = categoryMap[activeTab];
        // If category is null/undefined in DB, treat as 'announcement'
        filtered = filtered.filter(a => (a.category || 'announcement') === targetCategory);
    }

    return filtered;
  }, [data?.announcements, hiddenAnnouncements, activeTab]);

  const renderItem = useCallback(({ item, index }: any) => (
    <AnnouncementItem 
        item={item} 
        index={index}
        onNavigate={onNavigate}
        onLongPress={handleOpenHideModal}
        onLike={handleLike}
        onComment={handleOpenComments}
        styles={styles}
        colors={colors}
        t={t}
    />
  ), [onNavigate, handleOpenHideModal, handleLike, handleOpenComments, styles, colors, t]);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text, marginBottom: 12 }}>{t('home.loadingFailed')}</Text>
          <TouchableOpacity 
            style={{ padding: 12, borderRadius: 12, minWidth: 120, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
            onPress={fetchDashboard}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('home.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? '#0f172a' : '#f8f9fa'} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          contentContainerStyle={styles.scrollContent}
          data={filteredAnnouncements}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            <DashboardSummary 
                data={data} 
                onNavigate={onNavigate} 
                menuItems={menuItems} 
                styles={styles} 
                colors={colors}
                inviteCode={inviteCode}
                onShareInvite={handleShareInvite}
                isDarkMode={isDarkMode}
                greeting={greeting}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                t={t}
                language={language}
             />
           }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('home.noAnnouncements')}</Text>
            </View>
          }
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#fff"
              progressBackgroundColor={colors.card}
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </SafeAreaView>

      <SwipeableAnnouncementModal 
        visible={!!selectedAnnouncement}
        item={selectedAnnouncement}
        color={selectedAnnouncementColor}
        onClose={() => setSelectedAnnouncement(null)}
        onDelete={handleDeleteAnnouncement}
      />

      <CommentModal 
        visible={commentModalVisible}
        announcementId={selectedAnnouncementId}
        onClose={() => setCommentModalVisible(false)}
      />

      <FloatingAssistant onPress={() => onNavigate('HELP_SUPPORT')} />
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  
  // Status Card
  statusCardWrapper: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statusCard: {
    borderRadius: 24,
    padding: 20,
    // Add subtle gradient effect visually or via shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statusCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  statusCardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  statusCardValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusCardDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  statusCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Invite Card
  inviteCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    borderStyle: 'dashed',
  },
  inviteLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  
  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Menu Grid
  menuContainer: {
    marginBottom: 24,
  },
  menuPage: {
    // width is set dynamically
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16, // Use gap for spacing
  },
  menuItem: {
    width: (width - 48 - 16 * 3) / 4, // (Screen - padding - gaps) / 4
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemTouch: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuLabel: {
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  
  // Announcement Card (Instagram Style)
  announcementCard: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    marginBottom: 24, // Spacing between posts
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
    // On mobile, often no side margins for full bleed, or small margins
    // Let's keep small margins for "Card" feel, or remove for full "Feed" feel
    // User asked for "Card" like Instagram, but Instagram is usually full width. 
    // I'll stick to a slightly contained card look as it fits the app structure better.
    marginHorizontal: 0, 
    paddingVertical: 0,
  },
  
  // Header
  instaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  instaUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instaAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  instaUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  instaLocation: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Image
  instaImage: {
    width: '100%',
    aspectRatio: 1, // Square or 4/5. 1 is safe.
    resizeMode: 'cover',
  },
  instaPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Actions
  instaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  instaActionsLeft: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },

  // Content
  instaContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  instaLikes: {
    fontWeight: 'bold',
    color: colors.text,
    fontSize: 14,
    marginBottom: 6,
  },
  instaCaption: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  instaUsernameCaption: {
    fontWeight: 'bold',
  },
  instaViewComments: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 14,
  },
  instaDate: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
