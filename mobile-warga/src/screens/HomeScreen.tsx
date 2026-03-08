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
import api, { getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeableAnnouncementModal from '../components/SwipeableAnnouncementModal';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel, TrialBanner } from '../components/TenantStatusComponents';

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
  is_juragan?: boolean;
  is_anak_kost?: boolean;
  iuran_status: 'LUNAS' | 'BELUM_LUNAS';
  unread_notifications_count: number;
  has_emergency: boolean;
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
  polls: Array<{
    id: number;
    title: string;
    description: string;
    end_date: string;
    status: string;
    start_date: string;
    is_voted: boolean;
    total_votes: number;
    type?: 'poll';
  }>;
}

// --- Helpers & Memoized Components ---

const PAGE_SIZE = 8;
const HOME_MENU_STORAGE_KEY = 'home_menu_selection_v1';

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

const PollItem = React.memo(({ item, onNavigate, styles, colors, t }: any) => {
  const isExpired = new Date(item.end_date) < new Date();
  const isClosed = item.status === 'CLOSED' || isExpired;

  return (
    <TouchableOpacity 
      style={styles.announcementCard}
      onPress={() => onNavigate('POLLING')}
      activeOpacity={0.9}
    >
      <View style={styles.instaHeader}>
        <View style={styles.instaUserContainer}>
          <View style={[styles.instaAvatar, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="vote-outline" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.instaUsername}>Voting Warga</Text>
            <Text style={styles.instaLocation}>{isClosed ? 'Selesai' : 'Sedang Berlangsung'}</Text>
          </View>
        </View>
        <View style={{ 
          backgroundColor: isClosed ? '#64748B20' : '#05966920', 
          paddingHorizontal: 8, 
          paddingVertical: 4, 
          borderRadius: 12 
        }}>
          <Text style={{ 
            fontSize: 10, 
            fontWeight: 'bold', 
            color: isClosed ? '#64748B' : '#059669' 
          }}>
            {isClosed ? 'CLOSED' : 'OPEN'}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }} numberOfLines={3}>
          {item.description}
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.total_votes} Partisipan</Text>
          </View>
          
          {item.is_voted ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Sudah Memilih</Text>
            </View>
          ) : (
             !isClosed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>Vote Sekarang</Text>
              </View>
             )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => prev.item === next.item && prev.styles === next.styles && prev.colors === next.colors && prev.t === next.t);

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
          <Image source={{ uri: (getStorageUrl(item.image_url) || 'https://via.placeholder.com/300') as string }} style={styles.instaImage} />
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
            <Ionicons name={item.is_liked ? "heart" : "heart-outline"} size={24} color={item.is_liked ? "#ef4444" : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onComment(item.id)}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.text} style={{ transform: [{rotate: '-90deg'}] }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
           <Ionicons name="bookmark-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Instagram Content */}
      <View style={styles.instaContent}>
        <Text style={styles.instaLikes}>
          {item.likes_count || 0} {t('home.likes')}
        </Text>
        
        <Text style={styles.instaCaption} numberOfLines={2}>
          <Text style={styles.instaUsernameCaption}>{item.category || 'Admin RT'} </Text>
          {item.content}
        </Text>

        {item.comments_count > 0 && (
          <TouchableOpacity onPress={() => onComment(item.id)}>
            <Text style={styles.instaViewComments}>
              {t('home.viewAllComments')}
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

const DashboardSummary = React.memo(({ data, onNavigate, menuItems, styles, colors, inviteCode, onShareInvite, isDarkMode, greeting, activeTab, setActiveTab, t, language, onOpenFeatureSettings, refreshing, onRefresh }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Animation for Unpaid Status
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const emergencyPulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse Animation Effect for Unpaid Status
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
    let items = [...menuItems];
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
    <View style={{ flex: 1 }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      {/* Banner placed absolutely at top */}
      {/* TrialBanner removed from here to prevent duplication */}

      
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 120 }} // Add bottom padding for scroll
      >
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
                  {(() => {
                    const rtNumber = Number(data?.user?.rt_number || 0);
                    const rtLabel = rtNumber > 0 ? String(rtNumber).padStart(3, '0') : '-';
                    return `• RT ${rtLabel} / ${data?.user?.rw_name || '-'}`;
                  })()}
                </Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => onNavigate('NOTIFICATIONS')}
            activeOpacity={0.7}
          >
             <Animated.View style={{ transform: [{ scale: emergencyPulseAnim }] }}>
               <Ionicons name="notifications-outline" size={24} color={isDarkMode ? "#fff" : "#1e293b"} />
               {data && data.unread_notifications_count && data.unread_notifications_count > 0 ? (
                 <View style={[styles.badgeContainer, data?.has_emergency && { backgroundColor: '#ef4444' }]}>
                   <Text style={styles.badgeText}>
                     {data.unread_notifications_count > 99 ? '99+' : data.unread_notifications_count}
                   </Text>
                 </View>
               ) : null}
             </Animated.View>
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
            <View style={styles.statusCardIcon}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                 <Ionicons name={data?.iuran_status === 'LUNAS' ? "checkmark-circle" : "alert-circle"} size={24} color="#fff" />
               </Animated.View>
            </View>
          </View>
          
          <View style={styles.statusCardBottom}>
            <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
              {data?.iuran_status !== 'LUNAS' ? (
                <TouchableOpacity 
                  onPress={() => onNavigate('BILLS', { initialTab: 'history' })}
                  style={styles.secondaryButton}
                >
                  <Ionicons name="time-outline" size={18} color="#fff" />
                  <Text style={styles.secondaryButtonText}>{t('home.paymentHistory')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => onNavigate('BILLS', { initialTab: 'history' })}
                  style={styles.secondaryButton}
                >
                  <Ionicons name="list-outline" size={18} color="#fff" />
                  <Text style={styles.secondaryButtonText}>{t('home.viewDetails')}</Text>
                </TouchableOpacity>
              )}

              {data?.iuran_status !== 'LUNAS' ? (
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => onNavigate('PAYMENT')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                  <Text style={styles.payButtonText}>{t('home.payNow')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => onNavigate('PAYMENT')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                  <Text style={styles.payButtonText}>Bayar Iuran</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {inviteCode && !['WARGA', 'WARGA_TETAP', 'WARGA TETAP'].includes(data?.user?.role) && (
        <View style={styles.inviteSectionWrapper}>
          <TouchableOpacity 
            style={styles.inviteCardModern}
            onPress={onShareInvite}
            activeOpacity={0.8}
          >
            <View style={styles.inviteLeftDecoration} />
            <View style={styles.inviteContentModern}>
               <View style={styles.inviteTextContainer}>
                  <Text style={styles.inviteTitleModern}>{t('home.inviteCode')}</Text>
                  <Text style={styles.inviteSubtitleModern}>Bagikan kode ini ke warga baru</Text>
               </View>
               <View style={styles.inviteCodeContainerModern}>
                  <Text style={styles.inviteCodeTextModern}>{inviteCode}</Text>
                  <Ionicons name="copy-outline" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
               </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>{t('home.mainServices')}</Text>
        <TouchableOpacity onPress={onOpenFeatureSettings}>
          <View style={styles.featureConfigButton}>
            <Ionicons name="apps-outline" size={16} color={colors.primary} />
            <Text style={styles.featureConfigButtonText}>Atur fitur</Text>
          </View>
        </TouchableOpacity>
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
          { id: 'poll', label: 'Voting' },
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
      {/* End Main ScrollView */}
      </ScrollView>
    </View>
  );
}, (prev, next) => prev.data === next.data && prev.colors === next.colors && prev.styles === next.styles && prev.inviteCode === next.inviteCode && prev.isDarkMode === next.isDarkMode && prev.greeting === next.greeting && prev.activeTab === next.activeTab);

// --- Main Component ---

import CommentModal from '../components/CommentModal';
import { FloatingAssistant } from '../components/FloatingAssistant';

function HomeScreen({ onLogout, onNavigate }: HomeScreenProps) {
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
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[] | null>(null);
  const [featureConfigVisible, setFeatureConfigVisible] = useState(false);
  const [draftMenuIds, setDraftMenuIds] = useState<string[]>([]);

  const { isDemo, isTrial, isExpired } = useTenant();

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
    // fetchDashboard(); // Moved to useFocusEffect
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      // Optional: refreshStatus() if needed from context
    }, [])
  );

  useEffect(() => {
    const loadMenuSelection = async () => {
      try {
        const stored = await AsyncStorage.getItem(HOME_MENU_STORAGE_KEY);
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            setSelectedMenuIds(ids);
          }
        }
      } catch (error) {
        console.log('Error loading home menu selection:', error);
      }
    };
    loadMenuSelection();
  }, []);

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
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpiredAdmin'));
      return;
    }
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
          ),
          polls: prev.polls || []
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

  const fetchDashboardLegacy = async () => {
    try {
      const [meRes, announcementsRes] = await Promise.all([
        api.get('/me'),
        api.get('/announcements', { params: { limit: 5 } }),
      ]);

      const userPayload = meRes.data;
      const userSuccess = typeof userPayload?.success === 'boolean' ? userPayload.success : true;
      if (!userSuccess || !userPayload?.data) {
        throw new Error(userPayload?.message || 'Failed to load user profile');
      }

      const userData = userPayload.data;

      const announcementsPayload = announcementsRes.data;
      let announcements: any[] = [];
      if (announcementsPayload?.success) {
        const result = announcementsPayload.data;
        if (Array.isArray(result)) {
          announcements = result;
        } else if (result && Array.isArray(result.data)) {
          announcements = result.data;
        }
      }

      setData({
        user: userData,
        iuran_status: userData.iuran_status || 'LUNAS',
        announcements,
        polls: [],
        unread_notifications_count: 0,
        has_emergency: false,
      });
    } catch (e) {
      throw e;
    }
  };

  const fetchDashboard = async () => {
    try {
      const [dashboardRes, pollsRes] = await Promise.all([
        api.get('/warga/dashboard'),
        api.get('/polls')
      ]);

      const payload = dashboardRes.data;
      const isSuccess = typeof payload?.success === 'boolean' ? payload.success : true;
      if (!isSuccess || !payload?.data) {
        throw new Error(payload?.message || 'Failed to load dashboard');
      }

      const dashboardData = payload.data;
      const userData = dashboardData.user || payload.user;

      const polls = pollsRes.data?.data || [];

      if (['ADMIN_RT', 'RT', 'SECRETARY', 'TREASURER'].includes(userData.role)) {
        try {
          const inviteRes = await api.get('/rt/invite-code');
          const payload = inviteRes.data;
          const data = payload?.data || payload;
          const code = data?.invite_code || data?.code || null;
          if (code) {
            setInviteCode(code);
          } else {
            console.log('Invite code not found in response payload');
          }
        } catch (e) {
          console.log('Error fetching invite code', e);
        }
      }

      setData({
        user: userData,
        is_juragan: dashboardData.is_juragan || false,
        is_anak_kost: dashboardData.is_anak_kost || false,
        iuran_status: dashboardData.iuran_status || 'LUNAS',
        unread_notifications_count: dashboardData.unread_notifications_count || 0,
        announcements: dashboardData.announcements || [],
        polls: polls,
        has_emergency: dashboardData.has_emergency || false,
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
        try {
          await fetchDashboardLegacy();
          return;
        } catch (fallbackError: any) {
          console.log('Fallback dashboard load failed:', fallbackError.message || fallbackError);
        }
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
    if (isExpired) {
      Alert.alert(t('report.accessLimited'), t('report.trialExpiredAdmin'));
      return;
    }
    action();
  };

  const allMenuItems = useMemo(() => {
    let items = [
      { id: 'bills', title: t('home.menus.bills'), icon: 'stats-chart-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('FINANCE_REPORT'), 'billing') },
      { id: 'contribution_report', title: t('home.menus.contributionReport'), icon: 'receipt-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('CONTRIBUTION_REPORT'), 'billing') },
      { id: 'report', title: t('home.menus.report'), icon: 'megaphone-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('REPORT'), 'write') },
      { id: 'letter', title: t('home.menus.letter'), icon: 'document-text-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('LETTER'), 'write') },
      { id: 'patrol', title: t('home.menus.patrol'), icon: 'shield-outline', library: Ionicons, action: () => onNavigate('PATROL') },
      { id: 'warga', title: t('home.menus.warga'), icon: 'people-outline', library: Ionicons, action: () => onNavigate('WARGA_LIST') },
      { id: 'boarding', title: t('home.menus.boarding'), icon: 'business-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('BOARDING'), 'write') },
      { id: 'inventory', title: t('home.menus.inventory'), icon: 'cube-outline', library: Ionicons, action: () => onNavigate('INVENTORY') },
      { id: 'guest', title: t('home.menus.guest'), icon: 'person-add-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('GUEST'), 'write') },
      { id: 'voting', title: t('home.menus.voting'), icon: 'vote-outline', library: MaterialCommunityIcons, action: () => checkRestriction(() => onNavigate('POLLING'), 'write') },
      { id: 'market', title: t('home.menus.market'), icon: 'storefront-outline', library: Ionicons, action: () => onNavigate('MARKET') },
      { id: 'cctv', title: t('home.menus.cctv'), icon: 'videocam-outline', library: Ionicons, action: () => onNavigate('CCTV') },
      { id: 'announcement', title: t('home.menus.announcement'), icon: 'newspaper-outline', library: Ionicons, action: () => onNavigate('INFORMATION') },
    ];

    const userRole = data?.user?.role?.toUpperCase() || '';

    // Filter announcement and voting for WARGA/WARGA_TETAP
          if (userRole === 'WARGA' || userRole === 'WARGA_TETAP' || userRole === 'WARGA TETAP') {
            items = items.filter(item => item.id !== 'announcement' && item.id !== 'voting' && item.id !== 'system_settings' && item.id !== 'bansos' && item.id !== 'contribution_report');
          }

          // Management Kost Menu Visibility
          // Show only if: RT/Admin OR Owner (Juragan) OR Tenant (Anak Kost)
          const isJuragan = data?.is_juragan || false;
          const isAnakKost = data?.is_anak_kost || false;
          const isRT = userRole === 'RT' || userRole === 'ADMIN_RT';

          if (!isJuragan && !isAnakKost && !isRT) {
             items = items.filter(item => item.id !== 'boarding');
          }

          if (userRole === 'ADMIN_RT' || userRole === 'RT') {
      items.push({ 
        id: 'bansos',
        title: t('home.menus.bansos'), 
        icon: 'gift-outline', 
        library: Ionicons, 
        action: () => onNavigate('BANSOS') 
      });

      items.push({ 
        id: 'system_settings',
        title: t('home.menus.systemSettings'), 
        icon: 'settings-outline', 
        library: Ionicons, 
        action: () => onNavigate('SYSTEM_SETTINGS') 
      });

      items.push({ 
        id: 'billing',
        title: t('home.menus.billing'), 
        icon: 'card-outline', 
        library: Ionicons, 
        action: () => onNavigate('BILLING') 
      });
    }

    return items;
  }, [onNavigate, isDemo, isTrial, language, data?.user?.role, data?.is_juragan, data?.is_anak_kost]);

  const menuItems = useMemo(() => {
    if (!selectedMenuIds || selectedMenuIds.length === 0) {
      return allMenuItems;
    }
    const idSet = new Set(selectedMenuIds);
    const selected = allMenuItems.filter(item => idSet.has(item.id));
    if (selected.length === 0) {
      return allMenuItems;
    }
    return selected;
  }, [allMenuItems, selectedMenuIds]);

  const handleOpenFeatureConfig = useCallback(() => {
    const baseIds = allMenuItems.map(item => item.id);
    const current = selectedMenuIds && selectedMenuIds.length > 0 ? selectedMenuIds : baseIds;
    const filtered = current.filter(id => baseIds.includes(id));
    const next = filtered.length > 0 ? filtered : baseIds;
    setDraftMenuIds(next);
    setFeatureConfigVisible(true);
  }, [allMenuItems, selectedMenuIds]);

  const handleCloseFeatureConfig = () => {
    setFeatureConfigVisible(false);
  };

  const handleToggleDraftMenu = (id: string) => {
    setDraftMenuIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      }
      return [...prev, id];
    });
  };

  const isDraftChanged = useMemo(() => {
    const baseIds = selectedMenuIds && selectedMenuIds.length > 0 ? selectedMenuIds : allMenuItems.map(item => item.id);
    if (draftMenuIds.length !== baseIds.length) {
      return true;
    }
    for (let i = 0; i < draftMenuIds.length; i += 1) {
      if (draftMenuIds[i] !== baseIds[i]) {
        return true;
      }
    }
    return false;
  }, [allMenuItems, draftMenuIds, selectedMenuIds]);

  const handleSaveFeatureConfig = async () => {
    try {
      const idsToSave = draftMenuIds.length > 0 ? draftMenuIds : allMenuItems.map(item => item.id);
      await AsyncStorage.setItem(HOME_MENU_STORAGE_KEY, JSON.stringify(idsToSave));
      setSelectedMenuIds(idsToSave);
      setFeatureConfigVisible(false);
    } catch (error) {
      console.log('Error saving home menu selection:', error);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    let items: any[] = [];
    
    // Add Announcements
    if (data?.announcements) {
        items = [...items, ...data.announcements.map(a => ({ ...a, type: 'announcement' }))];
    }

    // Add Polls
    if (data?.polls) {
        items = [...items, ...data.polls.map(p => ({ ...p, type: 'poll', created_at: p.start_date }))];
    }
    
    // Sort by Date (Newest First)
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Filter Hidden
    items = items.filter(item => !hiddenAnnouncements.includes(item.id));

    if (activeTab !== 'all') {
        if (activeTab === 'poll') {
            items = items.filter(item => item.type === 'poll');
        } else {
            const categoryMap: Record<string, string> = {
                'announcement': 'announcement',
                'security': 'security',
                'event': 'event',
                'activity': 'event'
            };
            const targetCategory = categoryMap[activeTab];
            items = items.filter(item => item.type === 'announcement' && (item.category || 'announcement') === targetCategory);
        }
    }

    return items;
  }, [data?.announcements, data?.polls, hiddenAnnouncements, activeTab]);

  const renderItem = useCallback(({ item, index }: any) => {
    if (item.type === 'poll') {
        return (
            <PollItem 
                item={item} 
                onNavigate={onNavigate}
                styles={styles}
                colors={colors}
                t={t}
            />
        );
    }

    return (
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
    );
  }, [onNavigate, handleOpenHideModal, handleLike, handleOpenComments, styles, colors, t]);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      {/* TrialBanner removed from here. Handled globally in App.tsx */}

      <View style={{ flex: 1 }}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 0 }} // Header handles top padding
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
                onOpenFeatureSettings={handleOpenFeatureConfig}
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
              progressViewOffset={50} // Offset for refresh spinner
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </View>

      {featureConfigVisible && (
        <View style={styles.featureConfigOverlay}>
          <SafeAreaView style={styles.featureConfigContainer}>
            <View style={styles.featureConfigHeader}>
              <TouchableOpacity onPress={handleCloseFeatureConfig} style={styles.featureHeaderBack} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#e5e7eb' : '#0f172a'} />
              </TouchableOpacity>
              <View style={styles.featureHeaderTitleContainer}>
                <Text style={styles.featureHeaderTitle}>Atur fitur</Text>
                <Text style={styles.featureHeaderSubtitle}>Pilih fitur yang tampil di beranda</Text>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.featureConfigContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.featureSection}>
                <Text style={styles.featureSectionLabel}>Fitur di beranda</Text>
                <View style={styles.featureHintBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.featureHintText}>Fitur di kotak ini akan tampil di menu utama.</Text>
                </View>
                <View style={styles.featureGrid}>
                  {allMenuItems.filter(item => draftMenuIds.includes(item.id)).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.featureItemActive}
                      onPress={() => handleToggleDraftMenu(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.featureItemIcon}>
                        <item.library name={item.icon as any} size={24} color={colors.primary} />
                      </View>
                      <Text style={styles.featureItemLabel} numberOfLines={2}>{item.title}</Text>
                      <View style={styles.featureBadgeRemove}>
                        <Ionicons name="remove" size={16} color="#dc2626" />
                      </View>
                    </TouchableOpacity>
                  ))}
                  {allMenuItems.filter(item => draftMenuIds.includes(item.id)).length === 0 && (
                    <Text style={styles.featureEmptyText}>Belum ada fitur dipilih.</Text>
                  )}
                </View>
              </View>

              <View style={styles.featureSection}>
                <Text style={styles.featureSectionLabel}>Fitur lainnya</Text>
                <View style={styles.featureGrid}>
                  {allMenuItems.filter(item => !draftMenuIds.includes(item.id)).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.featureItemInactive}
                      onPress={() => handleToggleDraftMenu(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.featureItemIcon}>
                        <item.library name={item.icon as any} size={24} color={colors.primary} />
                      </View>
                      <Text style={styles.featureItemLabel} numberOfLines={2}>{item.title}</Text>
                      <View style={styles.featureBadgeAdd}>
                        <Ionicons name="add" size={16} color="#16a34a" />
                      </View>
                    </TouchableOpacity>
                  ))}
                  {allMenuItems.filter(item => !draftMenuIds.includes(item.id)).length === 0 && (
                    <Text style={styles.featureEmptyText}>Semua fitur sudah ditampilkan.</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.featureFooter}>
              <TouchableOpacity
                onPress={handleSaveFeatureConfig}
                style={[styles.featureSaveButton, { opacity: isDraftChanged ? 1 : 0.6 }]}
                disabled={!isDraftChanged}
                activeOpacity={0.9}
              >
                <Text style={styles.featureSaveButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}

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

export default HomeScreen;
export { HomeScreen };

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
    paddingTop: 50, // Added padding top to prevent overlap with status bar/banner
    paddingBottom: 20,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
    zIndex: 1, // Ensure header stays below floating elements if any
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
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: isDarkMode ? '#1e293b' : '#fff',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Invite Card Modern
  inviteSectionWrapper: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  inviteCardModern: {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  inviteLeftDecoration: {
    width: 6,
    backgroundColor: colors.primary,
    height: '100%',
  },
  inviteContentModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  inviteTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  inviteTitleModern: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  inviteSubtitleModern: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  inviteCodeContainerModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    borderStyle: 'dashed',
  },
  inviteCodeTextModern: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
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
  featureConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: isDarkMode ? '#020617' : '#e5f0ff',
  },
  featureConfigButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
    marginBottom: 12, // Compact spacing
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
    marginHorizontal: 0, 
    paddingVertical: 0,
  },
  
  // Header
  instaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6, // Compact padding
  },
  instaUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Reduced gap
  },
  instaAvatar: {
    width: 30, // 30x30
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instaAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12, // Reduced font size
  },
  instaUsername: {
    fontSize: 13, // Reduced font size
    fontWeight: 'bold',
    color: colors.text,
  },
  instaLocation: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Image
  instaImage: {
    width: '100%',
    aspectRatio: 1, 
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
    paddingVertical: 6, // Compact padding
  },
  instaActionsLeft: {
    flexDirection: 'row',
    gap: 12, // Compact gap
    alignItems: 'center',
  },

  // Content
  instaContent: {
    paddingHorizontal: 12,
    paddingBottom: 8, // Compact padding
  },
  instaLikes: {
    fontWeight: 'bold',
    color: colors.text,
    fontSize: 13,
    marginBottom: 2, // Compact margin
  },
  instaCaption: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  instaUsernameCaption: {
    fontWeight: 'bold',
  },
  instaViewComments: {
    color: colors.textSecondary,
    marginTop: 2, // Compact margin
    fontSize: 13,
  },
  instaDate: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
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
  featureConfigOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDarkMode ? '#020617ee' : '#0f172a1a',
    justifyContent: 'flex-end',
  },
  featureConfigContainer: {
    flex: 1,
    backgroundColor: isDarkMode ? '#020617' : '#ffffff',
  },
  featureConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1f2933' : '#e5e7eb',
  },
  featureHeaderBack: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureHeaderTitleContainer: {
    flex: 1,
  },
  featureHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  featureHeaderSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  featureConfigContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  featureSection: {
    marginTop: 16,
  },
  featureSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  featureHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: isDarkMode ? '#0f172a' : '#eff6ff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e293b' : '#bfdbfe',
    marginBottom: 12,
  },
  featureHintText: {
    marginLeft: 8,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItemActive: {
    width: (width - 48 - 12 * 2) / 2,
    borderRadius: 16,
    padding: 12,
    backgroundColor: isDarkMode ? '#020617' : '#eff6ff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#1f2937' : '#bfdbfe',
  },
  featureItemInactive: {
    width: (width - 48 - 12 * 2) / 2,
    borderRadius: 16,
    padding: 12,
    backgroundColor: isDarkMode ? '#020617' : '#f9fafb',
    borderWidth: 1,
    borderColor: isDarkMode ? '#111827' : '#e5e7eb',
  },
  featureItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: isDarkMode ? '#020617' : '#ffffff',
  },
  featureItemLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    marginRight: 24,
  },
  featureBadgeRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureBadgeAdd: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: isDarkMode ? '#022c22' : '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  featureFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#1f2933' : '#e5e7eb',
    backgroundColor: isDarkMode ? '#020617' : '#ffffff',
  },
  featureSaveButton: {
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureSaveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
