import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface TermsConditionsScreenProps {
}

const TermsConditionsScreen = ({ }: TermsConditionsScreenProps) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View
        style={[styles.headerBackground, { backgroundColor: colors.primary }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>{t('terms.headerTitle')}</Text>
              <Text style={styles.headerSubtitle}>{t('terms.headerSubtitle')}</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    </View>
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
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
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
  header: {
    marginBottom: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
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
  }
});

export default TermsConditionsScreen;
