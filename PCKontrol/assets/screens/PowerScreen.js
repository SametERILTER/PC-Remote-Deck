import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Vibration } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const PRESETS = [
    { label: '15 dk', value: 15 },
    { label: '30 dk', value: 30 },
    { label: '45 dk', value: 45 },
    { label: '1 saat', value: 60 },
    { label: '1.5 saat', value: 90 },
    { label: '2 saat', value: 120 },
];

const PowerScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('5000');
    const [minutes, setMinutes] = useState('60');

    const adjustMinutes = (delta) => {
        try { Vibration.vibrate(8); } catch {}
        const current = parseInt(minutes, 10) || 0;
        const nextVal = Math.max(5, Math.min(720, current + delta));
        setMinutes(nextVal.toString());
    };

    const formatDuration = (mins) => {
        const num = parseInt(mins, 10);
        if (isNaN(num) || num <= 0) return '';
        const h = Math.floor(num / 60);
        const m = num % 60;
        if (h === 0) return `${m} dakika`;
        if (m === 0) return `${h} saat`;
        return `${h} saat ${m} dk`;
    };

    const getEstimatedTime = (mins) => {
        const num = parseInt(mins, 10);
        if (isNaN(num) || num <= 0) return null;
        const target = new Date(Date.now() + num * 60 * 1000);
        const hours = target.getHours().toString().padStart(2, '0');
        const m = target.getMinutes().toString().padStart(2, '0');
        return `${hours}:${m}`;
    };

    const estimatedTime = getEstimatedTime(minutes);

    useEffect(() => {
        loadConnection();
    }, []);

    const loadConnection = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port');
            if (savedIP) setIpAddress(savedIP);
            if (savedPort) setPort(savedPort);
        } catch (e) {
            console.error('Bağlantı bilgileri yüklenemedi', e);
        }
    };

    const handleInstantShutdown = () => {
        Alert.alert(
            t('power.warn_title'),
            t('power.warn_desc'),
            [
                { text: t('power.cancel'), style: 'cancel' },
                { 
                    text: t('power.yes_shutdown'), 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await fetch(`http://${ipAddress}:${port}/shutdown`, { method: 'GET' });
                            Alert.alert(t('power.success'), t('power.shut_sent'));
                        } catch (e) {
                            Alert.alert(t('deck.error'), t('power.shut_err'));
                        }
                    }
                }
            ]
        );
    };

    const handleScheduledShutdown = async () => {
        if (!minutes || isNaN(minutes) || parseInt(minutes) <= 0) {
            Alert.alert(t('deck.error'), t('power.invalid_min'));
            return;
        }

        try {
            const url = `http://${ipAddress}:${port}/shutdown-timer?minutes=${minutes}`;
            const response = await fetch(url, { method: 'GET' });
            if (response.ok) {
                Alert.alert(t('power.success'), t('power.timer_set', { minutes }));
            } else {
                Alert.alert(t('deck.error'), t('power.timer_err'));
            }
        } catch (e) {
            Alert.alert(t('deck.error'), t('power.timer_send_err'));
        }
    };

    const handleAbortShutdown = async () => {
        try {
            const response = await fetch(`http://${ipAddress}:${port}/shutdown-abort`, { method: 'GET' });
            if (response.ok) {
                Alert.alert(t('power.aborted'), t('power.abort_success'));
            } else {
                Alert.alert(t('deck.error'), t('power.abort_err'));
            }
        } catch (e) {
            Alert.alert(t('deck.error'), t('power.abort_send_err'));
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Üst Başlık */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 16 }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('power.title')}</Text>
                </View>
                <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: ipAddress ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.statusText}>{ipAddress ? (t('home.status_connected') || 'Bağlı') : (t('home.status_disconnected') || 'Bağlantı Yok')}</Text>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={[
                    styles.content, 
                    { paddingBottom: Math.max(insets.bottom, 16) + 30 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* ANINDA KAPATMA */}
                <Text style={styles.sectionTitle}>{t('power.instant_title')}</Text>
                <TouchableOpacity 
                    style={styles.dangerCard} 
                    onPress={handleInstantShutdown}
                    activeOpacity={0.7}
                >
                    <View style={styles.dangerIconBox}>
                        <FontAwesome5 name="power-off" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.btnTextCol}>
                        <Text style={styles.btnTitle}>{t('power.instant_btn')}</Text>
                        <Text style={styles.btnSub}>{t('power.instant_sub')}</Text>
                    </View>
                </TouchableOpacity>

                {/* SÜRELİ KAPATMA */}
                <Text style={styles.sectionTitle}>{t('power.timer_title')}</Text>
                <View style={styles.card}>
                    {/* Stepper ve Zaman Göstergesi */}
                    <View style={styles.stepperContainer}>
                        <TouchableOpacity 
                            style={styles.stepBtn}
                            onPress={() => adjustMinutes(-15)}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="minus" size={14} color="#E2E8F0" />
                        </TouchableOpacity>

                        <View style={styles.timeCenter}>
                            <View style={styles.timeNumberRow}>
                                <TextInput
                                    style={styles.bigTimeInput}
                                    value={minutes}
                                    onChangeText={(val) => setMinutes(val.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                    maxLength={3}
                                    placeholder="0"
                                    placeholderTextColor="#555966"
                                    selectTextOnFocus
                                />
                                <Text style={styles.bigTimeUnit}>dk</Text>
                            </View>
                            {formatDuration(minutes) ? (
                                <Text style={styles.durationSubText}>{formatDuration(minutes)}</Text>
                            ) : null}
                        </View>

                        <TouchableOpacity 
                            style={styles.stepBtn}
                            onPress={() => adjustMinutes(15)}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="plus" size={14} color="#E2E8F0" />
                        </TouchableOpacity>
                    </View>

                    {/* Tahmini Kapanış Saati */}
                    {estimatedTime && (
                        <View style={styles.estimatedBox}>
                            <Text style={styles.estimatedText}>
                                Tahmini Kapanış: <Text style={styles.estimatedTimeBold}>~{estimatedTime}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Hızlı Süre Seçenekleri (Presets) */}
                    <View style={styles.presetsGrid}>
                        {PRESETS.map((p) => {
                            const isSelected = parseInt(minutes, 10) === p.value;
                            return (
                                <TouchableOpacity
                                    key={p.value}
                                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                                    onPress={() => {
                                        try { Vibration.vibrate(8); } catch {}
                                        setMinutes(p.value.toString());
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.primaryBtn} 
                        onPress={handleScheduledShutdown}
                        activeOpacity={0.8}
                    >
                        <FontAwesome5 name="clock" size={16} color="#080808" style={styles.btnIcon} />
                        <View style={styles.btnTextCol}>
                            <Text style={[styles.btnTitle, { color: '#080808' }]}>
                                {t('power.timer_btn')} {minutes ? `(${minutes} dk)` : ''}
                            </Text>
                            <Text style={[styles.btnSub, { color: '#4B5563' }]}>{t('power.timer_sub')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* İPTAL ETME */}
                <Text style={styles.sectionTitle}>{t('power.abort_title')}</Text>
                <TouchableOpacity 
                    style={styles.secondaryCard} 
                    onPress={handleAbortShutdown}
                    activeOpacity={0.75}
                >
                    <View style={styles.secondaryIconBox}>
                        <FontAwesome5 name="times-circle" size={18} color="#9CA0AC" />
                    </View>
                    <View style={styles.btnTextCol}>
                        <Text style={styles.btnTitle}>{t('power.abort_btn')}</Text>
                        <Text style={styles.btnSub}>{t('power.abort_sub')}</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080808',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: '#080808',
        zIndex: 10,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 10,
        gap: 8,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        color: '#9CA0AC',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        letterSpacing: -0.3,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    sectionTitle: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        letterSpacing: 1.2,
        marginLeft: 2,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: '#1E1F24',
        borderRadius: 18,
        padding: 16,
        marginBottom: 20,
    },
    dangerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        padding: 16,
        borderRadius: 18,
        marginBottom: 20,
    },
    dangerIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 14,
    },
    secondaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        padding: 16,
        borderRadius: 18,
        marginBottom: 20,
    },
    secondaryIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    btnIcon: {
        marginRight: 14,
        marginLeft: 6,
    },
    btnTextCol: {
        flex: 1,
    },
    btnTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    btnSub: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 12,
        color: '#9CA0AC',
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#27282F',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    bigTimeInput: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 34,
        textAlign: 'center',
        minWidth: 50,
        padding: 0,
        margin: 0,
    },
    bigTimeUnit: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        marginLeft: 4,
    },
    durationSubText: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 2,
    },
    estimatedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#27282F',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    estimatedText: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    estimatedTimeBold: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
        justifyContent: 'space-between',
    },
    presetChip: {
        width: '31%',
        height: 38,
        backgroundColor: '#27282F',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetChipActive: {
        backgroundColor: '#FFFFFF',
    },
    presetText: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
    },
    presetTextActive: {
        color: '#080808',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});

export default PowerScreen;
