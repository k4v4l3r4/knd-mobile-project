import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RobotMascotProps {
  size?: number;
  isHappy?: boolean;
}

export const RobotMascot: React.FC<RobotMascotProps> = ({ size = 50, isHappy = false }) => {
  const { colors, isDarkMode } = useTheme();
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const handWaveAnim = useRef(new Animated.Value(0)).current;
  const headTiltAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const antennaAnim = useRef(new Animated.Value(0)).current;

  // Scale factor based on default size 50
  const scale = size / 50;

  useEffect(() => {
    // Blinking Loop
    const blinkLoop = () => {
      Animated.sequence([
        Animated.delay(2000 + Math.random() * 3000),
        Animated.timing(blinkAnim, { toValue: 0.1, duration: 150, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(100),
        Animated.timing(blinkAnim, { toValue: 0.1, duration: 150, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start(() => blinkLoop());
    };

    // Waving Hand Loop
    const waveLoop = () => {
      Animated.sequence([
        Animated.delay(3000 + Math.random() * 5000),
        Animated.loop(
          Animated.sequence([
            Animated.timing(handWaveAnim, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(handWaveAnim, { toValue: -1, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
          { iterations: 4 }
        ),
        Animated.timing(handWaveAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => waveLoop());
    };

    // Head Tilt Loop (Cute/Curious)
    const tiltLoop = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(headTiltAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(headTiltAnim, { toValue: -1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    };

    // Breathing/Floating Effect
    const breatheLoop = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breatheAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    };

    // Antenna Wiggle
    const antennaLoop = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(antennaAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(antennaAnim, { toValue: -1, duration: 200, useNativeDriver: true }),
        ])
      ).start();
    };

    blinkLoop();
    waveLoop();
    tiltLoop();
    breatheLoop();
    // antennaLoop(); // Too distracting maybe?
  }, []);

  const handRotate = handWaveAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '35deg']
  });

  const headRotate = headTiltAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg']
  });

  const bodyY = breatheAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [0, -2]
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        
        {/* Bouncing Container */}
        <Animated.View style={{ transform: [{ translateY: bodyY }] }}>
          
          {/* Head Group */}
          <Animated.View style={{ transform: [{ rotate: headRotate }] }}>
            
            {/* Antenna */}
            <View style={{ alignItems: 'center', marginBottom: -4, zIndex: 0 }}>
              <View style={{ width: 2, height: 12, backgroundColor: colors.textSecondary }} />
              <View style={{ 
                width: 8, height: 8, borderRadius: 4, 
                backgroundColor: '#ef4444', 
                position: 'absolute', top: -4,
                shadowColor: '#ef4444', shadowOpacity: 0.6, shadowRadius: 4, elevation: 4
              }} />
            </View>

            {/* Head Shape */}
            <View style={{ 
                width: 44, height: 36, 
                backgroundColor: isDarkMode ? '#1e293b' : '#fff', 
                borderRadius: 14,
                borderWidth: 2,
                borderColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                shadowColor: colors.shadow, shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
            }}>
                {/* Face Screen */}
                <View style={{ 
                    width: 36, height: 24, 
                    backgroundColor: isDarkMode ? '#0f172a' : '#ecfdf5', 
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    paddingTop: 4
                }}>
                    {/* Left Eye */}
                    <Animated.View style={{ 
                        width: 8, height: 10, 
                        backgroundColor: colors.primary, 
                        borderRadius: 6,
                        transform: [{ scaleY: blinkAnim }]
                    }}>
                        <View style={{ width: 3, height: 3, backgroundColor: '#fff', borderRadius: 1.5, marginLeft: 1, marginTop: 1 }} />
                    </Animated.View>

                    {/* Right Eye */}
                    <Animated.View style={{ 
                        width: 8, height: 10, 
                        backgroundColor: colors.primary, 
                        borderRadius: 6,
                        transform: [{ scaleY: blinkAnim }]
                    }}>
                        <View style={{ width: 3, height: 3, backgroundColor: '#fff', borderRadius: 1.5, marginLeft: 1, marginTop: 1 }} />
                    </Animated.View>

                    {/* Blush / Cheeks */}
                    <View style={{ position: 'absolute', bottom: 4, left: 4, width: 4, height: 2, backgroundColor: '#f472b6', borderRadius: 2, opacity: 0.6 }} />
                    <View style={{ position: 'absolute', bottom: 4, right: 4, width: 4, height: 2, backgroundColor: '#f472b6', borderRadius: 2, opacity: 0.6 }} />
                </View>
            </View>
          </Animated.View>

          {/* Body */}
          <View style={{ 
              width: 28, height: 18, 
              backgroundColor: colors.primary, 
              borderRadius: 10,
              marginTop: -4,
              alignSelf: 'center',
              zIndex: 5,
              borderWidth: 2,
              borderColor: isDarkMode ? '#334155' : '#fff'
          }}>
              <View style={{ width: 14, height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6, alignSelf: 'center', marginTop: 4 }} />
          </View>

          {/* Hands */}
          {/* Left Hand (Static) */}
          <View style={{ 
              position: 'absolute', bottom: 6, left: -6,
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: isDarkMode ? '#1e293b' : '#fff',
              borderWidth: 2, borderColor: colors.primary
          }} />

          {/* Right Hand (Waving) */}
          <Animated.View style={{ 
              position: 'absolute', bottom: 6, right: -8,
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: isDarkMode ? '#1e293b' : '#fff',
              borderWidth: 2, borderColor: colors.primary,
              transform: [
                  { translateY: -5 }, // Pivot point adjustment
                  { rotate: handRotate },
                  { translateY: 5 }
              ]
          }} />

        </Animated.View>
      </Animated.View>
    </View>
  );
};
