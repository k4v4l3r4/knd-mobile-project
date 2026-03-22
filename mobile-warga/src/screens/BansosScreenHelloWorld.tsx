import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';

export default function BansosScreenHelloWorld() {
  console.log('🔴 [HELLO WORLD] Component rendering...');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>LAYAR MUNCUL!</Text>
        <Text style={styles.subtitle}>Jika ini muncul = Navigation OK</Text>
        <Text style={styles.info}>Masalahnya BUKAN di file Bansos</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    color: 'white',
  },
});
