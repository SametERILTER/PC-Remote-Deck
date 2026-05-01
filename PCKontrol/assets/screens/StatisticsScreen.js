import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StatCard = ({ title, value, subtitle, icon, color, unit }) => {
    return (
        <View style={styles.card}>
            <FontAwesome5 name={icon} size={80} color={color} style={styles.cardBgIcon} />
            <View style={styles.cardHeader}>
                <FontAwesome5 name={icon} size={18} color={color} />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.statValue}>
                    {value} <Text style={styles.statUnit}>{unit}</Text>
                </Text>
                {subtitle ? <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
            </View>
        </View>
    );
};

const StatisticsScreen = ({ navigation }) => {
    const [stats, setStats] = useState({ 
        cpu: '0', ram: '0', gpuTemp: '0', gpuUse: '0',
        cpuName: 'Yükleniyor...', ramTot: '0', ramUse: '0', gpuName: 'Yükleniyor...'
    });
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedIP = await AsyncStorage.getItem('@pc_ip_address');
                const savedPort = await AsyncStorage.getItem('@pc_port');
                
                if (savedIP && savedPort) {
                    setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
                } else if (savedIP) {
                    setBaseUrl(`http://${savedIP.trim()}`);
                }
            } catch (error) {
                console.log('Error loading settings:', error);
            }
        };
        loadSettings();

        // Yan (landscape) mod
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

        return () => {
            // Çıkarken dikey (portrait) yap
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

    useEffect(() => {
        if (!baseUrl) return;

        const fetchStats = async () => {
            try {
                const response = await fetch(`${baseUrl}/stats`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.log('Stats fetch error:', error);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => clearInterval(interval);
    }, [baseUrl]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" hidden={true} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => navigation.goBack()}
                >
                    <FontAwesome5 name="arrow-left" size={24} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>İstatistikler</Text>
            </View>

            {/* Kart Tablosu (2x2 Grid) */}
            <ScrollView 
                style={styles.listWrapper} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.gridContainer}>
                    <StatCard 
                        title="CPU" 
                        value={stats.cpu} 
                        unit="%"
                        subtitle={stats.cpuName}
                        icon="microchip" 
                        color="#00E5FF" 
                    />
                    <StatCard 
                        title="RAM" 
                        value={stats.ram} 
                        unit="%"
                        subtitle={`${stats.ramUse} GB / ${stats.ramTot} GB Kullanılıyor`}
                        icon="memory" 
                        color="#B388FF" 
                    />
                    <StatCard 
                        title="GPU" 
                        value={stats.gpuUse} 
                        unit="%"
                        subtitle={stats.gpuName}
                        icon="video" 
                        color="#00E676" 
                    />
                    <StatCard 
                        title="Sıcaklık" 
                        value={stats.gpuTemp} 
                        unit="°C"
                        subtitle={stats.gpuName !== "GPU" ? stats.gpuName + " Sıcaklığı" : "GPU Sıcaklığı"}
                        icon="thermometer-half" 
                        color="#FF5252" 
                    />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0e0e0e',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        marginBottom: 5,
    },
    backButton: {
        padding: 5,
        marginRight: 15,
    },
    headerTitle: {
        color: '#E1E1E1',
        fontSize: 22,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    listWrapper: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        alignItems: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 15,
        width: '100%',
        maxWidth: 800,
    },
    card: {
        width: '46%',
        minWidth: 200,
        height: 140, 
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 20,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        overflow: 'hidden',
    },
    cardBgIcon: {
        position: 'absolute',
        right: -15,
        bottom: -15,
        opacity: 0.06,
        transform: [{ rotate: '15deg' }],
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        color: '#A0A0A0',
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    cardBody: {
        alignItems: 'flex-start',
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 34,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    statUnit: {
        fontSize: 16,
        color: '#A0A0A0',
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    cardSubtitle: {
        color: '#888888',
        fontSize: 11,
        marginTop: 2,
        fontFamily: 'SpaceGrotesk_400Regular',
    }
});

export default StatisticsScreen;
