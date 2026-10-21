import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const PowerScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('5000');
    const [minutes, setMinutes] = useState('60');

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
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('power.title')}</Text>
                <View style={{ width: 38 }} />
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
                <View style={styles.card}>
                    <TouchableOpacity 
                        style={styles.dangerBtn} 
                        onPress={handleInstantShutdown}
                        activeOpacity={0.8}
                    >
                        <View style={styles.dangerIconBox}>
                            <FontAwesome5 name="power-off" size={18} color="#EF4444" />
                        </View>
                        <View style={styles.btnTextCol}>
                            <Text style={styles.btnTitle}>{t('power.instant_btn')}</Text>
                            <Text style={styles.btnSub}>{t('power.instant_sub')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* SÜRELİ KAPATMA */}
                <Text style={styles.sectionTitle}>{t('power.timer_title')}</Text>
                <View style={styles.card}>
                    <View style={styles.timerRow}>
                        <TextInput
                            style={styles.timeInput}
                            value={minutes}
                            onChangeText={setMinutes}
                            keyboardType="numeric"
                            maxLength={4}
                            placeholderTextColor="#555966"
                        />
                        <Text style={styles.timeLabel}>{t('power.timer_label')}</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.primaryBtn} 
                        onPress={handleScheduledShutdown}
                        activeOpacity={0.8}
                    >
                        <FontAwesome5 name="clock" size={16} color="#080808" style={styles.btnIcon} />
                        <View style={styles.btnTextCol}>
                            <Text style={[styles.btnTitle, { color: '#080808' }]}>{t('power.timer_btn')}</Text>
                            <Text style={[styles.btnSub, { color: '#4B5563' }]}>{t('power.timer_sub')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* İPTAL ETME */}
                <Text style={styles.sectionTitle}>{t('power.abort_title')}</Text>
                <View style={styles.card}>
                    <TouchableOpacity 
                        style={styles.secondaryBtn} 
                        onPress={handleAbortShutdown}
                        activeOpacity={0.75}
                    >
                        <View style={styles.secondaryIconBox}>
                            <FontAwesome5 name="times-circle" size={16} color="#9CA0AC" />
                        </View>
                        <View style={styles.btnTextCol}>
                            <Text style={styles.btnTitle}>{t('power.abort_btn')}</Text>
                            <Text style={styles.btnSub}>{t('power.abort_sub')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
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
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27282F',
        padding: 14,
        borderRadius: 14,
    },
    dangerIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#351B21',
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
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27282F',
        padding: 14,
        borderRadius: 14,
    },
    secondaryIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
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
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        backgroundColor: '#27282F',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    timeInput: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 22,
        width: 70,
        textAlign: 'center',
        paddingRight: 12,
        marginRight: 12,
    },
    timeLabel: {
        color: '#E2E8F0',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
});

export default PowerScreen;
