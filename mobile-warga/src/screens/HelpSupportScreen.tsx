import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { BackButton } from '../components/BackButton';
import { AccordionItem } from '../components/AccordionItem';
import { FloatingAssistant } from '../components/FloatingAssistant';
import { RobotMascot } from '../components/RobotMascot';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const HelpSupportScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const { colors, isDarkMode } = useTheme();
  const [ticketForm, setTicketForm] = useState({
    category: 'Lainnya',
    description: '',
    screenshot: null as ImagePicker.ImagePickerAsset | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [robotModalVisible, setRobotModalVisible] = useState(false);
  
  // Admin Chat Modal
  const [adminChatModalVisible, setAdminChatModalVisible] = useState(false);
  const [adminChatData, setAdminChatData] = useState({
    name: '',
    rtrw: '',
    issue: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        setAdminChatData(prev => ({
          ...prev,
          name: user.name || '',
          rtrw: user.rt ? `${user.rt}/${user.rw || ''}` : ''
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const openAdminChat = () => {
    setRobotModalVisible(false);
    setAdminChatModalVisible(true);
  };

  const sendToWhatsApp = () => {
    const text = `Halo Admin KND RT Online, saya butuh bantuan.\n\nNama: ${adminChatData.name}\nRT/RW: ${adminChatData.rtrw}\nKendala: ${adminChatData.issue}`;
    const encodedText = encodeURIComponent(text);
    Linking.openURL(`https://wa.me/628972498383?text=${encodedText}`);
    setAdminChatModalVisible(false);
  };
  
  const scrollViewRef = useRef<ScrollView>(null);

  const faqData = [
    {
      category: 'Akun & Login',
      items: [
        { q: 'Cara daftar sebagai warga?', a: 'Daftar melalui menu registrasi, isi data lengkap, lalu tunggu verifikasi RT/RW.' },
        { q: 'Cara verifikasi akun?', a: 'Setelah daftar, admin RT akan memverifikasi data dalam 1x24 jam.' },
        { q: 'Lupa password?', a: 'Gunakan fitur "Lupa Password" dan ikuti instruksi OTP.' },
        { q: 'Cara ganti nomor HP?', a: 'Masuk ke Profil → Edit → Ubah nomor.' },
      ]
    },
    {
      category: 'Iuran & Pembayaran',
      items: [
        { q: 'Cara bayar iuran?', a: 'Pilih menu Iuran → Pilih tagihan → Bayar.' },
        { q: 'Metode pembayaran?', a: 'Transfer bank / e-wallet / QRIS.' },
        { q: 'Status pending?', a: 'Tunggu konfirmasi otomatis sistem atau admin.' },
        { q: 'Bukti pembayaran tidak muncul?', a: 'Cek riwayat transaksi atau hubungi admin.' },
      ]
    },
    {
      category: 'UMKM',
      items: [
        { q: 'Cara membuat toko?', a: 'Masuk menu UMKM → Buat Toko → Lengkapi data.' },
        { q: 'Cara upload produk?', a: 'Tambah Produk → Upload foto → Simpan.' },
        { q: 'Produk tidak tampil?', a: 'Pastikan status produk aktif.' },
      ]
    },
    {
      category: 'Laporan & Pengaduan',
      items: [
        { q: 'Cara buat laporan?', a: 'Menu Laporan → Tambah Laporan.' },
        { q: 'Cara cek status?', a: 'Lihat di riwayat laporan.' },
      ]
    },
    {
      category: 'Fitur Darurat',
      items: [
        { q: 'Fungsi tombol darurat?', a: 'Mengirim notifikasi cepat ke RT.' },
        { q: 'Siapa yang menerima?', a: 'RT dan pengurus terkait.' },
        { q: 'Apakah langsung ke RT?', a: 'Ya, notifikasi real-time.' },
      ]
    }
  ];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setTicketForm({ ...ticketForm, screenshot: result.assets[0] });
    }
  };

  const submitTicket = async () => {
    if (!ticketForm.description.trim()) {
      Alert.alert('Error', 'Deskripsi masalah wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', ticketForm.category);
      formData.append('description', ticketForm.description);
      formData.append('role', 'warga'); // Default logic, can be dynamic
      
      if (ticketForm.screenshot) {
        // @ts-ignore
        formData.append('screenshot', {
          uri: ticketForm.screenshot.uri,
          type: 'image/jpeg',
          name: 'screenshot.jpg',
        });
      }

      await api.post('/support/tickets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Sukses', 'Laporan masalah berhasil dikirim. Kami akan segera meninjaunya.');
      setTicketForm({ category: 'Lainnya', description: '', screenshot: null });
    } catch (error) {
      console.error(error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRobotAction = (action: string) => {
    setRobotModalVisible(false);
    switch (action) {
      case 'faq':
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        break;
      case 'admin':
        openAdminChat();
        break;
      case 'report':
        scrollViewRef.current?.scrollToEnd({ animated: true });
        break;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with Gradient */}
        <LinearGradient
            colors={isDarkMode ? ['#059669', '#047857'] : ['#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20 }}
        >
            <View style={styles.headerRow}>
                <BackButton color="#fff" onPress={() => onNavigate('SETTINGS')} />
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} /> 
            </View>
        </LinearGradient>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: FAQ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>FAQ (Tanya Jawab)</Text>
          {faqData.map((section, index) => (
            <View key={index} style={{ marginBottom: 12 }}>
              <Text style={[styles.subCategoryTitle, { color: colors.textSecondary }]}>{section.category}</Text>
              {section.items.map((item, idx) => (
                <AccordionItem key={idx} title={item.q}>
                  <Text style={[styles.accordionContent, { color: colors.textSecondary }]}>{item.a}</Text>
                </AccordionItem>
              ))}
            </View>
          ))}
        </View>

        {/* Section 2: Panduan Penggunaan */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Panduan Penggunaan</Text>
          <View style={styles.guideGrid}>
            {['Warga', 'RT', 'RW', 'UMKM'].map((role) => (
              <TouchableOpacity 
                key={role} 
                style={[styles.guideCard, { backgroundColor: isDarkMode ? '#1e293b' : '#fff', shadowColor: colors.shadow }]}
                onPress={() => Alert.alert('Info', `Panduan ${role} akan segera tersedia`)}
              >
                <View style={[styles.guideIcon, { backgroundColor: isDarkMode ? '#334155' : '#ecfdf5' }]}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.guideText, { color: colors.text }]}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 3: Hubungi Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hubungi Support</Text>
          <View style={[styles.contactCard, { backgroundColor: isDarkMode ? '#1e293b' : '#fff' }]}>
            <View style={styles.contactItem}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.contactText, { color: colors.text }]}>08.00 – 21.00 WIB</Text>
            </View>
            <View style={styles.contactButtons}>
              <TouchableOpacity 
                style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
                onPress={openAdminChat}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={styles.contactBtnText}>Chat Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.contactBtn, { backgroundColor: colors.primary }]}
                onPress={() => Linking.openURL('mailto:admin@knd.awancreative.com')}
              >
                <MaterialCommunityIcons name="email-outline" size={18} color="#fff" />
                <Text style={styles.contactBtnText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 4: Report Bug */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Laporkan Masalah</Text>
          <View style={[styles.formCard, { backgroundColor: isDarkMode ? '#1e293b' : '#fff' }]}>
            <Text style={[styles.label, { color: colors.text }]}>Kategori</Text>
            <View style={[styles.pickerContainer, { borderColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                {['Bug/Error', 'Saran Fitur', 'Lainnya'].map(opt => (
                    <TouchableOpacity 
                        key={opt}
                        style={[
                            styles.chip, 
                            ticketForm.category === opt && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => setTicketForm({...ticketForm, category: opt})}
                    >
                        <Text style={[
                            styles.chipText, 
                            { color: ticketForm.category === opt ? '#fff' : colors.textSecondary }
                        ]}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Deskripsi</Text>
            <TextInput
              style={[styles.textArea, { 
                color: colors.text, 
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc'
              }]}
              multiline
              numberOfLines={4}
              placeholder="Jelaskan masalah yang Anda alami..."
              placeholderTextColor={colors.textSecondary}
              value={ticketForm.description}
              onChangeText={(text) => setTicketForm({...ticketForm, description: text})}
            />

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Screenshot (Opsional)</Text>
            <TouchableOpacity 
                style={[styles.uploadBox, { borderColor: isDarkMode ? '#334155' : '#e2e8f0' }]} 
                onPress={pickImage}
            >
              {ticketForm.screenshot ? (
                <Image source={{ uri: ticketForm.screenshot.uri }} style={styles.previewImage} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                    <MaterialCommunityIcons name="image-plus" size={24} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Upload Foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={submitTicket}
                disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Kirim Laporan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Robot Assistant */}
      <FloatingAssistant onPress={() => setRobotModalVisible(true)} />

      {/* Robot Modal */}
      <Modal
        visible={robotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRobotModalVisible(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setRobotModalVisible(false)}
        >
          <View style={[styles.bottomSheet, { backgroundColor: isDarkMode ? '#1e293b' : '#fff' }]}>
            <View style={styles.handleIndicator} />
            <View style={styles.robotHeader}>
                <MaterialCommunityIcons name="robot-happy" size={40} color={colors.primary} />
                <View style={{ marginLeft: 16 }}>
                    <Text style={[styles.robotTitle, { color: colors.text }]}>Hai 👋</Text>
                    <Text style={[styles.robotSubtitle, { color: colors.textSecondary }]}>Ada yang bisa saya bantu?</Text>
                </View>
            </View>
            
            <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionItem} onPress={() => handleRobotAction('faq')}>
                    <View style={[styles.actionIcon, { backgroundColor: '#e0f2fe' }]}>
                        <MaterialCommunityIcons name="frequently-asked-questions" size={24} color="#0ea5e9" />
                    </View>
                    <Text style={[styles.actionText, { color: colors.text }]}>Cari FAQ</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionItem} onPress={() => handleRobotAction('admin')}>
                    <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="chatbubbles" size={24} color="#22c55e" />
                    </View>
                    <Text style={[styles.actionText, { color: colors.text }]}>Chat Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => handleRobotAction('report')}>
                    <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                        <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
                    </View>
                    <Text style={[styles.actionText, { color: colors.text }]}>Lapor Bug</Text>
                </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Admin Chat Modal */}
      <Modal
        visible={adminChatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAdminChatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#fff' }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Hubungi Admin</Text>
            <Text style={[styles.dialogSubtitle, { color: colors.textSecondary }]}>
              Mohon lengkapi data sebelum terhubung ke WhatsApp:
            </Text>

            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Nama</Text>
                <TextInput 
                    style={[styles.inputField, { color: colors.text, borderColor: isDarkMode ? '#334155' : '#cbd5e1', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}
                    value={adminChatData.name}
                    onChangeText={(t) => setAdminChatData({...adminChatData, name: t})}
                    placeholder="Nama Lengkap"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>RT/RW</Text>
                <TextInput 
                    style={[styles.inputField, { color: colors.text, borderColor: isDarkMode ? '#334155' : '#cbd5e1', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}
                    value={adminChatData.rtrw}
                    onChangeText={(t) => setAdminChatData({...adminChatData, rtrw: t})}
                    placeholder="Contoh: 01/02"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Kendala</Text>
                <TextInput 
                    style={[styles.inputField, { color: colors.text, borderColor: isDarkMode ? '#334155' : '#cbd5e1', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', height: 80, textAlignVertical: 'top' }]}
                    value={adminChatData.issue}
                    onChangeText={(t) => setAdminChatData({...adminChatData, issue: t})}
                    placeholder="Tulis kendala Anda..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                />
            </View>

            <View style={styles.dialogActions}>
                <TouchableOpacity 
                    style={[styles.dialogButton, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}
                    onPress={() => setAdminChatModalVisible(false)}
                >
                    <Text style={{ color: colors.text }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.dialogButton, { backgroundColor: '#25D366' }]}
                    onPress={sendToWhatsApp}
                >
                    <Ionicons name="logo-whatsapp" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lanjut ke WA</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  accordionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  guideCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  guideIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  guideText: {
    fontWeight: '600',
  },
  contactCard: {
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  contactText: {
    fontWeight: '500',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  contactBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipText: {
    fontSize: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  robotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  robotTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  robotSubtitle: {
    fontSize: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dialogContainer: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});

export default HelpSupportScreen;
