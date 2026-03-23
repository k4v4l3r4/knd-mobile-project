import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import api from '../services/api';

const BansosScreen = ({ onNavigate }: any) => {
    const [loading, setLoading] = useState(true);
    const [bansosData, setBansosData] = useState([]);

    useEffect(() => {
        console.log('🔴 [BANSOS REBUILD] Component Mounted!');
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            console.log('🔵 [BANSOS REBUILD] Memanggil API Web-Admin...');
            const response = await api.get('/bansos-recipients');
            
            console.log('✅ [BANSOS REBUILD] Data didapat:', response.data.data?.data?.length || 0);
            setBansosData(response.data.data?.data || []);
            setLoading(false);
        } catch (error) {
            console.error('❌ [BANSOS REBUILD] Gagal ambil data:', error);
            setLoading(false);
            Alert.alert("Error Jaringan", "Gagal sinkronisasi dengan Web-Admin.");
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Menarik Data dari Web-Admin...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate ? onNavigate('HOME') : null} style={styles.backButton}>
                    <Text style={styles.backText}>⬅ Kembali</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Data Bansos (Web Sync)</Text>
            </View>

            {/* LIST DATA */}
            <ScrollView style={styles.list}>
                {bansosData.length === 0 ? (
                    <Text style={styles.empty}>Belum ada data Bansos.</Text>
                ) : (
                    bansosData.map((item: any, index) => (
                        <View key={index} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.userInfo}>
                                    <View style={[styles.avatar, { backgroundColor: '#10b981' }]}>
                                        <Text style={styles.avatarText}>
                                            {(item.user?.name || item.user?.nama || 'U').charAt(0)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.name}>{item.user?.name || item.user?.nama || 'Tanpa Nama'}</Text>
                                        <Text style={styles.kk}>KK: {item.no_kk || '-'}</Text>
                                    </View>
                                </View>
                                <View style={[styles.badge, { backgroundColor: item.status === 'LAYAK' ? '#4CAF50' : item.status === 'TIDAK_LAYAK' ? '#ef4444' : '#FF9800' }]}>
                                    <Text style={styles.badgeText}>{item.status || 'PENDING'}</Text>
                                </View>
                            </View>
                            <Text style={styles.desc}>Status: {item.status || 'PENDING'}</Text>
                            {item.notes && <Text style={styles.desc}>Catatan: {item.notes}</Text>}
                            <Text style={styles.date}>Tgl: {item.created_at ? item.created_at.split('T')[0] : '-'}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', paddingTop: 30 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#ddd' },
    backButton: { marginRight: 15, padding: 5 },
    backText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    list: { padding: 15 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    kk: { fontSize: 12, color: '#666', marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    desc: { color: '#555', fontSize: 13, marginBottom: 4 },
    date: { color: '#888', fontSize: 12, marginTop: 4 },
    empty: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 }
});

export default BansosScreen;
