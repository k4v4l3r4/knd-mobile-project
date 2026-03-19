import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, Dimensions, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import * as Location from 'expo-location';

interface AttendanceStatus {
  status: 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED';
  attendance_at?: string;
  clock_out_at?: string;
}

export default function RondaAttendanceScreen({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  // isFocused: true when scanner modal is visible and app is in foreground
  const [isFocused, setIsFocused] = useState(true);
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Kalibrasi Lokasi State
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [bestLocation, setBestLocation] = useState<Location.LocationObject | null>(null);
  const [calibrationMessage, setCalibrationMessage] = useState('');

  // QR Scanner State
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const scannerRef = useRef<CameraView>(null);

  useEffect(() => {
    initScreen();

    // Track app foreground/background to pause camera
    const subscription = AppState.addEventListener('change', (state) => {
      setIsFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  const initScreen = async () => {
    try {
      setLoading(true);
      setInitError(null);

      // Step 1: Request GPS permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setInitError('Izin GPS diperlukan untuk absensi. Silakan aktifkan di pengaturan perangkat.');
        return;
      }

      // Step 2: Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);

      // Step 3: Fetch schedule & attendance status
      await fetchAttendanceStatus();
    } catch (error: any) {
      console.error('initScreen error:', error);
      setInitError('Gagal memuat halaman. Silakan kembali dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      const response = await api.get('/patrols/mine');
      if (response.data.success) {
        const schedules = response.data.data;
        if (schedules && schedules.length > 0) {
          const todaySchedule = schedules[0];
          setScheduleInfo(todaySchedule);

          if (todaySchedule.members && todaySchedule.members.length > 0) {
            const myAttendance = todaySchedule.members.find((m: any) => m.is_me);
            if (myAttendance) {
              setAttendanceStatus({
                status: myAttendance.status,
                attendance_at: myAttendance.attendance_at,
                clock_out_at: myAttendance.clock_out_at,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('fetchAttendanceStatus error:', error);
      // Non-fatal: show empty state
    }
  };

  // FUNGSI KALIBRASI LOKASI OTOMATIS
  const calibrateLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      setCalibrating(true);
      setCalibrationProgress(0);
      setCalibrationMessage('Mengkalibrasi lokasi...');
      
      let bestAccuracy = Infinity;
      let bestLoc: Location.LocationObject | null = null;
      const maxAttempts = 5;
      const timeout = 10000; // 10 detik timeout
      const startTime = Date.now();
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          setCalibrationMessage('Timeout: akurasi belum optimal');
          break;
        }
        
        try {
          // High accuracy mode dengan polling
          const currentLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
          
          const accuracy = currentLoc.coords.accuracy || 100;
          
          // Update progress
          setCalibrationProgress(Math.round((attempt / maxAttempts) * 100));
          setCalibrationMessage(`Akurasi: ${accuracy.toFixed(0)}m (Target: <20m)`);
          
          // Simpan lokasi terbaik (akurasi terkecil)
          if (accuracy < bestAccuracy) {
            bestAccuracy = accuracy;
            bestLoc = currentLoc;
            
            // Jika akurasi sudah bagus (<20m), langsung stop
            if (accuracy < 20) {
              setCalibrationMessage('Akurasi optimal!');
              break;
            }
          }
          
          // Delay 1 detik sebelum polling berikutnya
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err: any) {
          console.warn(`GPS polling attempt ${attempt} failed:`, err.message);
          // Lanjut ke attempt berikutnya
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // Fallback: jika semua attempt gagal atau akurasi masih buruk
      if (!bestLoc) {
        setCalibrationMessage('Akurasi rendah, coba di ruang terbuka');
        // Ambil satu kali lagi sebagai last resort
        try {
          bestLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (err) {
          console.error('Last resort GPS failed:', err);
          return null;
        }
      }
      
      setCalibrating(false);
      setCalibrationMessage('');
      return bestLoc;
    } catch (error: any) {
      console.error('calibrateLocation error:', error);
      setCalibrating(false);
      setCalibrationMessage('Gagal mengkalibrasi lokasi');
      return null;
    }
  };

  // Refresh lokasi manual untuk fallback
  const handleRefreshLocation = async () => {
    try {
      setCalibrationMessage('Mencoba mendapatkan lokasi yang lebih baik...');
      const refreshedLocation = await calibrateLocation();
      
      if (refreshedLocation) {
        setLocation(refreshedLocation);
        const accuracy = refreshedLocation.coords.accuracy || 100;
        
        if (accuracy > 50) {
          Alert.alert(
            'Akurasi Lokasi Rendah',
            `Akurasi GPS saat ini: ${accuracy.toFixed(0)}m. Untuk hasil terbaik:\n\n` +
            `• Keluar ke ruang terbuka\n` +
            `• Hindari gedung tinggi\n` +
            `• Pastikan GPS aktif\n\n` +
            `Lanjutkan dengan akurasi ini?`,
            [
              { text: 'Batal', style: 'cancel' },
              { text: 'Lanjutkan', onPress: () => handleManualCheckIn() }
            ]
          );
        } else {
          handleManualCheckIn();
        }
      } else {
        Alert.alert('Error', 'Gagal mendapatkan lokasi. Silakan coba lagi.');
      }
    } catch (error: any) {
      console.error('handleRefreshLocation error:', error);
      Alert.alert('Error', 'Gagal refresh lokasi');
    }
  };

  // Called after successful check-in/out to refresh status
  const checkAttendanceStatus = async () => {
    try {
      setLoading(true);
      await fetchAttendanceStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    // PRE-CALIBRATION: Lakukan kalibrasi lokasi SEBELUM buka scanner
    setCalibrationMessage('Mengkalibrasi lokasi untuk check-in...');
    const calibratedLocation = await calibrateLocation();
    
    if (!calibratedLocation) {
      Alert.alert('Error', 'Gagal mendapatkan lokasi GPS. Silakan coba lagi atau pastikan GPS aktif.');
      return;
    }
    
    // Simpan lokasi hasil kalibrasi untuk digunakan setelah scan
    setLocation(calibratedLocation);
    const accuracy = calibratedLocation.coords.accuracy || 100;
    
    try {
      // Request camera permission if not yet granted
      if (!permission?.granted) {
        const perm = await requestPermission();
        if (!perm.granted) {
          Alert.alert(
            'Izin Kamera Dibutuhkan',
            'Izin kamera dibutuhkan untuk scan QR Code. Gunakan absensi GPS sebagai alternatif.',
            [
              { text: 'Batal', style: 'cancel' },
              { text: 'Gunakan GPS', onPress: () => handleManualCheckIn() }
            ]
          );
          return;
        }
      }
      
      // Permission granted - open scanner dengan lokasi yang sudah dikalibrasi
      setScannedToken(null);
      setShowScanner(true);
    } catch (error: any) {
      console.error('handleCheckIn error:', error);
      Alert.alert('Error', 'Gagal membuka kamera. Gunakan GPS sebagai alternatif.');
    }
  };

  const handleManualCheckIn = async () => {
    // Gunakan kalibrasi lokasi setiap kali check-in
    setCalibrationMessage('Menyiapkan kalibrasi lokasi...');
    const calibratedLocation = await calibrateLocation();
    
    if (!calibratedLocation) {
      Alert.alert('Error', 'Gagal mendapatkan lokasi GPS. Silakan coba lagi atau pastikan GPS aktif.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post('/ronda-schedules/scan-attendance', {
        qr_token: 'manual-checkin-gps',
        latitude: calibratedLocation.coords.latitude,
        longitude: calibratedLocation.coords.longitude,
      });

      if (response.data.success) {
        Alert.alert(
          'Berhasil!',
          response.data.message || 'Absensi kehadiran berhasil dicatat',
          [{ text: 'OK', onPress: () => checkAttendanceStatus() }]
        );
      } else {
        Alert.alert('Gagal', response.data.message || 'Gagal melakukan absensi');
      }
    } catch (error: any) {
      console.error('handleManualCheckIn error:', error);
      const message = error.response?.data?.message || 'Gagal melakukan absensi';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scannedToken) return; // Prevent double scan
    
    // Cek apakah lokasi hasil pre-calibration masih valid (akurasi < 30m)
    const currentAccuracy = location?.coords.accuracy || 100;
    const needsRecalibration = currentAccuracy > 30;
    
    let finalLocation = location;
    
    if (needsRecalibration || !location) {
      // Re-kalibrasi jika akurasi buruk atau belum ada lokasi
      setCalibrationMessage('Mengkalibrasi ulang lokasi untuk akurasi...');
      finalLocation = await calibrateLocation();
      
      if (!finalLocation) {
        Alert.alert('Error', 'Gagal mendapatkan lokasi GPS. Silakan coba lagi.');
        setScannedToken(null);
        return;
      }
    } else {
      // Gunakan lokasi yang sudah dikalibrasi sebelumnya
      console.log(`Using pre-calibrated location with accuracy: ${currentAccuracy.toFixed(0)}m`);
    }

    setScannedToken(data);
    setShowScanner(false);

    try {
      setSubmitting(true);

      const response = await api.post('/ronda-schedules/scan-attendance', {
        qr_token: data,
        latitude: finalLocation!.coords.latitude,
        longitude: finalLocation!.coords.longitude,
      });

      if (response.data.success) {
        Alert.alert(
          'Berhasil!',
          response.data.message || 'Absensi kehadiran berhasil dicatat',
          [{ text: 'OK', onPress: () => checkAttendanceStatus() }]
        );
      } else {
        Alert.alert('Gagal', response.data.message || 'Gagal melakukan absensi');
        setScannedToken(null); // Allow retry
      }
    } catch (error: any) {
      console.error('handleBarCodeScanned error:', error);
      const message = error.response?.data?.message || 'Gagal melakukan absensi';
      Alert.alert('Error', message);
      setScannedToken(null); // Allow retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    // Gunakan kalibrasi lokasi setiap kali check-out
    setCalibrationMessage('Menyiapkan kalibrasi lokasi...');
    const calibratedLocation = await calibrateLocation();
    
    if (!calibratedLocation) {
      Alert.alert('Error', 'Gagal mendapatkan lokasi GPS. Silakan coba lagi atau pastikan GPS aktif.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post('/ronda-schedules/scan-attendance', {
        qr_token: 'manual-checkout',
        latitude: calibratedLocation.coords.latitude,
        longitude: calibratedLocation.coords.longitude,
      });

      if (response.data.success) {
        Alert.alert(
          'Berhasil!',
          response.data.message || 'Clock out berhasil',
          [{ text: 'OK', onPress: () => checkAttendanceStatus() }]
        );
      } else {
        Alert.alert('Gagal', response.data.message || 'Gagal melakukan clock out');
      }
    } catch (error: any) {
      console.error('handleCheckOut error:', error);
      const message = error.response?.data?.message || 'Gagal melakukan clock out';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render Guards ---

  // Render guard: while loading, show spinner with full background
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Absensi Ronda</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat status absensi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render guard: fatal init error (GPS denied, network error, etc.)
  if (initError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Absensi Ronda</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={[styles.loadingText, { color: '#ef4444', textAlign: 'center', marginHorizontal: 24 }]}>
            {initError}
          </Text>
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 24 }]}
            onPress={initScreen}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Absensi Ronda</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Schedule Info */}
        {scheduleInfo ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
              <View style={styles.cardTitleSection}>
                <Text style={styles.cardTitle}>Jadwal Ronda</Text>
                <Text style={styles.cardSubtitle}>{scheduleInfo.shift_name || 'Petugas Malam'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Tanggal:</Text>
              <Text style={styles.infoValue}>{scheduleInfo.start_date || '-'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Waktu:</Text>
              <Text style={styles.infoValue}>
                {scheduleInfo.start_time || '-'} - {scheduleInfo.end_time || '-'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.noAttendance}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noAttendanceText}>Tidak ada jadwal ronda hari ini</Text>
            </View>
          </View>
        )}

        {/* Attendance Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status Kehadiran</Text>

          {attendanceStatus ? (
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    attendanceStatus.status === 'PRESENT' ? '#10b98120' :
                    attendanceStatus.status === 'ABSENT' ? '#ef444420' :
                    '#f59e0b20'
                }
              ]}>
                <Ionicons
                  name={
                    attendanceStatus.status === 'PRESENT' ? 'checkmark-circle' :
                    attendanceStatus.status === 'ABSENT' ? 'close-circle' :
                    'time-outline'
                  }
                  size={24}
                  color={
                    attendanceStatus.status === 'PRESENT' ? '#10b981' :
                    attendanceStatus.status === 'ABSENT' ? '#ef4444' :
                    '#f59e0b'
                  }
                />
                <Text style={[
                  styles.statusText,
                  {
                    color:
                      attendanceStatus.status === 'PRESENT' ? '#10b981' :
                      attendanceStatus.status === 'ABSENT' ? '#ef4444' :
                      '#f59e0b'
                  }
                ]}>
                  {attendanceStatus.status === 'PRESENT' ? 'Sudah Hadir' :
                   attendanceStatus.status === 'ABSENT' ? 'Belum Hadir' :
                   'Menunggu'}
                </Text>
              </View>

              {attendanceStatus.attendance_at && (
                <View style={styles.timeRow}>
                  <Ionicons name="log-in" size={20} color="#10b981" />
                  <Text style={styles.timeText}>
                    Check-in: {new Date(attendanceStatus.attendance_at).toLocaleString('id-ID')}
                  </Text>
                </View>
              )}

              {attendanceStatus.clock_out_at && (
                <View style={styles.timeRow}>
                  <Ionicons name="log-out" size={20} color="#3b82f6" />
                  <Text style={styles.timeText}>
                    Check-out: {new Date(attendanceStatus.clock_out_at).toLocaleString('id-ID')}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noAttendance}>
              <Ionicons name="person-remove-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noAttendanceText}>Anda belum melakukan absensi</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {!attendanceStatus || attendanceStatus.status !== 'PRESENT' ? (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleCheckIn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Check-In / Saya Sudah Hadir</Text>
              </>
            )}
          </TouchableOpacity>
        ) : !attendanceStatus.clock_out_at ? (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#3b82f6' }, submitting && styles.submitButtonDisabled]}
            onPress={handleCheckOut}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-out" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Check-Out / Selesai Tugas</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.completedCard}>
            <Ionicons name="checkmark-done-circle" size={48} color="#10b981" />
            <Text style={styles.completedText}>Tugas ronda selesai. Terima kasih!</Text>
          </View>
        )}

        {/* Helper Text */}
        <View style={styles.helperCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.helperText}>• Scan QR Code di pos ronda untuk absensi kehadiran</Text>
          <Text style={styles.helperText}>• Atau gunakan GPS untuk verifikasi lokasi Anda</Text>
          <Text style={styles.helperText}>• Check-in dilakukan saat mulai bertugas</Text>
          <Text style={styles.helperText}>• Check-out dilakukan setelah selesai bertugas</Text>
        </View>
      </ScrollView>

      {/* Kalibrasi Lokasi Modal */}
      <Modal
        visible={calibrating || calibrationMessage !== ''}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!calibrating) setCalibrationMessage('');
        }}
      >
        <View style={styles.calibrationOverlay}>
          <View style={styles.calibrationCard}>
            {calibrating ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.calibrationTitle}>Sedang mengkalibrasi lokasi...</Text>
                <Text style={styles.calibrationMessage}>{calibrationMessage}</Text>
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${calibrationProgress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{calibrationProgress}%</Text>
                </View>
                
                <Text style={styles.calibrationHint}>
                  Mohon tunggu beberapa detik untuk akurasi terbaik
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="location" size={48} color="#f59e0b" />
                <Text style={styles.calibrationTitle}>Akurasi Lokasi Rendah</Text>
                <Text style={styles.calibrationMessage}>{calibrationMessage}</Text>
                
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefreshLocation}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.refreshButtonText}>Refresh Lokasi</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={() => setCalibrationMessage('')}
                >
                  <Text style={styles.continueButtonText}>Lanjutkan</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal - transparent:false prevents blank/black screen */}
      <Modal
        visible={showScanner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => { setShowScanner(false); setScannedToken(null); }}
      >
        <View style={styles.scannerFullScreen}>

          {/* Camera View - only render when focused AND permission granted */}
          {permission?.granted && isFocused && showScanner ? (
            <CameraView
              ref={scannerRef}
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scannedToken ? undefined : handleBarCodeScanned}
            />
          ) : null}

          {/* No Permission Overlay */}
          {!permission?.granted && (
            <View style={styles.noPermissionOverlay}>
              <Ionicons name="alert-circle" size={64} color="#ef4444" />
              <Text style={styles.noPermissionText}>
                Izin kamera dibutuhkan untuk scan QR
              </Text>
              <Text style={styles.noPermissionSub}>
                Silakan gunakan tombol GPS di bawah
              </Text>
            </View>
          )}

          {/* Scan Frame Overlay */}
          {permission?.granted && isFocused && (
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.overlayTop} />
              <View style={styles.overlayMiddle}>
                <View style={styles.overlayLeft} />
                <View style={styles.scanFrame}>
                  <View style={styles.cornerTopLeft} />
                  <View style={styles.cornerTopRight} />
                  <View style={styles.cornerBottomLeft} />
                  <View style={styles.cornerBottomRight} />
                  <Text style={styles.scanInstruction}>Arahkan ke QR Code</Text>
                </View>
                <View style={styles.overlayRight} />
              </View>
              <View style={styles.overlayBottom} />
            </View>
          )}

          {/* Header Bar */}
          <SafeAreaView style={styles.scannerHeaderSafe}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan QR Code Pos Ronda</Text>
              <TouchableOpacity onPress={() => { setShowScanner(false); setScannedToken(null); }}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* GPS Fallback Button - always visible at bottom */}
          <SafeAreaView style={styles.scannerFooterSafe}>
            <TouchableOpacity
              style={styles.manualButton}
              onPress={handleManualCheckIn}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="location" size={20} color="#fff" />
                  <Text style={styles.manualButtonText}>Gunakan Lokasi GPS Saja</Text>
                </>
              )}
            </TouchableOpacity>
          </SafeAreaView>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleSection: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noAttendance: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noAttendanceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  submitButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#10b981',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedCard: {
    margin: 16,
    padding: 24,
    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
    borderRadius: 16,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  helperCard: {
    margin: 16,
    padding: 16,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    gap: 8,
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Scanner - Full Screen Modal
  scannerFullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeaderSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scannerFooterSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  noPermissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 40,
  },
  noPermissionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noPermissionSub: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    flex: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 250,
    width: '100%',
  },
  overlayLeft: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  overlayRight: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayBottom: {
    flex: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10b981',
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10b981',
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10b981',
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10b981',
    borderBottomRightRadius: 8,
  },
  scanInstruction: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    fontWeight: '600',
  },
  manualButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Kalibrasi Styles
  calibrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calibrationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  calibrationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  calibrationMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 10,
    width: 45,
  },
  calibrationHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    marginTop: 15,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  continueButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
