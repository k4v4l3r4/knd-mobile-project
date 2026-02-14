import React, { useRef, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  PanResponder, 
  Dimensions 
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface SwipeableAnnouncementModalProps {
  visible: boolean;
  item: Announcement | null;
  onClose: () => void;
  onDelete: (id: number) => void;
  color?: string;
}

export default function SwipeableAnnouncementModal({ 
  visible, 
  item, 
  onClose, 
  onDelete,
  color = '#3b82f6'
}: SwipeableAnnouncementModalProps) {
  const { colors, isDarkMode } = useTheme();
  const pan = useRef(new Animated.ValueXY()).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      pan.setValue({ x: 0, y: 0 });
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true
      }).start();
    } else {
      cardScale.setValue(0.9);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe Right -> Delete
          Animated.timing(pan, {
            toValue: { x: width + 100, y: gestureState.dy },
            duration: 200,
            useNativeDriver: true
          }).start(() => {
            if (item) onDelete(item.id);
            onClose();
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe Left -> Cancel
          Animated.timing(pan, {
            toValue: { x: -width - 100, y: gestureState.dy },
            duration: 200,
            useNativeDriver: true
          }).start(onClose);
        } else {
          // Reset
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  if (!item) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Tanggal tidak valid';
    try {
      const isoString = dateString.replace(' ', 'T');
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Tanggal tidak valid';
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch (e) {
      return 'Tanggal tidak valid';
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.actionContainer}>
           <Text style={styles.actionText}>Swipe Kiri Batal</Text>
           <Text style={styles.actionText}>Swipe Kanan Hapus</Text>
        </View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.cardContainer,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate: rotate },
                { scale: cardScale }
              ]
            }
          ]}
        >
          {/* Background Action Indicators overlaying the card */}
          <Animated.View style={[styles.indicator, styles.deleteIndicator, { opacity: likeOpacity }]}>
            <Text style={styles.indicatorText}>HAPUS</Text>
            <Feather name="trash-2" size={32} color="#fff" />
          </Animated.View>

          <Animated.View style={[styles.indicator, styles.cancelIndicator, { opacity: nopeOpacity }]}>
            <Text style={styles.indicatorText}>BATAL</Text>
            <Feather name="x-circle" size={32} color="#fff" />
          </Animated.View>

          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <View style={[styles.iconBox, { backgroundColor: color }]}>
               <MaterialCommunityIcons name="bullhorn-outline" size={32} color="#fff" />
            </View>
            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={styles.date}>
                <Feather name="clock" size={12} /> {formatDate(item.created_at)}
              </Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                {item.content.replace(/<[^>]+>/g, '')}
              </Text>
            </View>
          </View>
        </Animated.View>
        
        <View style={styles.footerInstruction}>
           <Text style={styles.footerText}>Geser kartu untuk aksi</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    position: 'absolute',
    top: 240, 
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  cardContainer: {
    width: width * 0.85,
    height: 300, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    elevation: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    alignItems: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  indicator: {
    position: 'absolute',
    top: 20,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteIndicator: {
    left: 20,
    borderColor: '#ef4444',
    backgroundColor: '#ef4444',
    transform: [{ rotate: '-15deg' }]
  },
  cancelIndicator: {
    right: 20,
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
    transform: [{ rotate: '15deg' }]
  },
  indicatorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerInstruction: {
    position: 'absolute',
    bottom: 80,
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  }
});
