import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { BackButton } from '../components/BackButton';

interface RondaLocation {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number;
  qr_token: string;
}

export default function RondaLocationScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [locations, setLocations] = useState<RondaLocation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<RondaLocation | null>(null);
  const [form, setForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '50'
  });
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // QR Modal
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState<RondaLocation | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ronda-locations');
      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Gagal memuat data lokasi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      latitude: '',
      longitude: '',
      radius_meters: '50'
    });
    setIsEditing(false);
    setSelectedLocation(null);
  };

  const handleEdit = (loc: RondaLocation) => {
    setIsEditing(true);
    setSelectedLocation(loc);
    setForm({
      name: loc.name,
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      radius_meters: loc.radius_meters.toString()
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.latitude || !form.longitude) {
      Alert.alert('Validasi', 'Mohon lengkapi nama dan koordinat lokasi');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: parseInt(form.radius_meters) || 50
      };

      if (isEditing && selectedLocation) {
        await api.put(`/ronda-locations/${selectedLocation.id}`, payload);
      } else {
        await api.post('/ronda-locations', payload);
      }
      
      setModalVisible(false);
      fetchLocations();
      Alert.alert('Sukses', 'Lokasi berhasil disimpan');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyimpan lokasi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Hapus Lokasi',
      'Yakin ingin menghapus lokasi ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/ronda-locations/${id}`);
              fetchLocations();
            } catch (error: any) {
              Alert.alert('Error', 'Gagal menghapus lokasi');
            }
          }
        }
      ]
    );
  };

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Mohon izinkan akses lokasi untuk fitur ini');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setForm({
        ...form,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString()
      });
    } catch (error) {
      Alert.alert('Error', 'Gagal mendapatkan lokasi saat ini');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleShowQR = (loc: RondaLocation) => {
    setQrData(loc);
    setQrModalVisible(true);
  };

  const renderItem = ({ item }: { item: RondaLocation }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <FontAwesome5 name="map-marker-alt" size={24} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>
            Lat: {item.latitude}, Long: {item.longitude}
          </Text>
          <Text style={styles.radiusText}>Radius: {item.radius_meters}m</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => handleShowQR(item)}
        >
          <MaterialIcons name="qr-code" size={20} color="#fff" />
          <Text style={styles.qrButtonText}>Lihat QR</Text>
        </TouchableOpacity>
        
        <View style={styles.editActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => handleEdit(item)}
          >
            <Feather name="edit-2" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Lokasi & QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={locations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Belum ada lokasi pos ronda.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Lokasi' : 'Tambah Lokasi'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Pos / Lokasi</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => setForm({...form, name: t})}
                placeholder="Pos Ronda RT 01"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  value={form.latitude}
                  onChangeText={(t) => setForm({...form, latitude: t})}
                  keyboardType="numeric"
                  placeholder="-6.xxxx"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  value={form.longitude}
                  onChangeText={(t) => setForm({...form, longitude: t})}
                  keyboardType="numeric"
                  placeholder="106.xxxx"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons name="location" size={18} color={colors.primary} />
              )}
              <Text style={styles.locationButtonText}>
                {gettingLocation ? 'Mengambil Lokasi...' : 'Gunakan Lokasi Saat Ini'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Radius (Meter)</Text>
              <TextInput
                style={styles.input}
                value={form.radius_meters}
                onChangeText={(t) => setForm({...form, radius_meters: t.replace(/[^0-9]/g, '')})}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={qrModalVisible}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <Text style={styles.modalTitle}>{qrData?.name}</Text>
            <Text style={styles.qrSubtitle}>Scan untuk presensi kehadiran</Text>
            
            <View style={styles.qrContainer}>
              {qrData && (
                <QRCode
                  value={qrData.qr_token}
                  size={200}
                />
              )}
            </View>

            <TouchableOpacity 
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
  },
  center: {
    flex: 1,
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  radiusText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
    paddingTop: 12,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  locationButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    width: '100%',
  },
  closeButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
});
