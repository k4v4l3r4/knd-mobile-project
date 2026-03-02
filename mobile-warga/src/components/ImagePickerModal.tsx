import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

const { width } = Dimensions.get('window');

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onCamera,
  onGallery
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
              <View style={styles.header}>
                <View style={[styles.indicator, { backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }]} />
                <Text style={[styles.title, { color: colors.text }]}>{t('common.imagePicker.title')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t('common.imagePicker.subtitle')}
                </Text>
              </View>

              <View style={styles.gridContainer}>
                <TouchableOpacity
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: isDarkMode ? '#374151' : '#f8fafc',
                      borderColor: isDarkMode ? '#4b5563' : '#e2e8f0',
                    }
                  ]}
                  onPress={() => {
                    onCamera();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="camera" size={32} color="#2563eb" />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{t('common.imagePicker.camera')}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('common.imagePicker.cameraDesc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.card, 
                    { 
                      backgroundColor: isDarkMode ? '#374151' : '#f8fafc',
                      borderColor: isDarkMode ? '#4b5563' : '#e2e8f0',
                    }
                  ]}
                  onPress={() => {
                    onGallery();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="images" size={32} color="#059669" />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{t('common.imagePicker.gallery')}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('common.imagePicker.galleryDesc')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>{t('common.imagePicker.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  indicator: {
    width: 48,
    height: 5,
    borderRadius: 3,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    // Shadow for card
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
