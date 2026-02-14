import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { BackButton } from '../components/BackButton';

interface FineSetting {
  id?: number;
  fine_type: 'TIDAK_HADIR' | 'TELAT' | 'PULANG_CEPAT';
  amount: string; // Handle as string for input
  tolerance_minutes: string;
  is_active: boolean;
}

const DEFAULT_SETTINGS: FineSetting[] = [
  { fine_type: 'TIDAK_HADIR', amount: '50000', tolerance_minutes: '0', is_active: true },
  { fine_type: 'TELAT', amount: '20000', tolerance_minutes: '15', is_active: true },
  { fine_type: 'PULANG_CEPAT', amount: '20000', tolerance_minutes: '0', is_active: true },
];

export default function RondaFineSettingsScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [settings, setSettings] = useState<FineSetting[]>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ronda-fine-settings');
      if (response.data.success && response.data.data.length > 0) {
        const fetchedSettings = response.data.data;
        // Merge with default to ensure all types exist
        const merged = DEFAULT_SETTINGS.map(def => {
          const found = fetchedSettings.find((s: any) => s.fine_type === def.fine_type);
          if (found) {
            return {
              ...found,
              amount: found.amount.toString(),
              tolerance_minutes: found.tolerance_minutes.toString(),
              is_active: Boolean(found.is_active)
            };
          }
          return def;
        });
        setSettings(merged);
      }
    } catch (error) {
      console.error('Error fetching fine settings:', error);
      Alert.alert('Error', 'Gagal memuat pengaturan denda');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        settings: settings.map(s => ({
          fine_type: s.fine_type,
          amount: parseInt(s.amount) || 0,
          tolerance_minutes: parseInt(s.tolerance_minutes) || 0,
          is_active: s.is_active
        }))
      };

      await api.post('/ronda-fine-settings', payload);
      Alert.alert('Sukses', 'Pengaturan denda berhasil disimpan', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (index: number, field: keyof FineSetting, value: any) => {
    const newSettings = [...settings];
    newSettings[index] = { ...newSettings[index], [field]: value };
    setSettings(newSettings);
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'TIDAK_HADIR': return 'Tidak Hadir / Mangkir';
      case 'TELAT': return 'Terlambat Datang';
      case 'PULANG_CEPAT': return 'Pulang Cepat';
      default: return type;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Atur Denda Ronda</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            Tentukan nominal denda untuk pelanggaran jadwal ronda.
          </Text>

          {settings.map((item, index) => (
            <View key={item.fine_type} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{getLabel(item.fine_type)}</Text>
                <TouchableOpacity 
                  onPress={() => updateSetting(index, 'is_active', !item.is_active)}
                >
                  <Ionicons 
                    name={item.is_active ? "toggle" : "toggle-outline"} 
                    size={28} 
                    color={item.is_active ? colors.primary : colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nominal Denda (Rp)</Text>
                <TextInput
                  style={[styles.input, !item.is_active && styles.disabledInput]}
                  value={item.amount}
                  onChangeText={(text) => updateSetting(index, 'amount', text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  editable={item.is_active}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {item.fine_type !== 'TIDAK_HADIR' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Toleransi Waktu (Menit)</Text>
                  <TextInput
                    style={[styles.input, !item.is_active && styles.disabledInput]}
                    value={item.tolerance_minutes}
                    onChangeText={(text) => updateSetting(index, 'tolerance_minutes', text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    editable={item.is_active}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.hint}>
                    Denda berlaku jika telat/pulang cepat lebih dari {item.tolerance_minutes || 0} menit.
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Simpan Pengaturan</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  disabledInput: {
    opacity: 0.5,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
