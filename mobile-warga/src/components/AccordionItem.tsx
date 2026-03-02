import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, children }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors, isDarkMode } = useTheme();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.container, { 
        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
        borderColor: isDarkMode ? '#334155' : '#e2e8f0' 
    }]}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <MaterialIcons 
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
          size={24} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.content, { borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  content: {
    padding: 16,
    borderTopWidth: 1,
  },
});
