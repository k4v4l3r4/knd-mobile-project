import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api, { getStorageUrl } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentModalProps {
  visible: boolean;
  announcementId: number | null;
  onClose: () => void;
}

export default function CommentModal({ visible, announcementId, onClose }: CommentModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const COMMON_EMOJIS = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😭', '😤', '😠', '😡', '👍', '👎', '👏', '🙌', '🤝', '🙏',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️'
  ];

  useEffect(() => {
    if (visible && announcementId) {
      fetchComments();
      // Auto focus input after a short delay to allow modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setComments([]);
      setNewComment('');
      setShowEmojiPicker(false);
    }
  }, [visible, announcementId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setShowEmojiPicker(false); // Hide emoji picker when keyboard shows
      }
    );
    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const fetchComments = async () => {
    if (!announcementId) return;
    try {
      setLoading(true);
      const response = await api.get(`/announcements/${announcementId}/comments`);
      if (response.data.success) {
        setComments(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !announcementId) return;

    try {
      setSubmitting(true);
      const response = await api.post(`/announcements/${announcementId}/comments`, {
        content: newComment
      });

      if (response.data.success) {
        setNewComment('');
        fetchComments(); // Reload comments
        // Don't close modal, let user continue chatting
      }
    } catch (error) {
      console.log('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
  };

  const toggleEmojiPicker = () => {
    if (showEmojiPicker) {
        // Switch to keyboard
        inputRef.current?.focus();
        setShowEmojiPicker(false);
    } else {
        // Switch to emoji picker
        Keyboard.dismiss();
        setTimeout(() => setShowEmojiPicker(true), 100); // Slight delay to allow keyboard to dismiss
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.commentItem, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
      <View style={styles.avatarContainer}>
         {item.user?.avatar ? (
            <Image source={{ uri: getStorageUrl(item.user.avatar) || '' }} style={styles.avatar} />
         ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                    {item.user?.name?.charAt(0) || 'U'}
                </Text>
            </View>
         )}
      </View>
      <View style={styles.commentContent}>
        <Text style={[styles.commentUser, { color: colors.text }]}>{item.user?.name || 'Warga'}</Text>
        <Text style={[styles.commentText, { color: colors.text }]}>{item.content}</Text>
        <Text style={[styles.commentDate, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={[styles.modalContent, { backgroundColor: colors.card }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Komentar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              contentContainerStyle={styles.listContent}
              style={{ flex: 1 }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Belum ada komentar. Tulis sesuatu!
                </Text>
              }
            />
          )}

          {/* Input Area */}
          <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <TouchableOpacity 
                style={styles.iconButton}
                onPress={toggleEmojiPicker}
            >
                <Ionicons 
                    name={showEmojiPicker ? "keypad-outline" : "happy-outline"} 
                    size={24} 
                    color={colors.textSecondary} 
                />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
                color: colors.text 
              }]}
              placeholder="Tulis komentar..."
              placeholderTextColor={colors.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              onFocus={() => setShowEmojiPicker(false)}
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

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <View style={[styles.emojiPicker, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
                <FlatList
                    data={COMMON_EMOJIS}
                    numColumns={8}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.emojiItem}
                            onPress={() => handleAddEmoji(item)}
                        >
                            <Text style={styles.emojiText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ padding: 8 }}
                />
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    height: SCREEN_HEIGHT * 0.7, // Take up 70% of screen
    maxHeight: '100%', // Ensure it doesn't exceed available space (especially when keyboard is open)
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  avatarContainer: {
    marginTop: 2,
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
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 4,
  },
  emojiPicker: {
    height: 250,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  emojiItem: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
