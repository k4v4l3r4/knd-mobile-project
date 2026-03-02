import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  style?: ViewStyle;
}

export const BackButton = ({ onPress, color, style }: BackButtonProps) => {
  const { colors, isDarkMode } = useTheme();
  const iconColor = color || colors.text;

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { 
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
        }, 
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12, // Slightly rounded square or circle
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
