import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

interface TermsConditionsScreenProps {
}

const TermsConditionsScreen = ({ onNavigate }: any) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]} edges={['top']}>
      {/* Header - Green Background Only (No Gap) */}
      <View
        style={[styles.headerBackground, { backgroundColor: colors.primary, marginTop: 0, paddingTop: 0 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => onNavigate && onNavigate('HOME')}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.headerTitle}>{t('terms.headerTitle')}</Text>
              <Text style={styles.headerSubtitle}>{t('terms.headerSubtitle')}</Text>
              <DemoLabel />
            </View>
            
            <View style={{ width: 40 }} />
          </View>
        </View>
      </View>

      {/* Content - White Background for Readability */}
      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: '#FFFFFF' }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{t('terms.title')}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{t('terms.lastUpdated')}</Text>

        <Section title={t('terms.intro.title')} colors={colors}>
          {t('terms.intro.content')}
        </Section>

        <Section title={t('terms.account.title')} colors={colors}>
          {t('terms.account.content')}
        </Section>

        <Section title={t('terms.usage.title')} colors={colors}>
          {t('terms.usage.content')}
        </Section>

        <Section title={t('terms.payment.title')} colors={colors}>
          {t('terms.payment.content')}
        </Section>

        <Section title={t('terms.privacy.title')} colors={colors}>
          {t('terms.privacy.content')}
        </Section>

        <Section title={t('terms.changes.title')} colors={colors}>
          {t('terms.changes.content')}
        </Section>

        <Section title={t('terms.contact.title')} colors={colors}>
          {t('terms.contact.content')}
        </Section>
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            &copy; 2024 KND (Kawasan Nyaman Digital). All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Section = ({ title, children, colors }: { title: string, children: React.ReactNode, colors: any }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    paddingTop: 0,         // No top padding - prevents gap
    marginTop: 0,          // No top margin - flush fit
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 20,  // Consistent 20px rule
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    // marginTop: 10,  // REMOVED: Prevents gap at top
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    padding: 20,                 // Consistent 20px rule
    paddingBottom: 120,          // Prevent overlap with bottom nav
  },
  title: {
    fontSize: 22,                // Reduced from oversized
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
    color: '#999999',            // Softer gray
  },
  section: {
    marginBottom: 24,            // More breathing room
  },
  sectionTitle: {
    fontSize: 18,                // Reduced from too large
    fontWeight: '700',
    marginBottom: 10,
    color: '#10b981',            // Green accent
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 26,              // ← Professional readability (increased from 22)
    textAlign: 'justify',
    color: '#444444',            // ← Softer black (changed from theme color)
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
  }
});

export default TermsConditionsScreen;
