import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  TextInput,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
  Animated,
  PanResponder,
  Linking,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL as API_URL } from '../services/api';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoLabel } from '../components/TenantStatusComponents';

import DateTimePicker from '@react-native-community/datetimepicker';

export default function BoardingScreen() {
  const { t, language } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [boardingHouses, setBoardingHouses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'LIST' | 'TENANTS'>('LIST');
  
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionType, setActionType] = useState<'KOST' | 'TENANT' | null>(null);
  const [selectedItemForAction, setSelectedItemForAction] = useState<any>(null);
  const [selectedParentIdForAction, setSelectedParentIdForAction] = useState<number | null>(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<any>(null);
  const [depositNote, setDepositNote] = useState('');
  const [showUseDepositInput, setShowUseDepositInput] = useState(false);

  // Payment Confirmation State
  const [isPaymentConfirmVisible, setPaymentConfirmVisible] = useState(false);
  const [paymentConfirmData, setPaymentConfirmData] = useState<any>(null);

  const handleOpenPaymentConfirm = () => {
    if (!selectedTenantDetail) return;
    
    // Calculate dates
    const parseLocal = (dateStr: string) => {
        if (!dateStr) return new Date();
        const cleanStr = dateStr.split('T')[0]; 
        const [y, m, d] = cleanStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const currentDue = selectedTenantDetail.due_date ? parseLocal(selectedTenantDetail.due_date) : new Date();
    const duration = parseInt(selectedTenantDetail.rental_duration || '1');
    
    // Period Start = Current Due Date
    // Period End = Current Due Date + Duration
    const nextDue = new Date(currentDue);
    nextDue.setMonth(nextDue.getMonth() + duration);
    
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    setPaymentConfirmData({
      tenantName: selectedTenantDetail.user.name,
      roomNumber: selectedTenantDetail.room_number,
      period: `${formatDate(currentDue)} – ${formatDate(nextDue)}`,
      price: parseInt(selectedTenantDetail.room_price || '0'),
      nextDueDate: nextDue,
      duration: duration
    });
    setPaymentConfirmVisible(true);
  };

  const confirmPayment = async () => {
    try {
      setLoading(true);
      // @ts-ignore
      const response = await api.post(`/boarding-houses/${selectedHouseId}/tenants/${selectedTenantDetail.id}/pay`);
      if (response.data.success) {
        setPaymentConfirmVisible(false);
        
        const nextDateStr = response.data.data?.due_date 
            ? new Date(response.data.data.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-';
            
        // Small notification as requested
        Alert.alert(
            "Sukses", 
            `✔ Sewa berhasil diperpanjang\nJatuh tempo berikutnya: ${nextDateStr}`,
            [{ text: "OK" }]
        );

        if (response.data.data) {
            setSelectedTenantDetail((prev: any) => ({
                ...prev,
                due_date: response.data.data.due_date,
                payment_status: 'PAID'
            }));
        }
        fetchData();
      } else {
        Alert.alert(t('common.failed'), response.data.message || t('boarding.alert.paymentProcessFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.message || t('boarding.alert.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (houseId: number, tenant: any) => {
    setSelectedHouseId(houseId);
    setSelectedTenantDetail(tenant);
    setDetailModalVisible(true);
    setDepositNote(''); // Reset note
    setShowUseDepositInput(false); // Reset input visibility
  };

  const handleOpenActionMenu = (type: 'KOST' | 'TENANT', item: any, parentId: number | null = null) => {
    setActionType(type);
    setSelectedItemForAction(item);
    setSelectedParentIdForAction(parentId);
    setActionMenuVisible(true);
  };

  const executeEditAction = () => {
    setActionMenuVisible(false);
    if (actionType === 'KOST') {
      openEditKost(selectedItemForAction);
    } else if (actionType === 'TENANT' && selectedParentIdForAction) {
      openEditTenant(selectedParentIdForAction, selectedItemForAction);
    }
  };

  const executeDetailAction = () => {
    setActionMenuVisible(false);
    if (actionType === 'TENANT' && selectedParentIdForAction) {
      handleOpenDetail(selectedParentIdForAction, selectedItemForAction);
    }
  };

  const executeDeleteAction = () => {
    setActionMenuVisible(false);
    if (actionType === 'KOST') {
      handleDeleteKost(selectedItemForAction.id);
    } else if (actionType === 'TENANT' && selectedParentIdForAction) {
      handleDeleteTenant(selectedParentIdForAction, selectedItemForAction.id);
    }
  };
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'start_date' | 'due_date'>('start_date');
  
  // Add Kost Form
  const [isKostModalVisible, setKostModalVisible] = useState(false);
  const [isEditingKost, setIsEditingKost] = useState(false);
  const [editingKostId, setEditingKostId] = useState<number | null>(null);
  const [kostFormData, setKostFormData] = useState({
    name: '',
    address: '',
    total_rooms: '',
    total_floors: '',
    floor_config: [] as number[],
  });
  
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Add Tenant Form
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    phone: '',
    room_number: '',
    start_date: formatDateLocal(new Date()),
    rental_duration: '1', // Default 1 month
    due_date: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return formatDateLocal(d);
    })(), 
    room_price: '',
    deposit_amount: '',
    gender: 'L',
    marital_status: 'BELUM_KAWIN',
    occupation: '',
    ktp_image: null as any,
    notificationEnabled: true
  });

  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          setModalVisible(false);
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 5
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isModalVisible) {
      panY.setValue(0);
    }
  }, [isModalVisible]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUserRole(userData.role || 'WARGA_KOST');
      }

      // @ts-ignore
      const response = await api.get('/boarding-houses');
      
      if (response.data.success) {
        setBoardingHouses(response.data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert(t('common.error'), t('boarding.alert.loadFailed'));
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handleAddKost = async () => {
    if (!kostFormData.name || !kostFormData.address || !kostFormData.total_rooms) {
      Alert.alert(t('common.error'), t('boarding.alert.validationKost'));
      return;
    }

    try {
      setLoading(true);
      
      let response;
      if (isEditingKost && editingKostId) {
        // @ts-ignore
        response = await api.put(`/boarding-houses/${editingKostId}`, kostFormData);
      } else {
        // @ts-ignore
        response = await api.post('/boarding-houses', kostFormData);
      }
      
      if (response.data.success) {
        Alert.alert(t('common.success'), isEditingKost ? t('boarding.alert.successEdit') : t('boarding.alert.successAdd'));
        setKostModalVisible(false);
        setKostFormData({ name: '', address: '', total_rooms: '', total_floors: '', floor_config: [] });
        setIsEditingKost(false);
        setEditingKostId(null);
        
        // If user was not a Juragan, they are now (conceptually)
        if (userRole !== 'JURAGAN_KOST') {
          setUserRole('JURAGAN_KOST');
          await AsyncStorage.mergeItem('user_data', JSON.stringify({ role: 'JURAGAN_KOST' }));
        }
        
        fetchData();
      } else {
        Alert.alert(t('common.failed'), response.data.message || (isEditingKost ? t('boarding.alert.failedEdit') : t('boarding.alert.failedAdd')));
      }
    } catch (error) {
      console.error('Add/Edit kost error:', error);
      Alert.alert(t('common.error'), t('boarding.alert.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const openEditKost = (kost: any) => {
    let config = kost.floor_config || [];
    
    // If no config exists, create a default distribution
    if (!config || config.length === 0) {
      const rooms = kost.total_rooms || 0;
      const floors = kost.total_floors || 1;
      const base = Math.floor(rooms / floors);
      const remainder = rooms % floors;
      
      config = [];
      for(let i = 0; i < floors; i++) {
        config.push(base + (i < remainder ? 1 : 0));
      }
    }

    setKostFormData({
      name: kost.name,
      address: kost.address,
      total_rooms: String(kost.total_rooms),
      total_floors: String(kost.total_floors || 1),
      floor_config: config
    });
    setEditingKostId(kost.id);
    setIsEditingKost(true);
    setKostModalVisible(true);
  };

  const handleDeleteKost = (id: number) => {
    Alert.alert(t('boarding.alert.deleteKostTitle'), t('boarding.alert.deleteKostMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          // @ts-ignore
          const response = await api.delete(`/boarding-houses/${id}`);
          if (response.data.success) {
            Alert.alert(t('common.success'), t('boarding.alert.successDelete'));
            fetchData();
          } else {
            Alert.alert(t('common.failed'), response.data.message || t('boarding.alert.failedDelete'));
          }
        } catch (error: any) {
          const message = error?.response?.data?.message || t('boarding.alert.networkError');
          Alert.alert(t('common.error'), message);
        } finally {
          setLoading(false);
        }
      }}
    ]);
  };

  const pickImage = async () => {
    setShowImagePickerModal(true);
  };

  const launchGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, ktp_image: result.assets[0] });
    }
  };

  const launchCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('common.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormData({ ...formData, ktp_image: result.assets[0] });
    }
  };

  const handleAddTenant = async () => {
    if (!formData.name || !formData.nik || !selectedHouseId) {
      Alert.alert(t('common.error'), t('boarding.alert.validationTenant'));
      return;
    }
    if (!/^\d{16}$/.test(formData.nik)) {
      Alert.alert(t('common.error'), t('boarding.alert.validationNik'));
      return;
    }

    try {
      setLoading(true);
      
      const house = boardingHouses.find(h => h.id === selectedHouseId);
      const duplicate = house?.tenants?.find((t: any) => 
        (formData.nik && t.user?.nik === formData.nik) || 
        (formData.phone && formData.phone !== '' && t.user?.phone === formData.phone)
      );
      if (duplicate) {
        setLoading(false);
        Alert.alert(
          t('boarding.alert.tenantActive'),
          t('boarding.alert.tenantActiveMsg'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: t('boarding.alert.moveRoom'), 
              onPress: async () => {
                try {
                  setLoading(true);
                  // @ts-ignore
                  const res = await api.patch(`/boarding-houses/${selectedHouseId}/tenants/${duplicate.id}`, {
                    room_number: formData.room_number,
                    start_date: formData.start_date,
                    due_date: formData.due_date,
                    room_price: formData.room_price,
                    deposit_amount: formData.deposit_amount,
                    notification_enabled: formData.notificationEnabled ? '1' : '0'
                  });
                  if (res.data.success) {
                    Alert.alert(t('common.success'), t('boarding.alert.moveSuccess'));
                    setModalVisible(false);
                    fetchData();
                  } else {
                    Alert.alert(t('common.failed'), res.data.message || t('boarding.alert.moveFailed'));
                  }
                } catch (err: any) {
                  Alert.alert(t('common.error'), err?.response?.data?.message || t('boarding.alert.networkError'));
                } finally {
                  setLoading(false);
                }
              } 
            }
          ]
        );
        return;
      }
      
      const data = new FormData();
      data.append('name', formData.name);
      data.append('nik', formData.nik);
      data.append('phone', formData.phone);
      data.append('room_number', formData.room_number);
      data.append('start_date', formData.start_date);
      data.append('rental_duration', formData.rental_duration);
      data.append('due_date', formData.due_date);
      data.append('room_price', formData.room_price);
      data.append('deposit_amount', formData.deposit_amount);
      data.append('gender', formData.gender);
      data.append('marital_status', formData.marital_status);
      data.append('occupation', formData.occupation);
      data.append('notification_enabled', formData.notificationEnabled ? '1' : '0');

      if (formData.ktp_image) {
        const localUri = formData.ktp_image.uri;
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        // @ts-ignore
        data.append('ktp_image', {
          uri: localUri,
          name: filename || 'image.jpg',
          type: type,
        });
      }

      // @ts-ignore
      const url = isEditMode && editingTenantId
        ? `/boarding-houses/${selectedHouseId}/tenants/${editingTenantId}`
        : `/boarding-houses/${selectedHouseId}/tenants`;
      const method = isEditMode && editingTenantId ? 'patch' : 'post';
      // @ts-ignore
      const response = await api[method](url, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        Alert.alert(t('common.success'), isEditMode ? t('boarding.alert.updateSuccess') : t('boarding.alert.addSuccess'));
        setModalVisible(false);
        setFormData({
            name: '',
            nik: '',
            phone: '',
            room_number: '',
            start_date: formatDateLocal(new Date()),
            rental_duration: '1',
            due_date: formatDateLocal(new Date()),
            room_price: '',
            deposit_amount: '',
            gender: 'L',
            marital_status: 'BELUM_KAWIN',
            occupation: '',
            ktp_image: null,
            notificationEnabled: true
          });
        setIsEditMode(false);
        setEditingTenantId(null);
        fetchData(); // Refresh data
      } else {
        Alert.alert(t('common.failed'), response.data.message || (isEditMode ? t('boarding.alert.updateFailed') : t('boarding.alert.addFailed')));
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      const errors = error?.response?.data?.errors;
      let displayMessage = t('boarding.alert.networkError');
      if (status === 422) {
        if (message) {
          displayMessage = message;
        } else if (errors) {
          const firstKey = Object.keys(errors)[0];
          if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey].length > 0) {
            displayMessage = errors[firstKey][0];
          }
        } else {
          displayMessage = t('boarding.alert.invalidData');
        }
      }
      console.error('Add tenant error:', error?.response?.data || error);
      Alert.alert(t('common.error'), displayMessage);
    } finally {
      setLoading(false);
    }
  };

  const openEditTenant = (houseId: number, tenant: any) => {
    setSelectedHouseId(houseId);
    setIsEditMode(true);
    setEditingTenantId(tenant.id);
    setFormData({
      name: tenant.user?.name || '',
      nik: tenant.user?.nik || '',
      phone: tenant.user?.phone || '',
      room_number: tenant.room_number || '',
      start_date: tenant.start_date || formatDateLocal(new Date()),
      rental_duration: tenant.rental_duration ? String(tenant.rental_duration) : '1',
      due_date: tenant.due_date || formatDateLocal(new Date()),
      room_price: tenant.room_price ? String(tenant.room_price) : '',
      deposit_amount: tenant.deposit_amount ? String(tenant.deposit_amount) : '',
      gender: tenant.user?.gender || 'L',
      marital_status: tenant.user?.marital_status || 'BELUM_KAWIN',
      occupation: tenant.user?.occupation || '',
      ktp_image: null,
      notificationEnabled: tenant.notification_enabled ?? true
    });
    setModalVisible(true);
  };

  const handleDeleteTenant = async (houseId: number, tenantId: number) => {
    Alert.alert(t('boarding.alert.deleteTenantTitle'), t('boarding.alert.deleteTenantMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          // @ts-ignore
          const response = await api.delete(`/boarding-houses/${houseId}/tenants/${tenantId}`);
          if (response.data.success) {
            Alert.alert(t('common.success'), t('boarding.alert.deleteSuccess'));
            fetchData();
          } else {
            Alert.alert(t('common.failed'), response.data.message || t('boarding.alert.deleteFailed'));
          }
        } catch (error: any) {
          const message = error?.response?.data?.message || t('boarding.alert.networkError');
          Alert.alert(t('common.error'), message);
        } finally {
          setLoading(false);
        }
      }}
    ]);
  };

  // Duplicate methods removed (handlePayDeposit, handleCheckOut, handleProcessDeposit) - see implementation below

  const calculateRoomStatus = (tenant: any) => {
    if (!tenant) return 'EMPTY';
    
    const now = new Date();
    now.setHours(0,0,0,0);

    // Helper to parse YYYY-MM-DD to Local Midnight
    const parseLocal = (dateStr: string) => {
        if (!dateStr) return null;
        const cleanStr = dateStr.split('T')[0]; 
        const [y, m, d] = cleanStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    if (tenant.status === 'NONAKTIF' || tenant.status === 'MOVED_OUT') return 'NONAKTIF';

    if (tenant.start_date) {
      const start = parseLocal(tenant.start_date);
      if (start && start > now) return 'BELUM_AKTIF';
    }

    const created = tenant.created_at ? parseLocal(String(tenant.created_at)) : null;
    const due = tenant.due_date ? parseLocal(tenant.due_date) : null;

    let paymentStatus: 'PAID' | 'UNPAID' = (tenant.payment_status === 'PAID' || tenant.payment_status === 'UNPAID')
      ? tenant.payment_status
      : 'UNPAID';
    if (!tenant.payment_status) {
      if (due && created && due > created) paymentStatus = 'PAID';
      if (due && !created) paymentStatus = 'PAID';
    }

    if (paymentStatus === 'UNPAID') return 'BELUM_BAYAR';

    if (due && due < now) return 'TUNGGAKAN';

    if (due) {
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 3 && diffDays >= 0) return 'JATUH_TEMPO';
    }

    return 'LUNAS';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LUNAS': return '#10b981'; // Green
      case 'JATUH_TEMPO': return '#f59e0b'; // Amber
      case 'TUNGGAKAN': return '#ef4444'; // Red
      case 'BELUM_BAYAR': return '#f59e0b'; // Amber
      case 'NONAKTIF': return '#64748b'; // Slate
      case 'BELUM_AKTIF': return '#3b82f6'; // Blue
      default: return isDarkMode ? '#334155' : '#e2e8f0'; // Gray/White for Empty
    }
  };

  const handlePayDeposit = async () => {
    if (!selectedHouseId || !selectedTenantDetail) return;
    
    Alert.alert(
      t('boarding.alert.confirmDepositTitle'),
      t('boarding.alert.confirmDepositMsg', { amount: parseInt(selectedTenantDetail.deposit_amount).toLocaleString(language === 'id' ? 'id-ID' : 'en-US') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('boarding.button.markPaid'), 
          onPress: async () => {
            try {
              setLoading(true);
              // @ts-ignore
              const response = await api.post(`/boarding-houses/${selectedHouseId}/tenants/${selectedTenantDetail.id}/pay-deposit`);
              
              if (response.data.success) {
                Alert.alert(t('common.success'), t('boarding.alert.depositSuccess'));
                setSelectedTenantDetail((prev: any) => ({
                    ...prev,
                    deposit_status: 'PAID'
                }));
                fetchData();
              }
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.response?.data?.message || t('boarding.alert.depositProcessError'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCheckOut = () => {
    Alert.alert(
      t('boarding.alert.confirmCheckoutTitle'),
      t('boarding.alert.confirmCheckoutMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('boarding.button.checkOut'), 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoading(true);
              // @ts-ignore
              const response = await api.delete(`/boarding-houses/${selectedHouseId}/tenants/${selectedTenantDetail.id}`);
              
              if (response.data.success) {
                // Refresh data immediately so background grid updates (silent mode to keep modal open)
                fetchData(true);
 
                  // Check if deposit needs processing
                const depositAmount = parseInt(selectedTenantDetail.deposit_amount || '0');
                if (depositAmount > 0 && selectedTenantDetail.deposit_status === 'PAID') {
                  Alert.alert(t('common.info'), t('boarding.alert.checkoutInfo'));
                  // Update local state to reflect status change and trigger deposit processing UI
                  setSelectedTenantDetail((prev: any) => ({ ...prev, status: 'MOVED_OUT' }));
                  setShowUseDepositInput(true); // Using this to trigger Process UI mode
                } else {
                  Alert.alert(t('common.success'), t('boarding.alert.checkoutSuccessSimple'));
                  setDetailModalVisible(false);
                }
              }
            } catch (error: any) {
               Alert.alert(t('common.error'), error?.response?.data?.message || t('boarding.alert.checkoutFailed'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleProcessDeposit = async (action: 'REFUND' | 'USE') => {
    if (action === 'USE' && !depositNote.trim()) {
        Alert.alert(t('common.warning'), t('boarding.alert.processDepositWarning'));
        return;
    }

    try {
        setLoading(true);
        // @ts-ignore
        const response = await api.post(`/boarding-houses/${selectedHouseId}/tenants/${selectedTenantDetail.id}/process-deposit`, {
            action,
            note: depositNote
        });

        if (response.data.success) {
            Alert.alert(t('common.success'), action === 'REFUND' ? t('boarding.alert.refundSuccess') : t('boarding.alert.useDepositSuccess'));
            setDetailModalVisible(false);
            fetchData();
        }
    } catch (error: any) {
        Alert.alert(t('common.error'), error?.response?.data?.message || t('boarding.alert.depositProcessError'));
    } finally {
        setLoading(false);
    }
  };

  const renderRoomGrid = (house: any) => {
    const totalRooms = house.total_rooms || 0;
    const totalFloors = house.total_floors || 1;
    const floorConfig = house.floor_config || [];

    const roomSlots: any[] = [];
    for (let i = 1; i <= totalRooms; i++) {
      roomSlots.push({
        id: i,
        label: `${i}`,
        type: 'EMPTY',
        status: 'KOSONG',
        tenant: null
      });
    }

    house.tenants?.forEach((tenant: any) => {
      const roomNum = parseInt(tenant.room_number);
      if (!isNaN(roomNum) && roomNum >= 1 && roomNum <= totalRooms) {
        roomSlots[roomNum - 1] = {
          ...roomSlots[roomNum - 1],
          type: 'OCCUPIED',
          label: tenant.room_number,
          status: calculateRoomStatus(tenant),
          tenant: tenant
        };
      } else {
        const emptyIndex = roomSlots.findIndex(r => r.type === 'EMPTY');
        if (emptyIndex !== -1) {
          roomSlots[emptyIndex] = {
            ...roomSlots[emptyIndex],
            type: 'OCCUPIED',
            label: tenant.room_number || '?',
            status: calculateRoomStatus(tenant),
            tenant: tenant
          };
        }
      }
    });

    const floors = [];
    let currentRoomIndex = 0;

    for (let f = 0; f < totalFloors; f++) {
      let count = 0;
      if (floorConfig.length > f) {
        count = floorConfig[f];
      } else {
         // Fallback if config missing or incomplete: distribute remaining evenly
         const remainingRooms = totalRooms - currentRoomIndex;
         const remainingFloors = totalFloors - f;
         // Avoid division by zero
         count = remainingFloors > 0 ? Math.ceil(remainingRooms / remainingFloors) : remainingRooms;
      }
      
      const start = currentRoomIndex;
      const end = Math.min(start + count, totalRooms);
      
      floors.push({
        floorNumber: f + 1,
        rooms: roomSlots.slice(start, end)
      });
      
      currentRoomIndex = end;
    }

    return (
      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionHeader}>{t('boarding.roomStatus.title')}</Text>
        
        {/* Legend: Status Kamar */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>{t('boarding.roomStatus.legendTitle')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1' }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('boarding.roomStatus.empty')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6' }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('boarding.roomStatus.notActive')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('boarding.roomStatus.occupied')}</Text>
            </View>
          </View>
        </View>

        {/* Legend: Status Pembayaran */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>{t('boarding.legend.paymentStatus')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('boarding.status.paid')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#f59e0b' }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('boarding.status.dueSoon')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444' }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('boarding.status.overdue')}</Text>
            </View>
          </View>
        </View>

        {/* Floors Loop */}
        {floors.map((floor) => (
          <View key={floor.floorNumber} style={{ marginBottom: 20 }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: colors.textSecondary, 
              marginBottom: 8,
              marginLeft: 0 // Align with grid
            }}>
              {t('boarding.form.floorConfig')} {floor.floorNumber}
            </Text>
            
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: 8,
              justifyContent: 'space-between',
            }}>
              {floor.rooms.map((item: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    width: '18%',
                    aspectRatio: 1,
                    // marginBottom: 12, // Removed to rely on gap for consistent spacing
                    borderRadius: 8,
                    backgroundColor: item.type === 'EMPTY' ? (isDarkMode ? '#1e293b' : '#f8fafc') : (isDarkMode ? '#064e3b' : '#ecfdf5'),
                    borderWidth: 1.5,
                    borderColor: getStatusColor(item.status),
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
            if (item.type === 'OCCUPIED' && item.tenant) {
              handleOpenDetail(house.id, item.tenant);
            } else {
                      // Pre-fill room number and reset form
                      const d = new Date();
                      d.setMonth(d.getMonth() + 1);
                      const nextMonth = formatDateLocal(d);
                      
                      setFormData({
                        name: '',
                        nik: '',
                        phone: '',
                        room_number: item.label,
                        start_date: formatDateLocal(new Date()),
                        rental_duration: '1',
                        due_date: nextMonth,
                        room_price: '',
                        deposit_amount: '',
                        gender: 'L',
                        marital_status: 'BELUM_KAWIN',
                        occupation: '',
                        ktp_image: null,
                        notificationEnabled: true
                      });
                      setSelectedHouseId(house.id);
                      setModalVisible(true);
                    }
                  }}
                >
                  <Text style={{ 
                    fontWeight: 'bold', 
                    color: item.type === 'EMPTY' ? colors.textSecondary : colors.text,
                    fontSize: 14,
                    lineHeight: 18, // Fix bounding box height
                    textAlign: 'center',
                    includeFontPadding: false,
                    padding: 0,
                    margin: 0,
                    // Use transform for precise pixel shifting without affecting layout flow
                    // translateY negative moves it UP
                    transform: [{ translateY: -8 }],
                  }}>
                    {item.label}
                  </Text>
                  {item.type === 'OCCUPIED' && (
                    <View style={{ 
                      position: 'absolute',
                      bottom: 4,
                      width: 4, 
                      height: 4, 
                      borderRadius: 2, 
                      backgroundColor: getStatusColor(item.status),
                    }} />
                  )}
                </TouchableOpacity>
              ))}
              {/* Ghost items to ensure grid alignment */}
              {[...Array((5 - (floor.rooms.length % 5)) % 5)].map((_, i) => (
                <View key={`ghost-${i}`} style={{ width: '18%' }} />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderJuraganView = () => {
    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={boardingHouses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.address}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.total_rooms} {t('boarding.stats.room')}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity 
                  style={[styles.iconAction, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
                  onPress={() => handleOpenActionMenu('KOST', item)}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.divider} />
              
              {renderRoomGrid(item)}

            </View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        />
      </View>
    );
  };

  const renderTenantView = () => {
    if (boardingHouses.length === 0) {
      return (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="home-search-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t('boarding.emptyState.title')}</Text>
          <Text style={styles.emptySubtitle}>{t('boarding.emptyState.subtitle')}</Text>
        </View>
      );
    }

    const house = boardingHouses[0]; // Assuming tenant only belongs to 1 active kost

    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <MaterialCommunityIcons name="home-city" size={32} color={colors.primary} />
             <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{house.name}</Text>
                <Text style={styles.cardSubtitle}>{house.address}</Text>
             </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('boarding.detail.ownerName')}</Text>
            <Text style={styles.value}>{house.owner.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('boarding.detail.ownerContact')}</Text>
            <Text style={styles.value}>{house.owner.phone || '-'}</Text>
          </View>

          <View style={styles.infoRow}>
             <Text style={styles.label}>{t('boarding.detail.totalRooms')}</Text>
             <Text style={styles.value}>{house.total_rooms}</Text>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
           <Text style={styles.cardTitle}>{t('boarding.detail.myStatus')}</Text>
           <View style={styles.divider} />
           {/* In a real app, filter for current user's tenant record */}
           <View style={styles.infoRow}>
             <Text style={styles.label}>{t('boarding.detail.status')}</Text>
             <Text style={[styles.value, { color: 'green' }]}>{t('boarding.status.active')}</Text>
           </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View
        style={[
          styles.headerBackground,
          { backgroundColor: isDarkMode ? '#059669' : '#047857' }
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>
                {userRole === 'JURAGAN_KOST' ? t('boarding.juraganTitle') : t('boarding.tenantTitle')}
              </Text>
              <DemoLabel />
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : userRole === 'JURAGAN_KOST' ? (
        renderJuraganView()
      ) : (
        renderTenantView()
      )}

      {/* Floating Add Kost Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setKostModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Kost Modal */}
      <Modal
        visible={isKostModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setKostModalVisible(false);
          setIsEditingKost(false);
          setKostFormData({ name: '', address: '', total_rooms: '', total_floors: '', floor_config: [] });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditingKost ? t('boarding.editKost') : t('boarding.addKost')}</Text>
            
            <Text style={styles.inputLabel}>{t('boarding.form.kostName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('boarding.form.kostNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={kostFormData.name}
              onChangeText={(text) => setKostFormData({...kostFormData, name: text})}
            />

            <Text style={styles.inputLabel}>{t('boarding.form.kostAddress')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('boarding.form.kostAddressPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              value={kostFormData.address}
              onChangeText={(text) => setKostFormData({...kostFormData, address: text})}
            />

            <Text style={styles.inputLabel}>{t('boarding.form.totalFloors')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('boarding.form.floorsPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={kostFormData.total_floors}
              onChangeText={(text) => {
                const floors = parseInt(text) || 0;
                const totalRooms = parseInt(kostFormData.total_rooms) || 0;
                
                // Better: keep config size in sync with valid floors
                let newConfig = [...kostFormData.floor_config];
                
                if (floors >= 0) {
                    if (floors > newConfig.length) {
                        // Distribute remaining rooms if totalRooms is set, or just add 0
                        // Re-distribute logic if floors change is usually better
                        if (totalRooms > 0 && floors > 0) {
                             const base = Math.floor(totalRooms / floors);
                             const remainder = totalRooms % floors;
                             newConfig = [];
                             for(let i = 0; i < floors; i++) {
                               newConfig.push(base + (i < remainder ? 1 : 0));
                             }
                        } else {
                           for(let i = newConfig.length; i < floors; i++) {
                             newConfig.push(0); // Default 0 for new floors
                           }
                        }
                    } else if (floors < newConfig.length) {
                       newConfig = newConfig.slice(0, floors);
                       // Update total rooms to match sum of remaining floors? 
                       // Or keep total rooms and redistribute?
                       // User probably wants to keep Total Rooms constant and just change floors.
                       if (totalRooms > 0 && floors > 0) {
                             const base = Math.floor(totalRooms / floors);
                             const remainder = totalRooms % floors;
                             newConfig = [];
                             for(let i = 0; i < floors; i++) {
                               newConfig.push(base + (i < remainder ? 1 : 0));
                             }
                       }
                    }
                }
                
                const total = newConfig.reduce((a, b) => a + b, 0);
                
                setKostFormData({
                  ...kostFormData, 
                  total_floors: text,
                  floor_config: newConfig,
                  total_rooms: totalRooms > 0 ? String(totalRooms) : String(total)
                });
              }}
            />

            {parseInt(kostFormData.total_floors) > 0 && (
              <View style={{ marginTop: 4, marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { fontSize: 13, marginBottom: 8 }]}>{t('boarding.form.floorConfig')}</Text>
                {kostFormData.floor_config.map((rooms, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ width: 80, color: colors.text }}>{t('boarding.form.floor')} {index + 1}</Text>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, height: 40, paddingVertical: 8, textAlignVertical: 'center' }]}
                      placeholder={t('boarding.form.roomCountPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={String(rooms)}
                      onChangeText={(text) => {
                        // Allow empty string for editing
                        const val = text === '' ? 0 : parseInt(text);
                        if (isNaN(val)) return;
                        
                        const newConfig = [...kostFormData.floor_config];
                        newConfig[index] = val;
                        const total = newConfig.reduce((a, b) => a + b, 0);
                        setKostFormData({
                           ...kostFormData,
                           floor_config: newConfig,
                           total_rooms: String(total)
                        });
                      }}
                    />
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>{t('boarding.form.totalRooms')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', color: colors.textSecondary }]}
              value={kostFormData.total_rooms}
              placeholder={t('boarding.form.totalRoomsPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              onChangeText={(text) => {
                const total = parseInt(text) || 0;
                const floors = parseInt(kostFormData.total_floors) || 1;
                
                // Recalculate distribution
                const base = Math.floor(total / floors);
                const remainder = total % floors;
                
                const newConfig = [];
                for(let i = 0; i < floors; i++) {
                  newConfig.push(base + (i < remainder ? 1 : 0));
                }
                
                setKostFormData({
                  ...kostFormData,
                  total_rooms: text,
                  floor_config: newConfig
                });
              }}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { justifyContent: 'center' }]}
                onPress={() => {
                  setKostModalVisible(false);
                  setIsEditingKost(false);
                  setKostFormData({ name: '', address: '', total_rooms: '', total_floors: '', floor_config: [] });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddKost}
                style={[styles.modalButton, styles.submitButton, { flex: 1, justifyContent: 'center' }]}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Tenant Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[styles.modalContent, { transform: [{ translateY: panY }] }]}
          >
            <View {...panResponder.panHandlers} style={{ paddingBottom: 10 }}>
              <View style={[styles.handleBar, { marginBottom: 10 }]} />
              <Text style={[styles.modalTitle, { marginBottom: 10 }]}>{t('boarding.addTenant')}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* Pilih Kamar */}
            <Text style={styles.sectionHeader}>{t('boarding.selectRoom.title')}</Text>
            <View style={{ marginBottom: 20 }}>
              <TextInput
                style={[styles.input, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', color: colors.text }]}
                value={formData.room_number}
                editable={false}
                placeholder={t('boarding.selectRoom.roomNumberPlaceholder')}
              />
            </View>

            {/* Identitas Penghuni */}
            <Text style={styles.sectionHeader}>{t('boarding.identity.title')}</Text>
            
            <Text style={styles.inputLabel}>{t('boarding.identity.name')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('boarding.identity.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
            />

            <Text style={styles.inputLabel}>{t('boarding.identity.whatsapp')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('boarding.identity.whatsappPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
            />

            <Text style={styles.inputLabel}>{t('boarding.identity.nik')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('boarding.identity.nikPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={16}
              value={formData.nik}
              onChangeText={(text) => setFormData({...formData, nik: text})}
            />

            {/* Informasi Tambahan (Required by System) */}
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>{t('boarding.identity.gender')}</Text>
            <View style={styles.radioContainer}>
                <TouchableOpacity 
                  style={[styles.radioOption, formData.gender === 'L' && styles.radioActive]}
                  onPress={() => setFormData({...formData, gender: 'L'})}
                >
                  <Text style={[styles.radioText, formData.gender === 'L' && styles.radioTextActive]}>{t('boarding.identity.male')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.radioOption, formData.gender === 'P' && styles.radioActive]}
                  onPress={() => setFormData({...formData, gender: 'P'})}
                >
                  <Text style={[styles.radioText, formData.gender === 'P' && styles.radioTextActive]}>{t('boarding.identity.female')}</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('boarding.identity.maritalStatus')}</Text>
            <View style={styles.radioContainer}>
                <TouchableOpacity 
                  style={[styles.radioOption, formData.marital_status === 'BELUM_KAWIN' && styles.radioActive]}
                  onPress={() => setFormData({...formData, marital_status: 'BELUM_KAWIN'})}
                >
                  <Text style={[styles.radioText, formData.marital_status === 'BELUM_KAWIN' && styles.radioTextActive]}>{t('boarding.identity.single')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.radioOption, formData.marital_status === 'KAWIN' && styles.radioActive]}
                  onPress={() => setFormData({...formData, marital_status: 'KAWIN'})}
                >
                  <Text style={[styles.radioText, formData.marital_status === 'KAWIN' && styles.radioTextActive]}>{t('boarding.identity.married')}</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('boarding.identity.occupation')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('boarding.identity.occupationPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={formData.occupation}
              onChangeText={(text) => setFormData({...formData, occupation: text})}
            />

            {/* Foto KTP */}
            <Text style={styles.sectionHeader}>{t('boarding.identity.ktpPhoto')}</Text>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {formData.ktp_image ? (
                <Image source={{ uri: formData.ktp_image.uri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.placeholderImage}>
                   <Feather name="upload" size={24} color={colors.textSecondary} />
                   <Text style={styles.placeholderText}>{t('boarding.identity.uploadPhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Pengaturan Pembayaran */}
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('boarding.paymentSettings.title')}</Text>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('boarding.paymentSettings.startDate')}</Text>
                <TouchableOpacity onPress={() => { setActiveDateField('start_date'); setShowDatePicker(true); }}>
                  <View pointerEvents="none">
                    <TextInput
                      style={styles.input}
                      placeholder={t('boarding.paymentSettings.datePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={formData.start_date}
                      editable={false}
                    />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('boarding.paymentSettings.duration')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={formData.rental_duration}
                  onChangeText={(text) => setFormData({...formData, rental_duration: text})}
                />
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>{t('boarding.paymentSettings.dueDate')}</Text>
              <TouchableOpacity onPress={() => { setActiveDateField('due_date'); setShowDatePicker(true); }}>
                <View pointerEvents="none">
                  <TextInput
                    style={styles.input}
                    placeholder={t('boarding.paymentSettings.datePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    value={formData.due_date}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('boarding.paymentSettings.roomPrice')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={formData.room_price}
                  onChangeText={(text) => setFormData({...formData, room_price: text})}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('boarding.paymentSettings.depositAmount')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={formData.deposit_amount}
                  onChangeText={(text) => setFormData({...formData, deposit_amount: text})}
                />
              </View>
            </View>

            {/* Notifikasi Pembayaran */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, justifyContent: 'space-between', backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', padding: 12, borderRadius: 8 }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={[styles.inputLabel, { marginBottom: 4 }]}>{t('boarding.paymentSettings.paymentNotification')}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('boarding.paymentSettings.notificationDesc')}</Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: "#10b981" }}
                thumbColor={formData.notificationEnabled ? "#fff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={(value) => setFormData({...formData, notificationEnabled: value})}
                value={formData.notificationEnabled}
              />
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData[activeDateField] ? new Date(formData[activeDateField]) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setFormData({
                      ...formData, 
                      [activeDateField]: formatDateLocal(selectedDate)
                    });
                  }
                }}
              />
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { justifyContent: 'center' }]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddTenant}
                style={[styles.modalButton, styles.submitButton, { flex: 1, justifyContent: 'center' }]}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 24 }]}>
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>{t('boarding.imagePicker.title')}</Text>
            
            <TouchableOpacity 
              style={styles.actionSheetButton} 
              onPress={() => {
                setShowImagePickerModal(false);
                launchCamera();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
                <Ionicons name="camera" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionSheetText, { color: colors.text }]}>{t('boarding.imagePicker.camera')}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionSheetButton} 
              onPress={() => {
                setShowImagePickerModal(false);
                launchGallery();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="images" size={24} color="#3b82f6" />
              </View>
              <Text style={[styles.actionSheetText, { color: colors.text }]}>{t('boarding.imagePicker.gallery')}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12, opacity: 0.5 }} />

            <TouchableOpacity 
              style={[styles.actionSheetButton, { justifyContent: 'center', backgroundColor: colors.card, borderWidth: 0 }]} 
              onPress={() => setShowImagePickerModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionSheetText, { color: '#ef4444', marginLeft: 0 }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Tenant Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.handleBar} />
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>{t('boarding.tenantDetail.title')}</Text>
            
            {selectedTenantDetail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40, marginBottom: 12 }]}>
                    <Text style={[styles.avatarText, { fontSize: 32 }]}>
                      {selectedTenantDetail.user.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                    {selectedTenantDetail.user.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {selectedTenantDetail.user.occupation || t('boarding.tenantTitle')}
                  </Text>
                </View>

                {/* Status Pembayaran & Tagihan */}
                <View style={{ marginTop: 20, marginBottom: 20 }}>
                  
                  {/* Process Deposit Mode */}
                  {showUseDepositInput ? (
                      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b' }}>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
                              {t('boarding.tenantDetail.processDeposit')}
                          </Text>
                          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16, textAlign: 'center' }}>
                              {t('boarding.tenantDetail.depositProcessDesc', { amount: parseInt(selectedTenantDetail.deposit_amount || '0').toLocaleString('id-ID') })}
                          </Text>

                          <Text style={styles.inputLabel}>{t('boarding.tenantDetail.depositNote')}</Text>
                          <TextInput
                              style={[styles.input, { marginBottom: 16 }]}
                              placeholder={t('boarding.tenantDetail.depositNotePlaceholder')}
                              placeholderTextColor={colors.textSecondary}
                              value={depositNote}
                              onChangeText={setDepositNote}
                              multiline
                          />

                          <View style={{ gap: 12 }}>
                              <TouchableOpacity 
                                  style={{ backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' }}
                                  onPress={() => handleProcessDeposit('USE')}
                              >
                                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('boarding.tenantDetail.useDeposit')}</Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                  style={{ backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' }}
                                  onPress={() => handleProcessDeposit('REFUND')}
                              >
                                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('boarding.tenantDetail.refundDeposit')}</Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                  style={{ backgroundColor: '#64748b', padding: 12, borderRadius: 8, alignItems: 'center' }}
                                  onPress={() => setDetailModalVisible(false)}
                              >
                                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('boarding.tenantDetail.finishNoProcess')}</Text>
                              </TouchableOpacity>
                          </View>
                      </View>
                  ) : (
                    <>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>
                        {t('boarding.tenantDetail.paymentStatus')}
                      </Text>
                      
                      {/* Status Bayar */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, width: 100 }}>{t('boarding.tenantDetail.rentStatus')}</Text>
                        {(() => {
                          const status = calculateRoomStatus(selectedTenantDetail);
                          let label = t('boarding.status.paid');
                          let color = '#10b981';
                          let icon: any = 'checkmark-circle';
                          
                          if (status === 'TUNGGAKAN') {
                            const due = new Date(selectedTenantDetail.due_date);
                            const now = new Date();
                            const diffTime = Math.abs(now.getTime() - due.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            label = t('boarding.status.overdueDays', { days: diffDays });
                            color = '#ef4444';
                            icon = 'alert-circle';
                          } else if (status === 'JATUH_TEMPO') {
                            label = t('boarding.status.approachingDue');
                            color = '#f59e0b';
                            icon = 'time';
                          } else if (status === 'BELUM_AKTIF') {
                            label = t('boarding.status.notActive');
                            color = '#3b82f6';
                            icon = 'calendar';
                          } else if (status === 'BELUM_BAYAR') {
                            label = t('boarding.status.unpaid');
                            color = '#f59e0b';
                            icon = 'alert-circle';
                          } else if (status === 'NONAKTIF') {
                            label = t('boarding.status.inactive');
                            color = '#64748b';
                            icon = 'remove-circle';
                          }

                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name={icon} size={16} color={color} style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{label}</Text>
                            </View>
                          );
                        })()}
                      </View>

                      {/* Jatuh Tempo */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, width: 100 }}>{t('boarding.tenantDetail.dueDate')}</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                          {selectedTenantDetail.due_date 
                            ? new Date(selectedTenantDetail.due_date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '-'}
                        </Text>
                      </View>

                      {/* Harga Sewa */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, width: 100 }}>{t('boarding.tenantDetail.rentPrice')}</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>
                          {selectedTenantDetail.room_price ? `Rp ${parseInt(selectedTenantDetail.room_price).toLocaleString('id-ID')}` : 'Rp 0'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>{t('boarding.tenantDetail.perMonth')}</Text>
                      </View>

                      {/* Deposit Section */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, width: 100 }}>{t('boarding.tenantDetail.deposit')}</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>
                          {selectedTenantDetail.deposit_amount ? `Rp ${parseInt(selectedTenantDetail.deposit_amount).toLocaleString('id-ID')}` : '-'}
                        </Text>
                      </View>
                      
                      {parseInt(selectedTenantDetail.deposit_amount || '0') > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, width: 100 }}>{t('boarding.tenantDetail.depositStatus')}</Text>
                        {(() => {
                            const dStatus = selectedTenantDetail.deposit_status || 'UNPAID';
                            let dColor = '#ef4444'; // UNPAID
                            let dLabel = t('boarding.status.unpaid');

                            if (dStatus === 'PAID') {
                                dColor = '#10b981'; dLabel = t('boarding.status.paidStored');
                            } else if (dStatus === 'REFUNDED') {
                                dColor = '#3b82f6'; dLabel = t('boarding.status.refunded');
                            } else if (dStatus === 'USED') {
                                dColor = '#f59e0b'; dLabel = t('boarding.status.used');
                            }

                            return (
                                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: dColor + '20' }}>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: dColor }}>{dLabel}</Text>
                                </View>
                            );
                        })()}
                      </View>
                      )}

                      {/* Action Buttons Group */}
                      <View style={{ gap: 12 }}>
                        {/* Deposit Payment Button */}
                        {(selectedTenantDetail.deposit_status === 'UNPAID' || !selectedTenantDetail.deposit_status) && parseInt(selectedTenantDetail.deposit_amount) > 0 && (
                            <TouchableOpacity 
                                style={{ 
                                    backgroundColor: '#8b5cf6', // Violet
                                    paddingVertical: 12, 
                                    borderRadius: 8, 
                                    flexDirection: 'row', 
                                    justifyContent: 'center', 
                                    alignItems: 'center'
                                }}
                                onPress={handlePayDeposit}
                            >
                                <MaterialCommunityIcons name="cash-plus" size={18} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{t('boarding.tenantDetail.markDepositPaid')}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Standard Rent Actions */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity 
                            style={{ 
                                flex: 1, 
                                backgroundColor: '#10b981', 
                                paddingVertical: 12, 
                                borderRadius: 8, 
                                flexDirection: 'row', 
                                justifyContent: 'center', 
                                alignItems: 'center'
                            }}
                            onPress={handleOpenPaymentConfirm}
                            >
                            <Ionicons name="checkmark-sharp" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{t('boarding.tenantDetail.markRentPaid')}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                            style={{ 
                                flex: 1, 
                                backgroundColor: '#059669', 
                                paddingVertical: 12, 
                                borderRadius: 8, 
                                flexDirection: 'row', 
                                justifyContent: 'center', 
                                alignItems: 'center'
                            }}
                            onPress={() => {
                                const phone = selectedTenantDetail.user.phone || '';
                                const amount = selectedTenantDetail.room_price 
                                ? parseInt(selectedTenantDetail.room_price).toLocaleString('id-ID') 
                                : '0';
                                const message = t('boarding.whatsappReminderMessage', { name: selectedTenantDetail.user.name, amount: amount });
                                const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
                                
                                Linking.canOpenURL(url).then(supported => {
                                if (supported) {
                                    Linking.openURL(url);
                                } else {
                                    Alert.alert(t('common.error'), t('boarding.alert.whatsappNotInstalled'));
                                }
                                });
                            }}
                            >
                            <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{t('boarding.tenantDetail.sendReminder')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Check Out Button */}
                        <TouchableOpacity 
                            style={{ 
                                backgroundColor: '#ef4444', 
                                paddingVertical: 12, 
                                borderRadius: 8, 
                                flexDirection: 'row', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: 8
                            }}
                            onPress={handleCheckOut}
                        >
                            <MaterialIcons name="person-remove" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{t('boarding.tenantDetail.checkout')}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('boarding.tenantDetail.roomNumber')}</Text>
                  <Text style={styles.value}>{selectedTenantDetail.room_number || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('boarding.tenantDetail.nik')}</Text>
                  <Text style={styles.value}>{selectedTenantDetail.user.nik || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('boarding.tenantDetail.phone')}</Text>
                  <Text style={styles.value}>{selectedTenantDetail.user.phone || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('boarding.tenantDetail.entryDate')}</Text>
                  <Text style={styles.value}>
                    {selectedTenantDetail.start_date 
                      ? new Date(selectedTenantDetail.start_date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) 
                      : '-'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('boarding.tenantDetail.maritalStatus')}</Text>
                  <Text style={styles.value}>
                    {selectedTenantDetail.user.marital_status === 'KAWIN' ? t('boarding.identity.married') : t('boarding.identity.single')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('boarding.tenantDetail.rentStatusLabel')}</Text>
                  {(() => {
                    const isActive = selectedTenantDetail.status === 'ACTIVE';
                    const bg = isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.15)'; // slate for nonaktif
                    const fg = isActive ? '#10b981' : '#64748b';
                    const label = isActive ? t('boarding.status.active') : t('boarding.status.inactiveLabel');
                    return (
                      <View style={[styles.badge, { backgroundColor: bg }]}>
                        <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Management Actions */}
                <View style={{ marginTop: 24, gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: '#3b82f6', justifyContent: 'center', width: '100%' }]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      if (selectedHouseId) {
                        openEditTenant(selectedHouseId, selectedTenantDetail);
                      }
                    }}
                  >
                     <Ionicons name="create-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                     <Text style={styles.submitButtonText}>{t('boarding.tenantDetail.editData')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: '#ef4444', justifyContent: 'center', width: '100%' }]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      if (selectedHouseId) {
                        handleDeleteTenant(selectedHouseId, selectedTenantDetail.id);
                      }
                    }}
                  >
                     <Ionicons name="trash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                     <Text style={styles.submitButtonText}>{t('boarding.tenantDetail.vacateRoom')}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton, { marginTop: 12 }]}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('common.close')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Action Menu Modal */}
      <Modal
        visible={actionMenuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 24 }]}>
            <View style={styles.handleBar} />
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>
              {actionType === 'KOST' ? t('boarding.kost') : t('boarding.tenant')}
            </Text>
            
            <TouchableOpacity 
              style={styles.actionSheetButton} 
              onPress={executeEditAction}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="create-outline" size={24} color="#3b82f6" />
              </View>
              <Text style={[styles.actionSheetText, { color: colors.text }]}>
                {actionType === 'KOST' ? t('boarding.editKost') : t('boarding.editTenant')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {actionType === 'TENANT' && (
              <TouchableOpacity 
                style={styles.actionSheetButton} 
                onPress={executeDetailAction}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="eye-outline" size={24} color="#10b981" />
                </View>
                <Text style={[styles.actionSheetText, { color: colors.text }]}>{t('boarding.viewDetail')}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionSheetButton} 
              onPress={executeDeleteAction}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </View>
              <Text style={[styles.actionSheetText, { color: colors.text }]}>
                {actionType === 'KOST' ? t('boarding.deleteKost') : t('boarding.deleteTenant')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12, opacity: 0.5 }} />

            <TouchableOpacity 
              style={[styles.actionSheetButton, { justifyContent: 'center', backgroundColor: colors.card, borderWidth: 0 }]} 
              onPress={() => setActionMenuVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionSheetText, { color: colors.textSecondary, marginLeft: 0 }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Confirmation Modal */}
      <Modal
        visible={isPaymentConfirmVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPaymentConfirmVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: isDarkMode ? '#1e293b' : 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16, textAlign: 'center' }}>
              {t('boarding.payment.confirmTitle')}
            </Text>
            
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }}>
              {t('boarding.payment.confirmMsgPre')} <Text style={{ fontWeight: 'bold', color: '#10b981' }}>{t('boarding.status.paid')}</Text>.
            </Text>

            {paymentConfirmData && (
                <View style={{ gap: 12, marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary }}>{t('boarding.payment.tenantName')}</Text>
                        <Text style={{ fontWeight: '600', color: colors.text }}>{paymentConfirmData.tenantName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary }}>{t('boarding.payment.room')}</Text>
                        <Text style={{ fontWeight: '600', color: colors.text }}>{paymentConfirmData.roomNumber}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary }}>{t('boarding.payment.period')}</Text>
                        <Text style={{ fontWeight: '600', color: colors.text, maxWidth: '60%', textAlign: 'right' }}>
                            {paymentConfirmData.period}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary }}>{t('boarding.payment.price')}</Text>
                        <Text style={{ fontWeight: '600', color: colors.text }}>
                            Rp {paymentConfirmData.price.toLocaleString('id-ID')}
                        </Text>
                    </View>
                </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                    style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                    onPress={() => setPaymentConfirmVisible(false)}
                >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' }}
                    onPress={confirmPayment}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('boarding.payment.confirmBtn')}</Text>
                </TouchableOpacity>
            </View>
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
    headerBackground: {
      paddingBottom: 24,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      zIndex: 10,
    },
    headerContent: {
    paddingHorizontal: 16,
  },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    badge: {
      backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.05)' : 'rgba(5, 150, 105, 0.05)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : 'rgba(5, 150, 105, 0.2)',
    },
    badgeText: {
      fontSize: 12,
      color: isDarkMode ? '#059669' : '#059669',
      fontWeight: 'bold',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
      opacity: 0.5,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    tenantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 16,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 18,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    tenantName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    tenantInfo: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 16,
      marginTop: 8,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 16,
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      marginLeft: 8,
      fontSize: 15,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 24,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: '80%',
    },
    iconAction: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '40',
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    value: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: isDarkMode ? '#475569' : '#CBD5E1',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
      marginTop: -10,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 20,
      maxHeight: '85%', // Limit height
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 24,
      textAlign: 'center',
    },
    imagePicker: {
      width: '100%',
      height: 150,
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      overflow: 'hidden',
    },
    pickedImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    placeholderImage: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 14,
    },
    radioContainer: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#334155' : '#CBD5E1',
    },
    radioOption: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    radioActive: {
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    radioText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    radioTextActive: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    inputLabel: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
      fontWeight: '600',
      marginLeft: 4,
    },
    input: {
      backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', // Lebih gelap agar kontras
      borderWidth: 1.5, // Border lebih tebal
      borderColor: isDarkMode ? '#334155' : '#CBD5E1', // Warna border lebih tegas
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      color: colors.text,
      fontSize: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
    },
    modalButton: {
      flex: 1,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: isDarkMode ? '#334155' : '#E2E8F0',
      borderWidth: 1,
      borderColor: isDarkMode ? '#475569' : '#CBD5E1',
    },
    cancelButtonText: {
      color: isDarkMode ? '#F8FAFC' : '#475569',
      fontWeight: 'bold',
      fontSize: 15,
    },
    submitButton: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 15,
    },
    actionSheetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 16,
      backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#E2E8F0',
    },
    actionSheetText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
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
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  });
