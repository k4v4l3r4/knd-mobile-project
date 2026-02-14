import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Dimensions,
  StatusBar,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import api, { getStorageUrl } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';

const { width } = Dimensions.get('window');

export interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  status?: string;
  focusComment?: boolean;
  is_liked?: boolean;
  likes_count?: number;
  comments_count?: number;
}

interface AnnouncementDetailScreenProps {
  announcement: Announcement;
}

export default function AnnouncementDetailScreen({ announcement }: AnnouncementDetailScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchComments();
  }, [announcement.id]);

  useEffect(() => {
    if (announcement.focusComment) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        inputRef.current?.focus();
      }, 500);
    }
  }, [announcement.focusComment]);

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await api.get(`/announcements/${announcement.id}/comments`);
      if (response.data.success) {
        setComments(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await api.post(`/announcements/${announcement.id}/comments`, {
        content: newComment
      });

      if (response.data.success) {
        setNewComment('');
        fetchComments(); // Reload comments
        // Dismiss keyboard handled by user
      }
    } catch (error) {
      console.log('Error posting comment:', error);
      Alert.alert(t('common.error'), t('announcement.postFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Premium Header */}
        <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <View style={styles.headerRow}>
              <View style={{ width: 40 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.headerTitle}>Detail Pengumuman</Text>
                <DemoLabel />
              </View>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image */}
          {announcement.image_url ? (
            <Image 
              source={{ uri: getStorageUrl(announcement.image_url) || '' }} 
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}

          {/* Title & Meta */}
          <View style={styles.body}>
            <Text style={styles.title}>{announcement.title}</Text>
            <Text style={styles.date}>
                {new Date(announcement.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
            </Text>
            
            <View style={styles.divider} />
            
            {/* Content */}
            <Text style={styles.textContent}>{announcement.content}</Text>

            <View style={[styles.divider, { marginTop: 30 }]} />
            
            {/* Comments Section */}
            <Text style={styles.sectionTitle}>Komentar ({comments.length})</Text>
            
            {loadingComments ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.commentsList}>
                {comments.length === 0 ? (
                  <Text style={styles.emptyText}>Belum ada komentar. Jadilah yang pertama!</Text>
                ) : (
                  comments.map((comment, index) => (
                    <View key={comment.id || index} style={styles.commentItem}>
                      <View style={styles.avatarContainer}>
                         {comment.user?.avatar ? (
                            <Image source={{ uri: getStorageUrl(comment.user.avatar) || '' }} style={styles.avatar} />
                         ) : (
                            <View style={[styles.avatar, { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                                    {comment.user?.name?.charAt(0) || 'U'}
                                </Text>
                            </View>
                         )}
                      </View>
                      <View style={styles.commentContent}>
                        <Text style={styles.commentUser}>{comment.user?.name || 'Warga'}</Text>
                        <Text style={styles.commentText}>{comment.content}</Text>
                        <Text style={styles.commentDate}>
                            {new Date(comment.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('announcement.writeComment')}
            placeholderTextColor={colors.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: newComment.trim() ? colors.primary : colors.border }]}
            onPress={handlePostComment}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
  content: {
    paddingBottom: 40,
  },
  image: {
    width: width - 40,
    height: 250,
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  body: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    fontWeight: '500',
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 24,
    opacity: 0.5,
  },
  textContent: {
    fontSize: 16,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '400',
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  commentsList: {
    gap: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  avatarContainer: {
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
