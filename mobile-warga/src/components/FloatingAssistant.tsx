import React from 'react';
import { TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { RobotMascot } from './RobotMascot';
import { useTheme } from '../context/ThemeContext';

interface FloatingAssistantProps {
  onPress: () => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ onPress }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { 
          backgroundColor: isDarkMode ? '#1e293b' : '#fff', 
          shadowColor: colors.shadow,
          borderColor: colors.border,
          borderWidth: 1
        }
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <RobotMascot size={35} isHappy={true} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above bottom tab
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
});
