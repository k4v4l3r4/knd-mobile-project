import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../context/ThemeContext';

interface TimelineItem {
  status: string;
  label: string;
  timestamp: string | null;
  is_completed: boolean;
  is_current: boolean;
}

interface StatusTimelineProps {
  timeline: TimelineItem[];
  formatDateTime: (dateString: string) => string;
}

export default function StatusTimeline({ timeline, formatDateTime }: StatusTimelineProps) {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  return (
    <View style={styles.timeline}>
      {timeline.map((item, index) => (
        <View key={item.status} style={styles.timelineItem}>
          {/* Dot/Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.dot,
                item.is_completed && [
                  styles.dotCompleted,
                  { backgroundColor: getStatusColor(item.status) },
                ],
                item.is_current && [
                  styles.dotCurrent,
                  { borderColor: getStatusColor(item.status) },
                ],
              ]}
            >
              {item.is_completed && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
              {item.is_current && !item.is_completed && (
                <View style={[styles.currentDot, { backgroundColor: getStatusColor(item.status) }]} />
              )}
            </View>
            
            {/* Line to next item */}
            {index < timeline.length - 1 && (
              <View
                style={[
                  styles.line,
                  item.is_completed && {
                    backgroundColor: getStatusColor(item.status),
                  },
                ]}
              />
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text
              style={[
                styles.label,
                item.is_current && styles.labelCurrent,
                item.is_completed && styles.labelCompleted,
              ]}
            >
              {item.label}
            </Text>
            
            {item.timestamp && (
              <Text style={styles.timestamp}>{formatDateTime(item.timestamp)}</Text>
            )}
            
            {!item.timestamp && item.is_current && (
              <Text style={styles.waitingText}>Menunggu...</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING_PAYMENT: '#F59E0B',
    WAITING_CONFIRMATION: '#3B82F6',
    PAID: '#10B981',
    PROCESSING: '#8B5CF6',
    SHIPPED: '#06B6D4',
    DELIVERED: '#10B981',
    COMPLETED: '#059669',
    CANCELLED: '#EF4444',
  };
  return colors[status] || '#6B7280';
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    timeline: {
      marginTop: 8,
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    iconContainer: {
      alignItems: 'center',
      marginRight: 12,
      position: 'relative',
    },
    dot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    dotCompleted: {
      // Filled with status color
    },
    dotCurrent: {
      // Ring with status color
      backgroundColor: 'transparent',
    },
    currentDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    line: {
      width: 2,
      flex: 1,
      backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
      marginTop: 4,
    },
    content: {
      flex: 1,
      paddingTop: 2,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    labelCompleted: {
      color: colors.text,
      fontWeight: '500',
    },
    labelCurrent: {
      color: colors.text,
      fontWeight: '600',
    },
    timestamp: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    waitingText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
  });
