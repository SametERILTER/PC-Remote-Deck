import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert, Modal } from 'react-native';
import { FontAwesome5, Octicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEATURES = [
    { id: 'SendCommand', icon: 'terminal', color: '#A5B4FC', label: 'features.sendCommand' },
    { id: 'Keyboard', icon: 'keyboard', color: '#FCD34D', label: 'features.keyboard' },
    { id: 'Mouse', icon: 'mouse-pointer', color: '#6EE7B7', label: 'features.mouse' },
    { id: 'WindowManager', icon: 'window-restore', color: '#7DD3FC', label: 'features.windowManager' },
    { id: 'Clipboard', icon: 'paste', color: '#FDA4AF', label: 'features.clipboard' },
    { id: 'FileTransfer', icon: 'file-import', color: '#C4B5FD', label: 'features.fileTransfer' },
    { id: 'FileExplorer', icon: 'folder-open', color: '#FDBA74', label: 'features.fileExplorer' },
    { id: 'ScreenShot', icon: 'camera', color: '#5EEAD4', label: 'features.screenShot' },
    { id: 'Statistics', icon: 'chart-pie', color: '#93C5FD', label: 'features.statistics' },
    { id: 'Speak', icon: 'bullhorn', color: '#F9A8D4', label: 'features.speak' },
    { id: 'Power', icon: 'power-off', color: '#FCA5A5', label: 'features.power' },
];

const HomeScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [isConnected, setIsConnected] = useState(false);
    const [pcIp, setPcIp] = useState('');
    const [pcPort, setPcPort] = useState('');
    const [ping, setPing] = useState('--');
    const pingTimerRef = useRef(null);

    const [connModalVisible, setConnModalVisible] = useState(false);

    const openConnModal = () => {
        setConnModalVisible(true);
    };

    const closeConnModal = () => {
        setConnModalVisible(false);
    };

    const handleDisconnect = () => {
        Alert.alert(
            t('home.disconnect_title'),
            t('home.disconnect_msg'),
            [
                { text: t('home.cancel'), style: 'cancel' },
                { 
                    text: t('home.disconnect_title'), 
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('@pc_ip_address');
                        await AsyncStorage.removeItem('@pc_port');
                        setIsConnected(false);
                        setPcIp('');
                        setPcPort('');
                        setPing('--');
                        closeConnModal();
                    }
                }
            ]
        );
    };

    const checkConnection = async () => {
        try {
            const ip = await AsyncStorage.getItem('@pc_ip_address');
            const port = await AsyncStorage.getItem('@pc_port') || '9090';
            if (ip && port) {
                setPcIp(ip);
                setPcPort(port);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                
                const startTime = Date.now();
                const res = await fetch(`http://${ip}:${port}/ping`, { signal: controller.signal });
                const pingTime = Date.now() - startTime;
                
                clearTimeout(timeoutId);
                if (res.ok) {
                    setIsConnected(true);
                    setPing(`${pingTime} ms`);
                } else {
                    setIsConnected(false);
                    setPing('--');
                }
            } else {
                setIsConnected(false);
                setPcIp('');
                setPcPort('');
                setPing('--');
            }
        } catch {
            setIsConnected(false);
            setPing('--');
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            checkConnection();
            pingTimerRef.current = setInterval(checkConnection, 5000);
        });
        const unsubBlur = navigation.addListener('blur', () => {
            clearInterval(pingTimerRef.current);
        });
        return () => {
            unsubscribe();
            unsubBlur();
            clearInterval(pingTimerRef.current);
        };
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Üst Başlık */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 16 }]}>
                <View style={styles.brandContainer}>
                    <Text style={styles.brandTitle}>PCKONTROL</Text>
                </View>
                <TouchableOpacity 
                    style={styles.headerActionBtn} 
                    onPress={() => navigation.navigate('QrScanner')}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="qrcode" size={17} color="#E2E8F0" />
                </TouchableOpacity>
            </View>

            {/* Kaydırılabilir İçerik */}
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={[
                    styles.scrollContent, 
                    { paddingBottom: Math.max(insets.bottom, 16) + 100 }
                ]}
            >
                {/* Grimsi Cihaz Durum Kartı (Bordersız) */}
                <TouchableOpacity 
                    style={styles.statusCard} 
                    onPress={openConnModal} 
                    activeOpacity={0.75}
                >
                    <View style={styles.statusMainRow}>
                        <View style={styles.deviceIconBox}>
                            <FontAwesome5 
                                name="desktop" 
                                size={17} 
                                color={isConnected ? '#22C55E' : '#717684'} 
                            />
                        </View>
                        <View style={styles.statusTextCol}>
                            <View style={styles.statusTitleRow}>
                                <Text style={styles.statusTitle}>
                                    {isConnected ? t('home.connected') : t('home.disconnected')}
                                </Text>
                                <View style={[
                                    styles.statusDot, 
                                    { backgroundColor: isConnected ? '#22C55E' : '#717684' }
                                ]} />
                            </View>
                            <Text style={styles.statusSubtitle} numberOfLines={1}>
                                {isConnected 
                                    ? `${pcIp} • ${ping}` 
                                    : (pcIp || t('home.ip_not_set'))}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statusRightCol}>
                        <TouchableOpacity 
                            style={styles.reconnectBtn} 
                            onPress={checkConnection}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="sync-alt" size={12} color="#A0A5AF" />
                        </TouchableOpacity>
                        <FontAwesome5 name="chevron-right" size={11} color="#5D6270" style={{ marginLeft: 8 }} />
                    </View>
                </TouchableOpacity>

                {/* Öne Çıkan: Deck Mode (Grimsi Hero Kartı) */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
                </View>

                <TouchableOpacity
                    style={styles.heroCard}
                    onPress={() => navigation.navigate('Deck')}
                    activeOpacity={0.8}
                >
                    <View style={styles.heroBodyRow}>
                        <View style={styles.heroIconBox}>
                            <FontAwesome5 name="th-large" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.heroTextCol}>
                            <Text style={styles.heroTitle}>Deck Mode</Text>
                            <Text style={styles.heroDesc} numberOfLines={2}>
                                {t('home.deck_desc')}
                            </Text>
                        </View>
                        <View style={styles.heroArrowCircle}>
                            <FontAwesome5 name="arrow-right" size={12} color="#CBD5E1" />
                        </View>
                    </View>

                    <View style={styles.heroFooter}>
                        <Octicons name="apps" size={12} color="#7E8492" style={{ marginRight: 6 }} />
                        <Text style={styles.heroFooterText}>{t('home.deck_footer')}</Text>
                    </View>
                </TouchableOpacity>

                {/* Araçlar Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('home.tools')}</Text>
                </View>

                <View style={styles.toolsGrid}>
                    {FEATURES.map((feat) => (
                        <TouchableOpacity 
                            key={feat.id} 
                            style={styles.toolCard} 
                            onPress={() => navigation.navigate(feat.id)}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name={feat.icon} size={23} color={feat.color} style={styles.toolIcon} />
                            <Text style={styles.toolLabel} numberOfLines={2}>
                                {t(feat.label)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Bağlantı Detayı Modalı (Gerçek Bottom Sheet) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={connModalVisible}
                onRequestClose={closeConnModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={closeConnModal} 
                    />
                    <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleRow}>
                                <View style={styles.modalTitleIconBox}>
                                    <FontAwesome5 name="network-wired" size={14} color="#CBD5E1" />
                                </View>
                                <Text style={styles.modalTitle}>{t('home.conn_info')}</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={closeConnModal} 
                                style={styles.modalCloseBtn}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="times" size={13} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.modalRow}>
                                <Text style={styles.modalLabel}>{t('home.ip_address')}</Text>
                                <Text style={styles.modalValue}>{pcIp || t('home.not_found')}</Text>
                            </View>

                            <View style={styles.modalRow}>
                                <Text style={styles.modalLabel}>{t('home.port')}</Text>
                                <Text style={styles.modalValue}>{pcPort || '--'}</Text>
                            </View>

                            <View style={styles.modalRow}>
                                <Text style={styles.modalLabel}>{t('home.latency')}</Text>
                                <Text style={styles.modalValue}>{ping}</Text>
                            </View>

                            <View style={styles.modalRow}>
                                <Text style={styles.modalLabel}>{t('home.conn_type')}</Text>
                                <Text style={styles.modalValue}>{t('home.local_network')}</Text>
                            </View>

                            <View style={styles.modalRow}>
                                <Text style={styles.modalLabel}>{t('home.status')}</Text>
                                <View style={styles.statusPill}>
                                    <View style={[
                                        styles.miniDot, 
                                        { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }
                                    ]} />
                                    <Text style={[
                                        styles.statusPillText, 
                                        { color: isConnected ? '#4ADE80' : '#F87171' }
                                    ]}>
                                        {isConnected ? t('home.status_connected') : t('home.status_disconnected')}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.disconnectBtn} 
                                onPress={handleDisconnect}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="unlink" size={13} color="#EF4444" style={{ marginRight: 8 }} />
                                <Text style={styles.disconnectBtnText}>{t('home.disconnect_title')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080808', // Siyaha yakın zemin
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: '#080808',
        zIndex: 10,
    },
    brandContainer: {
        justifyContent: 'center',
    },
    brandTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        letterSpacing: -0.4,
    },
    brandSubtitle: {
        color: '#717684',
        fontSize: 9.5,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 1.4,
        marginTop: 1,
    },
    headerActionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24', // Grimsi buton
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Content ───────────────────────────────────────────────────────────────
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 16,
    },

    // ── Durum Kartı (Cihaz Bağlantısı) ────────────────────────────────────────
    statusCard: {
        flexDirection: 'row',
        backgroundColor: '#1E1F24', // Grimsi kutu
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 22,
    },
    statusMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deviceIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#27282F', // Bir ton açık grimsi iç kutu
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 13,
    },
    statusTextCol: {
        flex: 1,
    },
    statusTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    statusTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginRight: 7,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    statusSubtitle: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    statusRightCol: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reconnectBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Bölüm Başlıkları ──────────────────────────────────────────────────────
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#717684',
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    sectionCounter: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        color: '#555966',
        fontSize: 11,
    },

    // ── Hero Kartı (Deck Mode) ────────────────────────────────────────────────
    heroCard: {
        backgroundColor: '#1E1F24', // Grimsi kutu
        borderRadius: 20,
        padding: 18,
        marginBottom: 24,
    },
    heroBodyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    heroArrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    heroIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    heroTextCol: {
        flex: 1,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 2,
    },
    heroDesc: {
        color: '#9CA0AC',
        fontSize: 12.5,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 17,
    },
    heroFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
    },
    heroFooterText: {
        color: '#717684',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_500Medium',
    },

    // ── Araçlar Grid ─────────────────────────────────────────────────────────
    toolsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    toolCard: {
        width: '31.5%',
        minHeight: 96,
        backgroundColor: '#1E1F24', // Tek büyük grimsi kutu
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolIcon: {
        marginBottom: 10,
    },
    toolLabel: {
        color: '#E4E7EC',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 11.5,
        textAlign: 'center',
        lineHeight: 15,
    },

    // ── Bağlantı Modalı (Bottom Sheet) ───────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end', // Tamamen alta yaslar
    },
    modalSheet: {
        width: '100%',
        backgroundColor: '#1E1F24',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    sheetHandleWrap: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3E414D',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        marginBottom: 8,
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalTitleIconBox: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    modalTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    modalCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        paddingBottom: 8,
    },
    modalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#27282F',
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    modalLabel: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    modalValue: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginRight: 6,
    },
    statusPillText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
    },
    disconnectBtn: {
        marginTop: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        paddingVertical: 13,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disconnectBtnText: {
        color: '#EF4444',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
    },
});

export default HomeScreen;
