/**
 * SIMPLE TEST SCREEN - BANSOS BLANK SCREEN DEBUG
 * 
 * Ini adalah screen test yang SANGAT SIMPLE
 * Hanya menampilkan teks "HALO BANSOS" tanpa API call
 * 
 * Cara Test:
 * 1. Import screen ini di App.tsx atau navigation
 * 2. Navigate ke screen ini
 * 3. Jika muncul "HALO BANSOS" = Screen component OK
 * 4. Jika tetap blank = Masalah ada di React Native / Navigation
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BansosTestScreen() {
  console.log('🔵 BANSOS TEST SCREEN RENDERED!');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>HALO BANSOS</Text>
        <Text style={styles.subtitle}>Jika ini muncul, screen component OK!</Text>
        <Text style={styles.info}>Masalahnya ada di data fetching, bukan di render.</Text>
        
        <View style={styles.box}>
          <Text style={styles.boxText}>TEST 1: Component Render ✅</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  box: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  boxText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
