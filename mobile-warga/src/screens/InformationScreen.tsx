import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Dimensions,
  TextInput,
  Share,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api, { BASE_URL, getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerModal } from '../components/ImagePickerModal';


const { width, height } = Dimensions.get('window');

interface User {
  id: number;
  name: string;
  avatar_url?: string;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: User;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

// Helper functions moved outside component
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const safeDate = dateString.replace(' ', 'T');
  const date = new Date(safeDate);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (dateString: string) => {
  if (!dateString) return '';
  const safeDate = dateString.replace(' ', 'T');
  const date = new Date(safeDate);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  return getStorageUrl(path);
};

// Memoized Item Component
const AnnouncementItem = React.memo(({ item, onPress, onLike, onComment, onShare, colors, styles, t, language, isAdminRT, onEdit, onDelete }: any) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity 
        onPress={() => onPress(item)}
        activeOpacity={0.9}
        style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}
      >
        {item.image_url && (
          <Image
            source={{ uri: getImageUrl(item.image_url) || 'https://via.placeholder.com/400x200' }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
          <Text style={styles.cardPreview} numberOfLines={3}>
            {item.content}
          </Text>
          <Text style={styles.readMore}>{t('information.readMore')}</Text>
        </View>
      </TouchableOpacity>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity 
                style={[styles.actionButton, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }, item.is_liked && { backgroundColor: '#ef4444' }]} 
                onPress={() => onLike(item)}
                activeOpacity={0.7}
            >
              <Ionicons 
                name={item.is_liked ? "heart" : "heart-outline"} 
                size={20} 
                color={item.is_liked ? "#fff" : colors.textSecondary} 
              />
              <Text style={[
                  styles.actionText, 
                  item.is_liked ? { color: '#fff' } : { color: colors.textSecondary }
              ]}>
                {item.likes_count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionButton, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }]} 
                onPress={() => onComment(item)}
                activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>{item.comments_count}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionButton, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }]} 
                onPress={() => onShare(item)}
                activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>

        {isAdminRT && (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity 
                style={[styles.actionButton, { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 20 }]} 
                onPress={() => onEdit(item)}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.actionButton, { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 20 }]} 
                onPress={() => onDelete(item)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

export default function InformationScreen() {
  const { colors, isDarkMode, setTheme } = useTheme();
  const { t, language } = useLanguage();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Admin RT State
  const [isAdminRT, setIsAdminRT] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: null as any
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setIsAdminRT(user.role === 'ADMIN_RT');
      }
    } catch (e) {
      console.error('Failed to get user role', e);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      Alert.alert(t('common.error'), t('common.validation.required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', formData.title);
      form.append('content', formData.content);
      form.append('status', 'PUBLISHED');
      if (formData.image && formData.image.uri && !formData.image.uri.startsWith('http')) {
        // @ts-ignore
        form.append('image', {
          uri: formData.image.uri,
          name: 'image.jpg',
          type: 'image/jpeg'
        });
      }

      await api.post('/announcements', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert(t('common.success'), t('information.success.create'));
      setCreateModalVisible(false);
      fetchAnnouncements();
      resetForm();
    } catch (error) {
      console.error('Create error:', error);
      Alert.alert(t('common.error'), t('common.errorMsg'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !formData.title || !formData.content) return;

    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.append('_method', 'PUT');
      form.append('title', formData.title);
      form.append('content', formData.content);
      form.append('status', 'PUBLISHED');
      if (formData.image && formData.image.uri && !formData.image.uri.startsWith('http')) {
        // @ts-ignore
        form.append('image', {
          uri: formData.image.uri,
          name: 'image.jpg',
          type: 'image/jpeg'
        });
      }

      await api.post(`/announcements/${editId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert(t('common.success'), t('information.success.update'));
      setCreateModalVisible(false);
      fetchAnnouncements();
      resetForm();
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert(t('common.error'), t('common.errorMsg'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (item: Announcement) => {
    Alert.alert(
      t('information.actions.confirmDelete'),
      t('information.actions.confirmDeleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('information.actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/announcements/${item.id}`);
              Alert.alert(t('common.success'), t('information.success.delete'));
              fetchAnnouncements();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert(t('common.error'), t('common.errorMsg'));
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', image: null });
    setIsEditing(false);
    setEditId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalVisible(true);
  };

  const openEditModal = (item: Announcement) => {
    setFormData({
      title: item.title,
      content: item.content,
      image: item.image_url ? { uri: getStorageUrl(item.image_url) } : null
    });
    setEditId(item.id);
    setIsEditing(true);
    setCreateModalVisible(true);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      };

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('common.permission.camera'));
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('common.permission.gallery'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled) {
        setFormData({ ...formData, image: result.assets[0] });
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  // Detail Modal State
  const [selectedNews, setSelectedNews] = useState<Announcement | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Comments Modal State
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiHeight = React.useRef(new Animated.Value(0)).current;
  const emojiOpacity = React.useRef(new Animated.Value(0)).current;

  const COMMON_EMOJIS = useMemo(() => ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉', '🙏', '💯', '🤔', '🤣', '😍', '🙌', '✨'], []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await api.get('/announcements');
      if (response.data.success) {
        // Handle pagination response structure
        const result = response.data.data;
        if (Array.isArray(result)) {
            setAnnouncements(result);
        } else if (result && Array.isArray(result.data)) {
            setAnnouncements(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const toggleEmojiPicker = useCallback(() => {
    // We need to use functional update if we depend on prev state, but here we need the NEW value to animate
    setShowEmojiPicker(prev => {
        const shouldShow = !prev;
        
        Animated.parallel([
          Animated.timing(emojiHeight, {
            toValue: shouldShow ? 50 : 0,
            duration: 250,
            useNativeDriver: false,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          Animated.timing(emojiOpacity, {
            toValue: shouldShow ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start();
        
        return shouldShow;
    });
  }, [emojiHeight, emojiOpacity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openDetail = useCallback((news: Announcement) => {
    setSelectedNews(news);
    setDetailModalVisible(true);
  }, []);

  const fetchComments = useCallback(async (announcementId: number) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/announcements/${announcementId}/comments`);
      if (response.data.success) {
        setComments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert(t('common.error'), t('information.error.loadComments'));
    } finally {
      setLoadingComments(false);
    }
  }, [t]);

  const openComments = useCallback((news: Announcement) => {
    setSelectedNews(news);
    setCommentsModalVisible(true);
    fetchComments(news.id);
  }, [fetchComments]);

  const handleLike = useCallback(async (news: Announcement) => {
    // Optimistic Update
    setAnnouncements(prev => prev.map(item => {
      if (item.id === news.id) {
        return {
          ...item,
          is_liked: !item.is_liked,
          likes_count: item.is_liked ? item.likes_count - 1 : item.likes_count + 1
        };
      }
      return item;
    }));

    setSelectedNews(prev => {
        if (prev && prev.id === news.id) {
            return {
                ...prev,
                is_liked: !prev.is_liked,
                likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1
            };
        }
        return prev;
    });

    try {
      const response = await api.post(`/announcements/${news.id}/like`);
      if (response.data.success) {
          // Sync with actual server data to be safe
          const { liked, likes_count } = response.data;
          
          setAnnouncements(prev => prev.map(item => {
            if (item.id === news.id) {
              return {
                ...item,
                is_liked: liked,
                likes_count: likes_count
              };
            }
            return item;
          }));

          setSelectedNews(prev => {
              if (prev && prev.id === news.id) {
                  return {
                      ...prev,
                      is_liked: liked,
                      likes_count: likes_count
                  };
              }
              return prev;
          });
      }
    } catch (error) {
      console.error('Error liking announcement:', error);
      // Revert on error - toggle back
      setAnnouncements(prev => prev.map(item => {
          if (item.id === news.id) {
              return {
                 ...item,
                 is_liked: !item.is_liked,
                 likes_count: item.is_liked ? item.likes_count - 1 : item.likes_count + 1
              };
          }
          return item;
      }));
      
      setSelectedNews(prev => {
        if (prev && prev.id === news.id) {
            return {
                ...prev,
                is_liked: !prev.is_liked,
                likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1
            };
        }
        return prev;
      });
    }
  }, []);

  const handleShare = useCallback(async (news: Announcement) => {
    try {
      await Share.share({
        message: `${news.title}\n\n${news.content}\n\nBaca selengkapnya di Aplikasi Warga RT.`,
      });
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewComment(prev => prev + emoji);
  }, []);

  const submitComment = useCallback(async () => {
    if (!newComment.trim() || !selectedNews) return;

    setSubmittingComment(true);
    // Capture current values to use in async
    const currentNewsId = selectedNews.id;
    const currentComment = newComment;

    try {
      const response = await api.post(`/announcements/${currentNewsId}/comments`, {
        content: currentComment
      });

      if (response.data.success) {
        setNewComment('');
        // Refresh comments
        fetchComments(currentNewsId);
        
        // Update comment count in list
        setAnnouncements(prev => prev.map(item => {
          if (item.id === currentNewsId) {
            return {
              ...item,
              comments_count: item.comments_count + 1
            };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert(t('common.error'), t('information.error.submitComment'));
    } finally {
      setSubmittingComment(false);
    }
  }, [newComment, selectedNews, fetchComments, t]);

  const renderItem = useCallback(({ item }: { item: Announcement }) => (
    <AnnouncementItem 
        item={item} 
        onPress={openDetail}
        onLike={handleLike}
        onComment={openComments}
        onShare={handleShare}
        colors={colors}
        styles={styles}
        t={t}
        language={language}
        isAdminRT={isAdminRT}
        onEdit={openEditModal}
        onDelete={handleDelete}
    />
  ), [openDetail, handleLike, openComments, handleShare, colors, styles, t, language, isAdminRT, openEditModal, handleDelete]);

  const keyExtractor = useCallback((item: Announcement) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.headerRow}>
                <View style={{ width: 40 }} />
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>{t('information.title')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t('information.subtitle')}
                    </Text>
                    <DemoLabel />
                </View>
                <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            isAdminRT ? (
              <TouchableOpacity
                style={[styles.createButtonHeader, { backgroundColor: colors.primary }]}
                onPress={openCreateModal}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
                <Text style={styles.createButtonHeaderText}>{t('information.createTitle')}</Text>
              </TouchableOpacity>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('information.noData')}</Text>
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setDetailModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {t('information.detailTitle')}
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {selectedNews?.image_url && (
                <Image
                  source={{ uri: getImageUrl(selectedNews.image_url) || 'https://via.placeholder.com/400x200' }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.detailBody}>
                <Text style={styles.detailTitle}>{selectedNews?.title}</Text>
                <Text style={styles.detailDate}>
                  {selectedNews && formatDate(selectedNews.created_at)}
                </Text>
                <Text style={styles.detailText}>
                  {selectedNews?.content}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comments Modal (Bottom Sheet style) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commentsModalVisible}
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.commentModalContainer}
        >
          <View style={styles.commentModalContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>{t('information.comments')} ({comments.length})</Text>
              <TouchableOpacity 
                onPress={() => setCommentsModalVisible(false)} 
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.commentsList}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {item.user.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.commentBubble}>
                        <View style={styles.commentUserRow}>
                            <Text style={styles.commentUser}>{item.user.name}</Text>
                            <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
                        </View>
                        <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                    <Text style={styles.noCommentsText}>{t('information.noComments')}</Text>
                }
              />
            )}

            <View style={styles.commentInputContainer}>
              <Animated.View style={[
                  styles.emojiPickerContainer, 
                  { 
                      height: emojiHeight,
                      opacity: emojiOpacity,
                      overflow: 'hidden'
                  }
              ]}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.emojiScrollView}
                    keyboardShouldPersistTaps="handled"
                >
                  {COMMON_EMOJIS.map((emoji, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.emojiItem, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => handleEmojiSelect(emoji)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
              
              <View style={styles.inputRow}>
                <TouchableOpacity 
                    style={[styles.emojiToggleButton, { borderRadius: 20, width: 44, height: 44, padding: 0, alignItems: 'center', justifyContent: 'center' }]}
                    onPress={toggleEmojiPicker}
                    activeOpacity={0.7}
                >
                  <Ionicons 
                      name={showEmojiPicker ? "keypad-outline" : "happy-outline"} 
                      size={24} 
                      color={colors.textSecondary} 
                  />
                </TouchableOpacity>

                <TextInput
                    style={styles.commentInput}
                    placeholder={t('information.writeComment')}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity 
                    style={[
                        styles.sendButton,
                        (!newComment.trim() || submittingComment) && styles.sendButtonDisabled
                    ]}
                    onPress={submitComment}
                    disabled={!newComment.trim() || submittingComment}
                    activeOpacity={0.7}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {isEditing ? t('information.editTitle') : t('information.createTitle')}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.label}>{t('information.form.title')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder={t('information.form.titlePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <Text style={styles.label}>{t('information.form.content')}</Text>
              <TextInput
                style={[styles.input, { height: 150, textAlignVertical: 'top', color: colors.text, borderColor: colors.border }]}
                placeholder={t('information.form.contentPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
              />

              <Text style={styles.label}>{t('information.form.image')}</Text>
              <TouchableOpacity 
                style={[styles.imageUpload, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setImagePickerVisible(true)}
              >
                {formData.image ? (
                  <Image 
                    source={{ uri: formData.image.uri }} 
                    style={{ width: '100%', height: '100%', borderRadius: 8 }} 
                  />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                      {t('information.form.image')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>

            <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={isEditing ? handleUpdate : handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isEditing ? t('information.form.save') : t('information.form.submit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onCamera={() => pickImage(true)}
        onGallery={() => pickImage(false)}
      />

      {isAdminRT && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 10,
  },
  headerBackground: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
    overflow: 'hidden',
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
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 26,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  cardPreview: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  readMore: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Detail Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  closeButton: {
    marginRight: 16,
    padding: 4,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  detailImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.border,
  },
  detailBody: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 32,
  },
  detailDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 28,
  },
  // Comments Modal Styles
  commentModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    borderRadius: 16,
    padding: 12,
    borderTopLeftRadius: 4,
  },
  commentUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  commentTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  noCommentsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
    fontSize: 14,
  },
  commentInputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    color: colors.text,
    marginRight: 10,
    marginLeft: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  emojiToggleButton: {
    padding: 8,
  },
  emojiPickerContainer: {
    overflow: 'hidden',
  },
  emojiScrollView: {
    paddingVertical: 8,
    gap: 8,
  },
  emojiItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emojiText: {
    fontSize: 20,
  },
  // CRUD Styles
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
  },
  imageUpload: {
    height: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  iconButton: {
    padding: 4,
  },
});
