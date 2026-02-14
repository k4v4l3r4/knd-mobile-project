import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api, { getStorageUrl } from '../services/api';
import { authService } from '../services/auth';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { DemoLabel } from '../components/TenantStatusComponents';

const { width } = Dimensions.get('window');

interface User {
  id: number;
  name: string;
  phone: string;
  photo_url: string | null;
}

interface Member {
  id: number;
  user: User;
}

interface Schedule {
  id: number;
  day_of_week: string;
  week_number?: number;
  start_time: string;
  end_time: string;
  shift_name?: string;
  start_date?: string;
  schedule_type?: 'DAILY' | 'WEEKLY';
  members: Member[];
}

interface Fine {
  id: number;
  user: User;
  amount: string;
  fine_type: string;
  status: 'PAID' | 'UNPAID';
  generated_at: string;
}

interface PatrolScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function PatrolScreen({ onNavigate }: PatrolScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const { isExpired } = useTenant();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [mySchedules, setMySchedules] = useState<Schedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [finesList, setFinesList] = useState<Fine[]>([]);
  const [isRT, setIsRT] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Member Management State
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedScheduleForMember, setSelectedScheduleForMember] = useState<Schedule | null>(null);
  const [wargaList, setWargaList] = useState<User[]>([]);
  const [searchWargaQuery, setSearchWargaQuery] = useState('');

  // Form State
  const [repeatCount, setRepeatCount] = useState(1); // 1 = No repeat
  const [form, setForm] = useState({
    schedule_type: 'WEEKLY',
    day_of_week: 'Monday', // For UI only, logic handled by start_date
    start_time: '22:00',
    end_time: '04:00',
    shift_name: '',
    start_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isManageMode && wargaList.length === 0) {
      fetchWarga();
    }
  }, [isManageMode]);

  const getDayName = (dateStr: string) => {
    try {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const date = new Date(dateStr);
        return days[date.getDay()];
    } catch (e) {
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return '#059669';
      case 'UNPAID': return '#ef4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Lunas';
      case 'UNPAID': return 'Belum Bayar';
      default: return status;
    }
  };

  const fetchWarga = async () => {
    try {
      const response = await api.get('/warga', { params: { per_page: 100 } });
      if (response.data.success) {
        setWargaList(response.data.data.data);
      }
    } catch (error) {
      console.error('Error fetching warga:', error);
    }
  };

  const fetchData = async () => {
    if (isExpired) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const user = await authService.getUser();
      const isRTAdmin = user?.role === 'ADMIN_RT';
      setIsRT(isRTAdmin);

      const promises = [
        api.get('/patrols/today'),
        api.get('/patrols/mine'),
        api.get('/ronda-fines?status=UNPAID')
      ];

      if (isRTAdmin) {
        promises.push(api.get('/ronda-schedules'));
      }

      const results = await Promise.all(promises);
      const todayRes = results[0];
      const myRes = results[1];
      const finesRes = results[2];
      const allRes = isRTAdmin ? results[3] : null;

      if (todayRes.data.success) {
        const data = todayRes.data.data;
        if (Array.isArray(data)) {
          setTodaySchedules(data);
        } else if (data) {
          setTodaySchedules([data]);
        } else {
          setTodaySchedules([]);
        }
      }
      
      if (myRes.data.success) {
        setMySchedules(myRes.data.data);
      }

      if (finesRes.data.success) {
        // Handle paginated response or simple list
        const finesData = finesRes.data.data.data || finesRes.data.data;
        if (Array.isArray(finesData)) {
           setFinesList(finesData);
        }
      }

      if (allRes && allRes.data.success) {
         const schedules = allRes.data.all_schedules || [];
         const mappedSchedules = schedules.map((s: any) => ({
             ...s,
             members: s.participants || s.members || []
         }));
         setAllSchedules(mappedSchedules);
      }

    } catch (error) {
      console.error('Error fetching patrol data:', error);
      Alert.alert('Error', 'Gagal memuat jadwal ronda');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      schedule_type: 'WEEKLY',
      day_of_week: 'Monday',
      start_time: '22:00',
      end_time: '04:00',
      shift_name: '',
      start_date: new Date().toISOString().split('T')[0]
    });
    setRepeatCount(1);
    setIsEditing(false);
    setSelectedSchedule(null);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setIsEditing(true);
    setSelectedSchedule(schedule);
    setForm({
      schedule_type: schedule.schedule_type || 'WEEKLY',
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.substring(0, 5),
      end_time: schedule.end_time.substring(0, 5),
      shift_name: schedule.shift_name || '',
      start_date: schedule.start_date || new Date().toISOString().split('T')[0]
    });
    setModalVisible(true);
  };

  const saveSchedule = async () => {
    try {
      setLoading(true);
      const payload = {
         ...form,
         schedule_type: form.schedule_type,
         start_time: form.start_time,
         end_time: form.end_time,
         shift_name: form.shift_name,
         start_date: form.start_date
      };

      if (isEditing && selectedSchedule) {
         await api.put(`/ronda-schedules/${selectedSchedule.id}`, payload);
      } else {
         // Handle repeat logic for new schedules
         const promises = [];
         const baseDate = new Date(form.start_date);
         
         for (let i = 0; i < repeatCount; i++) {
             const nextDate = new Date(baseDate);
             nextDate.setDate(baseDate.getDate() + (i * 7)); // Add 7 days for each iteration
             const dateStr = nextDate.toISOString().split('T')[0];
             
             promises.push(api.post('/ronda-schedules', {
                 ...payload,
                 start_date: dateStr
             }));
         }
         
         await Promise.all(promises);
      }
      
      setModalVisible(false);
      resetForm();
      fetchData();
      Alert.alert('Sukses', repeatCount > 1 ? `${repeatCount} Jadwal berhasil dibuat` : 'Jadwal berhasil disimpan');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal menyimpan jadwal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    Alert.alert(
        'Hapus Jadwal',
        'Apakah Anda yakin ingin menghapus jadwal ini?',
        [
            { text: 'Batal', style: 'cancel' },
            { 
                text: 'Hapus', 
                style: 'destructive', 
                onPress: async () => {
                    try {
                        setLoading(true);
                        await api.delete(`/ronda-schedules/${scheduleId}`);
                        fetchData();
                        Alert.alert('Sukses', 'Jadwal berhasil dihapus');
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message || 'Gagal menghapus jadwal');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        ]
    );
  };

  const handleOpenMembers = (schedule: Schedule) => {
    setSelectedScheduleForMember(schedule);
    setMemberModalVisible(true);
  };

  const handleAddMember = async (userId: number) => {
    if (!selectedScheduleForMember) return;
    try {
        await api.post(`/ronda-schedules/${selectedScheduleForMember.id}/assign`, { user_id: userId });
        // Refresh local state optimistically or re-fetch
        const updatedSchedule = { ...selectedScheduleForMember };
        // We need to fetch data to get the proper member object structure or just re-fetch everything
        fetchData(); 
        
        // Optimistic update for UI responsiveness
        const user = wargaList.find(w => w.id === userId);
        if (user) {
             // This is complex to update deep state, so re-fetch is better, but let's show success
             Alert.alert('Sukses', 'Anggota ditambahkan');
        }
    } catch (error: any) {
        Alert.alert('Error', error.response?.data?.message || 'Gagal menambahkan anggota');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedScheduleForMember) return;
    try {
        await api.delete(`/ronda-schedules/${selectedScheduleForMember.id}/users/${userId}`);
        fetchData();
        Alert.alert('Sukses', 'Anggota dihapus');
    } catch (error: any) {
        Alert.alert('Error', error.response?.data?.message || 'Gagal menghapus anggota');
    }
  };

  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberCard}>
      <View style={styles.avatarContainer}>
        {item.user.photo_url ? (
          <Image 
            source={{ uri: getStorageUrl(item.user.photo_url) || '' }} 
            style={styles.avatar} 
          />
        ) : (
          <View
            style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
          >
            <Text style={styles.avatarText}>{item.user.name.charAt(0)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.memberName} numberOfLines={1}>{item.user.name}</Text>
    </View>
  );

  const renderManageItem = ({ item }: { item: Schedule }) => (
    <View style={styles.manageCard}>
        <View style={styles.manageHeader}>
            <View>
                <Text style={styles.manageTitle}>{item.shift_name || item.day_of_week}</Text>
                <Text style={styles.manageSubtitle}>
                    {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)} • {item.members?.length || 0} Petugas
                </Text>
            </View>
            <View style={styles.statusBadge}>
                 <Text style={styles.manageStatusText}>{item.schedule_type || 'WEEKLY'}</Text>
            </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.manageActions}>
            <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                onPress={() => handleEditSchedule(item)}
            >
                <Feather name="edit-2" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#3b82f620' }]}
                onPress={() => handleOpenMembers(item)}
            >
                <Feather name="users" size={18} color="#3b82f6" />
                <Text style={[styles.actionText, { color: '#3b82f6' }]}>Anggota</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ef444420' }]}
                onPress={() => handleDeleteSchedule(item.id)}
            >
                <Feather name="trash-2" size={18} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Hapus</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  if (loading && !todaySchedules.length && !allSchedules.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[styles.headerBackground, { backgroundColor: colors.primary }]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Jadwal Ronda</Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40, alignItems: 'flex-end' }}>
              {isRT && (
                <TouchableOpacity onPress={() => setIsManageMode(!isManageMode)}>
                  <MaterialIcons name={isManageMode ? "dashboard" : "settings"} size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.scrollContent,
          mySchedules.length === 0 && { marginTop: 10 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isManageMode ? (
            // Manage Mode View
            <View>
                {/* Admin Quick Actions */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={{ marginBottom: 16 }}
                    contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
                >
                    <TouchableOpacity 
                        style={[styles.chipButton, { borderColor: colors.primary }]} 
                        onPress={() => onNavigate?.('RONDA_FINE_SETTINGS')}
                    >
                        <MaterialCommunityIcons name="cog-outline" size={18} color={colors.primary} />
                        <Text style={[styles.chipText, { color: colors.primary }]}>Atur Denda</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.chipButton, { borderColor: colors.primary }]} 
                        onPress={() => onNavigate?.('RONDA_FINE_REPORT')}
                    >
                        <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
                        <Text style={[styles.chipText, { color: colors.primary }]}>Laporan Denda</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.chipButton, { borderColor: colors.primary }]} 
                        onPress={() => onNavigate?.('RONDA_LOCATION')}
                    >
                        <Ionicons name="location-outline" size={18} color={colors.primary} />
                        <Text style={[styles.chipText, { color: colors.primary }]}>Lokasi & QR Code</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.manageHeaderRow}>
                    <Text style={styles.sectionTitle}>Kelola Jadwal</Text>
                    <TouchableOpacity 
                        style={styles.createButton}
                        onPress={() => {
                            resetForm();
                            setModalVisible(true);
                        }}
                    >
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.createButtonText}>Buat Jadwal</Text>
                    </TouchableOpacity>
                </View>

                {allSchedules.map((schedule) => (
                    <View key={schedule.id} style={{ marginBottom: 16 }}>
                        {renderManageItem({ item: schedule })}
                    </View>
                ))}
                
                {allSchedules.length === 0 && (
                     <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Belum ada jadwal ronda.</Text>
                     </View>
                )}
            </View>
        ) : (
            // Normal View
            <>
                {/* User Quick Actions */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={{ marginBottom: 20 }}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                    <TouchableOpacity 
                        style={[styles.chipButton, { borderColor: colors.primary, backgroundColor: colors.card }]} 
                        onPress={() => onNavigate?.('RONDA_FINE_REPORT')}
                    >
                        <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
                        <Text style={[styles.chipText, { color: colors.primary }]}>Laporan Denda</Text>
                    </TouchableOpacity>
                </ScrollView>

                {mySchedules.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Jadwal Saya</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {mySchedules.map((schedule) => (
                            <LinearGradient 
                                key={schedule.id}
                                colors={[colors.primary, colors.primary + 'CC']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.myScheduleCardSmall}
                            >
                                <View style={styles.myScheduleHeader}>
                                    <View style={styles.myScheduleIconBox}>
                                        <MaterialCommunityIcons name="shield-account" size={20} color={colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.myScheduleDay}>{schedule.day_of_week}</Text>
                                        <Text style={styles.myScheduleTime}>{schedule.start_time.substring(0, 5)} WIB</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        ))}
                    </ScrollView>
                </View>
                )}

                {/* Jadwal Malam Ini Section */}
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>Petugas Malam Ini</Text>
                        <Text style={styles.sectionSubtitleSmall}>Daftar warga yang bertugas hari ini</Text>
                    </View>
                    {todaySchedules.length > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{todaySchedules[0].day_of_week}</Text>
                        </View>
                    )}
                </View>

                {todaySchedules.length > 0 ? (
                <View style={styles.todayContainer}>
                    {todaySchedules.map((schedule, index) => (
                        <View key={schedule.id} style={index > 0 && { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
                            <View style={styles.shiftHeader}>
                                <View style={styles.timeInfoBox}>
                                    <Ionicons name="moon" size={18} color={colors.primary} />
                                    <Text style={styles.timeText}>
                                        {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                                    </Text>
                                </View>
                                {schedule.shift_name && (
                                    <View style={styles.shiftBadge}>
                                        <Text style={styles.shiftBadgeText}>{schedule.shift_name}</Text>
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.membersGrid}>
                                {schedule.members?.length > 0 ? (
                                    <View style={styles.membersListHorizontal}>
                                        {schedule.members.map((member) => (
                                            <View key={member.id} style={styles.memberAvatarWrapper}>
                                                <View style={styles.memberAvatarContainer}>
                                                    {member.user.photo_url ? (
                                                        <Image 
                                                            source={{ uri: getStorageUrl(member.user.photo_url) || '' }} 
                                                            style={styles.memberAvatar} 
                                                        />
                                                    ) : (
                                                        <View style={[styles.memberAvatarPlaceholder, { backgroundColor: colors.primary + '10' }]}>
                                                            <Text style={[styles.memberAvatarText, { color: colors.primary }]}>{member.user.name.charAt(0)}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.memberNameSmall} numberOfLines={1}>{member.user.name.split(' ')[0]}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyMembersBox}>
                                        <Text style={styles.emptyTextSmall}>Belum ada petugas yang ditugaskan</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
                ) : (
                <View style={styles.emptyTodayCard}>
                    <LinearGradient
                        colors={[isDarkMode ? '#1e293b' : '#f8fafc', isDarkMode ? '#0f172a' : '#f1f5f9']}
                        style={styles.emptyTodayGradient}
                    >
                        <MaterialCommunityIcons name="shield-check" size={48} color={colors.primary} style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyTodayTitle}>Aman Terkendali</Text>
                        <Text style={styles.emptyTodayText}>Tidak ada jadwal ronda untuk malam ini</Text>
                    </LinearGradient>
                </View>
                )}

                {/* Fines List Section */}
                {finesList.length > 0 && (
                  <View style={{ marginTop: 32 }}>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text style={styles.sectionTitle}>Tunggakan Denda Ronda</Text>
                        <Text style={styles.sectionSubtitleSmall}>Warga yang belum menyelesaikan denda</Text>
                      </View>
                      <TouchableOpacity onPress={() => onNavigate?.('RondaFineReport')}>
                         <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Lihat Semua</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 10 }}>
                      {finesList.map((fine) => (
                        <TouchableOpacity 
                            key={fine.id} 
                            style={styles.fineCardModern}
                            activeOpacity={0.9}
                        >
                           <View style={styles.fineTopSection}>
                              <Image 
                                source={{ uri: getStorageUrl(fine.user?.photo_url) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(fine.user?.name || 'User') }} 
                                style={styles.fineAvatarModern} 
                              />
                              <View style={[styles.fineStatusBadge, { backgroundColor: getStatusColor(fine.status) + '15' }]}>
                                <Text style={[styles.fineStatusText, { color: getStatusColor(fine.status) }]}>{getStatusLabel(fine.status)}</Text>
                              </View>
                           </View>
                           
                           <View style={styles.fineMiddleSection}>
                              <Text style={styles.fineNameModern} numberOfLines={1}>{fine.user?.name}</Text>
                              <Text style={styles.fineTypeModern}>{fine.fine_type.replace(/_/g, ' ')}</Text>
                           </View>

                           <View style={styles.fineBottomSection}>
                              <Text style={styles.fineAmountLabel}>Total Denda</Text>
                              <Text style={styles.fineAmountModern}>Rp {parseInt(fine.amount).toLocaleString('id-ID')}</Text>
                           </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
            </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Schedule Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Jadwal' : 'Buat Jadwal Baru'}</Text>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tipe Jadwal</Text>
                    <View style={styles.row}>
                        <TouchableOpacity 
                            style={[styles.typeButton, form.schedule_type === 'WEEKLY' && styles.typeButtonActive]}
                            onPress={() => setForm({...form, schedule_type: 'WEEKLY'})}
                        >
                            <Text style={[styles.typeButtonText, form.schedule_type === 'WEEKLY' && styles.typeButtonTextActive]}>Mingguan (Rutin)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.typeButton, form.schedule_type === 'DAILY' && styles.typeButtonActive]}
                            onPress={() => setForm({...form, schedule_type: 'DAILY'})}
                        >
                            <Text style={[styles.typeButtonText, form.schedule_type === 'DAILY' && styles.typeButtonTextActive]}>Harian (Sekali)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nama Shift / Keterangan</Text>
                    <TextInput
                        style={styles.input}
                        value={form.shift_name}
                        onChangeText={(text) => setForm({...form, shift_name: text})}
                        placeholder="Contoh: Ronda Malam Minggu"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Jam Mulai</Text>
                        <TextInput
                            style={styles.input}
                            value={form.start_time}
                            onChangeText={(text) => setForm({...form, start_time: text})}
                            placeholder="22:00"
                            keyboardType="numbers-and-punctuation"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Jam Selesai</Text>
                        <TextInput
                            style={styles.input}
                            value={form.end_time}
                            onChangeText={(text) => setForm({...form, end_time: text})}
                            placeholder="04:00"
                            keyboardType="numbers-and-punctuation"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tanggal Mulai ({getDayName(form.start_date)})</Text>
                    <TextInput
                        style={styles.input}
                        value={form.start_date}
                        onChangeText={(text) => setForm({...form, start_date: text})}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                    />
                    
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 8 }}>
                        <TouchableOpacity 
                            style={[styles.chipButton, { paddingVertical: 6, paddingHorizontal: 12 }]}
                            onPress={() => setForm({...form, start_date: new Date().toISOString().split('T')[0]})}
                        >
                            <Text style={styles.chipText}>Hari Ini</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.chipButton, { paddingVertical: 6, paddingHorizontal: 12 }]}
                            onPress={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + 1);
                                setForm({...form, start_date: d.toISOString().split('T')[0]});
                            }}
                        >
                            <Text style={styles.chipText}>Besok</Text>
                        </TouchableOpacity>
                         <TouchableOpacity 
                            style={[styles.chipButton, { paddingVertical: 6, paddingHorizontal: 12 }]}
                            onPress={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
                                setForm({...form, start_date: d.toISOString().split('T')[0]});
                            }}
                        >
                            <Text style={styles.chipText}>Senin Depan</Text>
                        </TouchableOpacity>
                    </View>

                    {!isEditing && (
                        <View>
                            <Text style={[styles.label, { marginTop: 8 }]}>Ulangi Jadwal (Otomatis)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {[1, 4, 12].map((count) => (
                                    <TouchableOpacity 
                                        key={count}
                                        style={[
                                            styles.typeButton, 
                                            repeatCount === count && styles.typeButtonActive,
                                            { flex: 0, minWidth: 80, paddingHorizontal: 16 }
                                        ]}
                                        onPress={() => setRepeatCount(count)}
                                    >
                                        <Text style={[styles.typeButtonText, repeatCount === count && styles.typeButtonTextActive]}>
                                            {count === 1 ? 'Tidak' : count === 4 ? '1 Bulan (4x)' : '3 Bulan (12x)'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <Text style={[styles.helperText, { marginTop: 8 }]}>
                        {form.schedule_type === 'WEEKLY' 
                            ? 'Jadwal "Mingguan" aktif selama 7 hari.' 
                            : 'Jadwal "Harian" aktif selama 1 hari.'}
                        {repeatCount > 1 && ` Akan dibuat ${repeatCount} jadwal berturut-turut.`}
                    </Text>
                </View>

                <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={saveSchedule}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>Simpan Jadwal</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                >
                    <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* Member Management Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={memberModalVisible}
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                <Text style={styles.modalTitle}>Kelola Anggota</Text>
                
                <Text style={styles.sectionSubtitle}>Anggota Saat Ini ({selectedScheduleForMember ? allSchedules.find(s => s.id === selectedScheduleForMember.id)?.members?.length || 0 : 0})</Text>
                <View style={{ height: 150 }}>
                    <ScrollView nestedScrollEnabled>
                        {selectedScheduleForMember && allSchedules.find(s => s.id === selectedScheduleForMember.id)?.members?.map((member) => (
                            <View key={member.id} style={styles.memberListItem}>
                                <Text style={styles.memberListName}>{member.user.name}</Text>
                                <TouchableOpacity 
                                    onPress={() => handleRemoveMember(member.user.id)}
                                    style={styles.removeButton}
                                >
                                    <Feather name="x" size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionSubtitle}>Tambah Anggota</Text>
                <TextInput
                    style={[styles.input, { marginBottom: 12 }]}
                    placeholder="Cari warga..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchWargaQuery}
                    onChangeText={setSearchWargaQuery}
                />
                
                <View style={{ height: 200 }}>
                    <FlatList
                        data={wargaList.filter(w => w.name.toLowerCase().includes(searchWargaQuery.toLowerCase()))}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => {
                            const isMember = selectedScheduleForMember && allSchedules.find(s => s.id === selectedScheduleForMember.id)?.members?.some(m => m.user.id === item.id);
                            return (
                                <View style={styles.wargaListItem}>
                                    <Text style={styles.wargaName}>{item.name}</Text>
                                    {!isMember ? (
                                        <TouchableOpacity 
                                            style={styles.addButton}
                                            onPress={() => handleAddMember(item.id)}
                                        >
                                            <Ionicons name="add" size={16} color="#fff" />
                                        </TouchableOpacity>
                                    ) : (
                                        <Feather name="check" size={16} color={colors.primary} />
                                    )}
                                </View>
                            );
                        }}
                    />
                </View>

                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setMemberModalVisible(false)}
                >
                    <Text style={styles.closeButtonText}>Selesai</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    headerBackground: {
      paddingBottom: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      zIndex: 10,
    },
    headerContent: {
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 10,
      paddingBottom: 120,
    },
    myScheduleCardSmall: {
      borderRadius: 20,
      padding: 16,
      width: 160,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    myScheduleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    myScheduleIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    myScheduleDay: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    myScheduleTime: {
      fontSize: 12,
      color: '#fff',
      opacity: 0.9,
    },
    sectionSubtitleSmall: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    shiftHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    timeInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '10',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      gap: 8,
    },
    shiftBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    shiftBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    membersGrid: {
      marginTop: 8,
    },
    membersListHorizontal: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    memberAvatarWrapper: {
      alignItems: 'center',
      width: (width - 100) / 4,
    },
    memberAvatarContainer: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      marginBottom: 6,
    },
    memberAvatar: {
      width: 44,
      height: 44,
      borderRadius: 14,
    },
    memberAvatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberAvatarText: {
      fontSize: 16,
      fontWeight: '700',
    },
    memberNameSmall: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    emptyMembersBox: {
      padding: 16,
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTextSmall: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyTodayCard: {
      borderRadius: 24,
      overflow: 'hidden',
    },
    emptyTodayGradient: {
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTodayTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
    },
    emptyTodayText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    fineCardModern: {
      backgroundColor: colors.card,
      width: 220,
      borderRadius: 24,
      padding: 16,
      marginRight: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    fineTopSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    fineAvatarModern: {
      width: 40,
      height: 40,
      borderRadius: 14,
    },
    fineStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    fineStatusText: {
      fontSize: 10,
      fontWeight: '700',
    },
    fineMiddleSection: {
      marginBottom: 16,
    },
    fineNameModern: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    fineTypeModern: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    fineBottomSection: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    fineAmountLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    fineAmountModern: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ef4444',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    scheduleList: {
        gap: 12,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 10,
    },
    myScheduleText: {
      fontSize: 15,
      color: '#fff',
      fontWeight: '600',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    fineCard: {
      width: 200,
      padding: 12,
      borderRadius: 16,
      marginRight: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    fineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    fineAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#f0f0f0',
    },
    fineName: {
      fontSize: 14,
      fontWeight: '700',
    },
    fineType: {
      fontSize: 12,
      color: '#666',
      marginTop: 2,
    },
    fineFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fineAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: '#EF4444',
    },
    statusChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    manageHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginTop: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    sectionSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 10,
        marginTop: 10,
    },
    badge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    badgeText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    todayContainer: {
      backgroundColor: colors.card,
      borderRadius: 30,
      padding: 24,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 3,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    timeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    },
    timeIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
        fontWeight: '600',
    },
    timeText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 20,
    },
    membersLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 16,
    },
    gridRow: {
      justifyContent: 'flex-start',
    },
    memberCard: {
      alignItems: 'center',
      width: (width - 88) / 4, // 4 columns, roughly accounting for padding
      marginBottom: 16,
    },
    avatarContainer: {
      marginBottom: 8,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.card,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    memberName: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      maxWidth: '100%',
    },
    emptyMembers: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    emptyText: {
      color: colors.textSecondary,
      textAlign: 'center',
      fontSize: 14,
    },
    createButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
    },
    createButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: colors.card,
    },
    typeButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    typeButtonText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      color: colors.text,
      fontSize: 16,
    },
    helperText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    submitButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    cancelButton: {
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    manageCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    manageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    manageTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    manageSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    statusBadge: {
        backgroundColor: colors.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    manageStatusText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    manageActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
    },
    // Member Modal Styles
    memberListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    memberListName: {
        fontSize: 16,
        color: colors.text,
    },
    removeButton: {
        padding: 8,
        backgroundColor: '#fee2e2',
        borderRadius: 20,
    },
    wargaListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    wargaName: {
        fontSize: 16,
        color: colors.text,
    },
    addButton: {
        padding: 8,
        backgroundColor: colors.primary,
        borderRadius: 20,
    },
    closeButton: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    closeButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    chipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: colors.card,
        borderWidth: 1,
        gap: 8,
        marginRight: 8,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
    },
  });

