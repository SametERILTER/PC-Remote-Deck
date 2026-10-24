import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
    Easing,
    Vibration,
    Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 6 noktanın çembersel yörüngedeki koordinatları (R = 52px)
const DOTS = [
    { x: 52, y: 0, size: 9, opacity: 0.95 },
    { x: 26, y: 45, size: 7.5, opacity: 0.8 },
    { x: -26, y: 45, size: 8.5, opacity: 0.9 },
    { x: -52, y: 0, size: 9.5, opacity: 1.0 },
    { x: -26, y: -45, size: 7.5, opacity: 0.75 },
    { x: 26, y: -45, size: 8.5, opacity: 0.85 },
];

export default function QrScannerScreen({ navigation }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [layout, setLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

    // connectState: null | 'connecting' | 'connected' | 'warning' | 'error'
    const [connectState, setConnectState] = useState(null);
    const [serverIp, setServerIp] = useState('');
    const [serverPort, setServerPort] = useState('');
    const [pingMs, setPingMs] = useState(null);

    const autoRedirectTimer = useRef(null);

    // Animasyon Değerleri
    // curtainAnim: 0 iken en üstte ~120px başlık gradient'ı; 1 olunca yukarıdan aşağıya tüm ekranı kaplar
    const curtainAnim = useRef(new Animated.Value(0)).current;
    const contentAnim = useRef(new Animated.Value(0)).current; // Animasyon içeriğinin belirmesi
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const mergeAnim = useRef(new Animated.Value(1)).current;     // 1: dış yörüngede, 0: merkezde birleşmiş
    const rippleAnim = useRef(new Animated.Value(0)).current;    // Birleşince dışa yayılan hafif dalga
    const successScale = useRef(new Animated.Value(0)).current;  // Merkezdeki onay simgesi
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
        return () => {
            if (autoRedirectTimer.current) clearTimeout(autoRedirectTimer.current);
        };
    }, []);

    // Vizör Lazer Çizgisi
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 2200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Yörünge Dönüşü ve Hafif Nefes Alma
    useEffect(() => {
        let spinLoop;
        let breatheLoop;

        if (connectState === 'connecting') {
            spinLoop = Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            spinLoop.start();

            breatheLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 1100,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0.94,
                        duration: 1100,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                ])
            );
            breatheLoop.start();
        }

        return () => {
            if (spinLoop) spinLoop.stop();
            if (breatheLoop) breatheLoop.stop();
        };
    }, [connectState]);

    const handleBarcodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            Vibration.vibrate(30);
        } catch (_) {}

        const trimmed = (data || '').trim();
        const parts = trimmed.split(":");

        if (parts.length === 2 && parts[0].includes(".")) {
            const ip = parts[0].trim();
            const port = parts[1].trim();

            setServerIp(ip);
            setServerPort(port);
            setConnectState('connecting');

            // Arka planda anında kaydet
            try {
                await AsyncStorage.setItem('@pc_ip_address', ip);
                await AsyncStorage.setItem('@pc_port', port);
            } catch (err) {
                console.error("Storage error", err);
            }

            // 1. En üstteki siyah linear gradient aşağıya doğru pürüzsüzce akar
            Animated.timing(curtainAnim, {
                toValue: 1,
                duration: 480,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: false,
            }).start();

            // 2. Gradient aşağı inerken ortadaki birleşme animasyonu ve yazılar belirir
            Animated.timing(contentAnim, {
                toValue: 1,
                duration: 400,
                delay: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();

            // Sunucuyu kontrol et (animasyonun keyifle hissedilmesi için en az 1.2 sn)
            const startTime = Date.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2200);

            let isOk = false;
            let elapsed = 0;
            try {
                const res = await fetch(`http://${ip}:${port}/ping`, { signal: controller.signal });
                clearTimeout(timeoutId);
                elapsed = Date.now() - startTime;
                if (res.ok) isOk = true;
            } catch (_) {
                clearTimeout(timeoutId);
            }

            const remaining = Math.max(0, 1200 - (Date.now() - startTime));
            if (remaining > 0) {
                await new Promise(r => setTimeout(r, remaining));
            }

            if (isOk) {
                setPingMs(elapsed || 12);
                triggerMergeSuccess();
            } else {
                setConnectState('warning');
            }
        } else {
            setConnectState('error');
            Animated.timing(curtainAnim, {
                toValue: 1,
                duration: 450,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: false,
            }).start();

            Animated.timing(contentAnim, {
                toValue: 1,
                duration: 350,
                delay: 180,
                useNativeDriver: true,
            }).start();
        }
    };

    // Noktaların Merkeze Birleşme (Apple Spring Merge) Animasyonu
    const triggerMergeSuccess = () => {
        // 1. Noktalar spiral şeklinde merkeze çekilerek birleşir
        Animated.spring(mergeAnim, {
            toValue: 0,
            friction: 7,
            tension: 65,
            useNativeDriver: true,
        }).start(() => {
            try {
                Vibration.vibrate(35);
            } catch (_) {}

            setConnectState('connected');

            // 2. Birleşme anında hafif ripple dalgası yayılır ve merkez onay simgesi belirir
            Animated.parallel([
                Animated.timing(rippleAnim, {
                    toValue: 1,
                    duration: 650,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.spring(successScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 80,
                    useNativeDriver: true,
                }),
            ]).start();

            // 1.2 sn sonra otomatik olarak ana ekrana yönlendir
            autoRedirectTimer.current = setTimeout(() => {
                navigation.navigate("MainTabs");
            }, 1200);
        });
    };

    const resetScanner = () => {
        if (autoRedirectTimer.current) clearTimeout(autoRedirectTimer.current);

        // İçerik kaybolur ve gradient perde yukarı toplanır
        Animated.parallel([
            Animated.timing(contentAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(curtainAnim, {
                toValue: 0,
                duration: 380,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: false,
            }),
        ]).start(() => {
            setConnectState(null);
            setScanned(false);
            setPingMs(null);
            mergeAnim.setValue(1);
            successScale.setValue(0);
            rippleAnim.setValue(0);
        });
    };

    const handleContinue = () => {
        if (autoRedirectTimer.current) clearTimeout(autoRedirectTimer.current);
        navigation.navigate("MainTabs");
    };

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
                <StatusBar style="light" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome5 name="arrow-left" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('qr.title')}</Text>
                </View>
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>{t('qr.perm_req')}</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                        <Text style={styles.permissionButtonText}>{t('qr.grant')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const FRAME_SIZE = 240;
    const viewHeight = layout.height || SCREEN_HEIGHT;
    const viewWidth = layout.width || SCREEN_WIDTH;
    const centerY = viewHeight / 2;

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 2.2],
    });
    const rippleOpacity = rippleAnim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0.75, 0.4, 0],
    });

    // En üstten aşağıya inen Linear Gradient perde yüksekliği
    const initialHeaderHeight = Math.max(insets.top, 20) + 75;
    const curtainHeight = curtainAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [initialHeaderHeight, viewHeight],
    });

    const isConnected = connectState === 'connected';
    const isConnecting = connectState === 'connecting';

    return (
        <View
            style={styles.container}
            onLayout={(e) => setLayout(e.nativeEvent.layout)}
        >
            <StatusBar style="light" backgroundColor="transparent" translucent={true} />

            {/* 1. Kamera Önizlemesi (En altta) */}
            {isFocused && (
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    facing="back"
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* 2. Minimalist Vizör (Yalnızca taranırken görünür, okunduğu an arkada kutu kalmaması için kalkar) */}
            {layout.height > 0 && connectState === null && !scanned && (
                <View
                    pointerEvents="none"
                    style={[
                        styles.scanFrame,
                        {
                            position: 'absolute',
                            top: (layout.height - FRAME_SIZE) / 2,
                            left: (layout.width - FRAME_SIZE) / 2,
                        },
                    ]}
                >
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />

                    <Animated.View
                        style={[
                            styles.scanLine,
                            {
                                transform: [{
                                    translateY: scanLineAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [10, FRAME_SIZE - 12],
                                    })
                                }]
                            }
                        ]}
                    />
                </View>
            )}

            {/* 3. EKRANIN EN ÜSTÜNDEN AŞAĞIYA İNEN SİYAH LINEAR GRADIENT PERDE */}
            <Animated.View
                style={[
                    styles.topGradientCurtain,
                    {
                        height: curtainHeight,
                    },
                ]}
                pointerEvents={connectState ? 'auto' : 'box-none'}
            >
                <LinearGradient
                    colors={['#000000', '#000000', '#000000', 'rgba(0, 0, 0, 0.88)', 'rgba(0, 0, 0, 0)']}
                    locations={[0, 0.55, 0.82, 0.94, 1]}
                    style={StyleSheet.absoluteFill}
                />

                {/* Üst Bar (Geri Butonu ve Başlık) */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                    <TouchableOpacity
                        onPress={connectState ? resetScanner : () => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5
                            name={connectState ? "times" : "arrow-left"}
                            size={18}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {connectState ? '' : t('qr.scan_title')}
                    </Text>
                </View>

                {/* Gradient Aşağı İndikten Sonra Ortada Beliren Apple Tarzı Animasyon Alanı */}
                {connectState !== null && (
                    <Animated.View style={[styles.animationContainer, { opacity: contentAnim }]}>
                        <View style={styles.contentWrapper}>
                            {/* 1. Ekranın Dikeyde Tam Ortasındaki İkon Alanı */}
                            <View style={styles.centerIconBox}>
                                {/* Birleşme Ripple Dalgası */}
                                <Animated.View
                                    style={[
                                        styles.rippleCircle,
                                        {
                                            transform: [{ scale: rippleScale }],
                                            opacity: rippleOpacity,
                                        }
                                    ]}
                                />

                                {/* Merkeze Doğru Spiral Birleşen Noktalar */}
                                {!isConnected && (
                                    <Animated.View
                                        style={[
                                            styles.orbitContainer,
                                            {
                                                transform: [
                                                    { rotate: spin },
                                                    { scale: pulseAnim },
                                                ],
                                            },
                                        ]}
                                    >
                                        {/* Merkezdeki Çekirdek Nokta */}
                                        <View style={styles.coreDot} />

                                        {/* 6 Yörünge Parçacığı */}
                                        {DOTS.map((dot, index) => {
                                            const transX = mergeAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, dot.x],
                                            });
                                            const transY = mergeAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, dot.y],
                                            });

                                            return (
                                                <Animated.View
                                                    key={index}
                                                    style={[
                                                        styles.orbitDot,
                                                        {
                                                            width: dot.size,
                                                            height: dot.size,
                                                            borderRadius: dot.size / 2,
                                                            opacity: dot.opacity,
                                                            transform: [
                                                                { translateX: transX },
                                                                { translateY: transY },
                                                            ],
                                                        },
                                                    ]}
                                                />
                                            );
                                        })}
                                    </Animated.View>
                                )}

                                {/* Birleşince Merkezde Açılan Apple Rozeti */}
                                {isConnected && (
                                    <Animated.View
                                        style={[
                                            styles.successBadge,
                                            {
                                                transform: [{ scale: successScale }],
                                            },
                                        ]}
                                    >
                                        <FontAwesome5 name="check" size={26} color="#000000" />
                                    </Animated.View>
                                )}
                            </View>

                            {/* 2. İkonun Hemen Altındaki Sade Apple Tipografisi */}
                            <View style={styles.textBlock}>
                                {isConnecting && (
                                    <>
                                        <Text style={styles.appleTitle}>{t('qr.connecting')}</Text>
                                        <Text style={styles.appleSubtitle}>{t('qr.connecting_sub')}</Text>
                                    </>
                                )}

                                {isConnected && (
                                    <>
                                        <Text style={styles.appleTitle}>{t('qr.connected')}</Text>
                                        <Text style={styles.appleSubtitle}>{serverIp}</Text>
                                    </>
                                )}

                                {connectState === 'warning' && (
                                    <>
                                        <Text style={styles.appleTitle}>{t('qr.warn_saved')}</Text>
                                        <Text style={styles.appleSubtitle}>{serverIp}</Text>
                                        <Text style={[styles.appleSubtitle, { marginTop: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.45)' }]}>
                                            {t('qr.warn_desc')}
                                        </Text>
                                    </>
                                )}

                                {connectState === 'error' && (
                                    <>
                                        <Text style={[styles.appleTitle, { color: '#EF4444' }]}>{t('qr.error')}</Text>
                                        <Text style={styles.appleSubtitle}>{t('qr.invalid_desc')}</Text>
                                    </>
                                )}
                            </View>
                        </View>

                        {/* 3. Gerekli Durumlarda Alt Butonlar */}
                        {connectState === 'warning' && (
                            <View style={[styles.bottomButtons, { bottom: Math.max(insets.bottom, 24) + 12 }]}>
                                <TouchableOpacity style={styles.applePillBtn} onPress={handleContinue} activeOpacity={0.8}>
                                    <Text style={styles.applePillBtnText}>{t('qr.continue_anyway')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.appleTextBtn} onPress={resetScanner} activeOpacity={0.7}>
                                    <Text style={styles.appleTextBtnText}>{t('qr.scan_again')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {connectState === 'error' && (
                            <View style={[styles.bottomButtons, { bottom: Math.max(insets.bottom, 24) + 12 }]}>
                                <TouchableOpacity style={styles.applePillBtn} onPress={resetScanner} activeOpacity={0.8}>
                                    <Text style={styles.applePillBtnText}>{t('qr.scan_again')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },

    // ── En Üstten Aşağıya İnen Linear Gradient Perde ────────────────────────────
    topGradientCurtain: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        overflow: 'hidden',
    },

    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
        zIndex: 60,
    },
    backButton: {
        marginRight: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },

    // ── Kamera Açıkken Vizör (Okununca arkada kutu kalmaması için gizlenir) ─────
    scanFrame: {
        width: 240,
        height: 240,
        backgroundColor: 'transparent',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderColor: 'rgba(255, 255, 255, 0.75)',
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 2.5,
        borderLeftWidth: 2.5,
        borderTopLeftRadius: 18,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 2.5,
        borderRightWidth: 2.5,
        borderTopRightRadius: 18,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 2.5,
        borderLeftWidth: 2.5,
        borderBottomLeftRadius: 18,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 2.5,
        borderRightWidth: 2.5,
        borderBottomRightRadius: 18,
    },
    scanLine: {
        position: 'absolute',
        top: 0,
        left: 14,
        right: 14,
        height: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },

    // ── Gradient İçindeki Animasyon Sahnesi (Tam Ortalanmış) ───────────────────
    animationContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 80,
    },
    contentWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    centerIconBox: {
        width: 130,
        height: 130,
        alignItems: 'center',
        justifyContent: 'center',
    },

    orbitContainer: {
        width: 130,
        height: 130,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coreDot: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
    },
    orbitDot: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
    },

    rippleCircle: {
        position: 'absolute',
        top: 5,
        left: 5,
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.55)',
    },

    successBadge: {
        position: 'absolute',
        top: 34,
        left: 34,
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },

    textBlock: {
        marginTop: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    appleTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 24,
        letterSpacing: -0.4,
        marginBottom: 6,
        textAlign: 'center',
    },
    appleSubtitle: {
        color: 'rgba(255, 255, 255, 0.55)',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        letterSpacing: -0.2,
        textAlign: 'center',
    },

    bottomButtons: {
        position: 'absolute',
        left: 32,
        right: 32,
        alignItems: 'center',
        gap: 12,
    },
    applePillBtn: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 260,
        paddingVertical: 13,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applePillBtnText: {
        color: '#000000',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14.5,
    },
    appleTextBtn: {
        paddingVertical: 6,
    },
    appleTextBtnText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13.5,
    },

    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    permissionText: {
        color: '#FFFFFF',
        marginBottom: 20,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: '#E1E1E1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 14,
    },
    permissionButtonText: {
        color: '#121212',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
});
