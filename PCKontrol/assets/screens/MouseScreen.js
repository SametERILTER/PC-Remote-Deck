import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PanResponder,
    Platform,
    Vibration,
    Animated,
} from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const SPEED_PRESETS = [
    { label: '1x', factor: 1.5 },
    { label: '2x', factor: 2.2 },
    { label: '3x', factor: 3.2 },
];

const GRID_STEP = 24; // 24px aralıklı estetik ızgara
const DOT_COUNT = 18;  // Havuzdaki grimsi ızgara noktacıkları

const MouseScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [baseUrl, setBaseUrl] = useState('');
    const [wsConnected, setWsConnected] = useState(false);
    const [speedIndex, setSpeedIndex] = useState(1); // Varsayılan 2x

    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const isComponentMounted = useRef(true);

    // Hareket & Fizik Motoru Ref'leri
    const lastMove = useRef({ x: 0, y: 0 });
    const subpixel = useRef({ x: 0, y: 0 });
    const pendingMove = useRef({ dx: 0, dy: 0 });
    const rafId = useRef(null);
    const lastHttpSendTime = useRef(0);
    const speedFactorRef = useRef(SPEED_PRESETS[1].factor);

    // Trackpad Konumu
    const trackpadRef = useRef(null);
    const trackpadOffset = useRef({ x: 0, y: 0 });

    // Parmağın Çevresindeki Grimsi Izgara Noktaları Havuzu (Sıfır Yük - useNativeDriver)
    const gridDots = useRef(
        Array.from({ length: DOT_COUNT }, () => ({
            x: new Animated.Value(-100),
            y: new Animated.Value(-100),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
        }))
    ).current;

    const dotIndex = useRef(0);
    const lastDotTime = useRef(0);

    // Parmağın çevresinde ızgara üstünde parıldayıp sönen minik grimsi noktacıklar
    const triggerGridDots = (px, py) => {
        const now = Date.now();
        if (now - lastDotTime.current < 28) return; // 35 FPS pürüzsüz akış
        lastDotTime.current = now;

        // En yakın ızgara kesişim noktaları
        const snapX = Math.round(px / GRID_STEP) * GRID_STEP;
        const snapY = Math.round(py / GRID_STEP) * GRID_STEP;

        // Parmağın etrafındaki komşu ızgara koordinatları
        const offsets = [
            [0, 0],
            [-GRID_STEP, 0],
            [GRID_STEP, 0],
            [0, -GRID_STEP],
            [0, GRID_STEP],
            [-GRID_STEP, -GRID_STEP],
            [GRID_STEP, -GRID_STEP],
            [-GRID_STEP, GRID_STEP],
            [GRID_STEP, GRID_STEP],
        ];

        // Komşulardan rastgele 2-3 nokta aydınlansın
        const pickCount = 3;
        for (let i = 0; i < pickCount; i++) {
            const randOffset = offsets[Math.floor(Math.random() * offsets.length)];
            const targetX = snapX + randOffset[0];
            const targetY = snapY + randOffset[1];

            const dot = gridDots[dotIndex.current];
            dotIndex.current = (dotIndex.current + 1) % DOT_COUNT;

            dot.x.setValue(targetX);
            dot.y.setValue(targetY);
            dot.scale.setValue(1);
            dot.opacity.setValue(0.75);

            Animated.parallel([
                Animated.timing(dot.opacity, {
                    toValue: 0,
                    duration: 380,
                    useNativeDriver: true,
                }),
                Animated.timing(dot.scale, {
                    toValue: 0.3,
                    duration: 380,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    };

    // Hız değiştirme
    const cycleSpeed = () => {
        const nextIndex = (speedIndex + 1) % SPEED_PRESETS.length;
        setSpeedIndex(nextIndex);
        speedFactorRef.current = SPEED_PRESETS[nextIndex].factor;
        try {
            Vibration.vibrate(15);
        } catch {}
    };

    // WebSocket Bağlantısı
    const connectWebSocket = useCallback((ip, port) => {
        if (!ip || !port) return;

        try {
            if (wsRef.current) {
                wsRef.current.close();
            }

            const wsUrl = `ws://${ip.trim()}:${port.trim()}/ws/mouse`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                if (!isComponentMounted.current) return;
                setWsConnected(true);
            };

            ws.onclose = () => {
                if (!isComponentMounted.current) return;
                setWsConnected(false);
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(() => {
                    if (isComponentMounted.current) {
                        connectWebSocket(ip, port);
                    }
                }, 2500);
            };

            ws.onerror = () => {
                if (!isComponentMounted.current) return;
                setWsConnected(false);
            };

            wsRef.current = ws;
        } catch {
            setWsConnected(false);
        }
    }, []);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port') || '9090';
            if (savedIP && savedPort) {
                setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
                connectWebSocket(savedIP, savedPort);
            }
        } catch {}
    };

    useEffect(() => {
        isComponentMounted.current = true;

        const unsubscribeFocus = navigation.addListener('focus', () => {
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            } catch {}
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('hidden');
                } catch {}
            }
            loadSettings();
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('visible');
                } catch {}
            }
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch {}

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            clearTimeout(reconnectTimerRef.current);
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        });

        loadSettings();

        return () => {
            isComponentMounted.current = false;
            unsubscribeFocus();
            unsubscribeBlur();
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            clearTimeout(reconnectTimerRef.current);
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };
    }, [navigation, connectWebSocket]);

    // Anlık Paket İletimi
    const dispatchMouseMove = (dx, dy) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(`m ${dx} ${dy}`);
        } else if (baseUrl) {
            const now = Date.now();
            if (now - lastHttpSendTime.current < 25) return;
            lastHttpSendTime.current = now;
            try {
                fetch(`${baseUrl}/mouse-move?dx=${dx}&dy=${dy}`);
            } catch {}
        }
    };

    // Alt-piksel biriktiricili akıcı hareket hesaplayıcı
    const queueMouseMove = (rawDx, rawDy) => {
        const dist = Math.hypot(rawDx, rawDy);
        const accel = 1 + Math.min(dist * 0.05, 1.4);
        const factor = speedFactorRef.current * accel;

        subpixel.current.x += rawDx * factor;
        subpixel.current.y += rawDy * factor;

        const intX = Math.trunc(subpixel.current.x);
        const intY = Math.trunc(subpixel.current.y);

        if (intX !== 0 || intY !== 0) {
            subpixel.current.x -= intX;
            subpixel.current.y -= intY;

            pendingMove.current.dx += intX;
            pendingMove.current.dy += intY;

            if (!rafId.current) {
                rafId.current = requestAnimationFrame(() => {
                    rafId.current = null;
                    const sendX = pendingMove.current.dx;
                    const sendY = pendingMove.current.dy;
                    pendingMove.current.dx = 0;
                    pendingMove.current.dy = 0;

                    if (sendX !== 0 || sendY !== 0) {
                        dispatchMouseMove(sendX, sendY);
                    }
                });
            }
        }
    };

    const sendMouseScroll = (delta) => {
        const step = delta > 0 ? 1 : -1;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(`s ${step}`);
        } else if (baseUrl) {
            try {
                fetch(`${baseUrl}/mouse-scroll?delta=${step}`);
            } catch {}
        }
    };

    const sendMouseClick = (button) => {
        try {
            Vibration.vibrate(12);
        } catch {}

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(`c ${button}`);
        } else if (baseUrl) {
            try {
                fetch(`${baseUrl}/mouse-click?button=${button}`);
            } catch {}
        }
    };

    const getTouchCoords = (evt) => {
        const native = evt.nativeEvent;
        if (typeof native.locationX === 'number') {
            return { x: native.locationX, y: native.locationY };
        }
        if (native.touches && native.touches[0] && typeof native.touches[0].locationX === 'number') {
            return { x: native.touches[0].locationX, y: native.touches[0].locationY };
        }
        if (native.pageX != null) {
            return {
                x: native.pageX - trackpadOffset.current.x,
                y: native.pageY - trackpadOffset.current.y,
            };
        }
        return null;
    };

    const panResponder = useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,

            onPanResponderGrant: (evt) => {
                lastMove.current = { x: 0, y: 0 };
                const coords = getTouchCoords(evt);
                if (coords) {
                    triggerGridDots(coords.x, coords.y);
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const touches = evt.nativeEvent.touches;

                // Parmak hareket ettikçe ızgara noktalarını parıldat
                const coords = getTouchCoords(evt);
                if (coords) {
                    triggerGridDots(coords.x, coords.y);
                }

                if (touches && touches.length === 2) {
                    const dy = gestureState.dy - lastMove.current.y;
                    if (Math.abs(dy) > 2) {
                        sendMouseScroll(dy);
                    }
                } else {
                    const dx = gestureState.dx - lastMove.current.x;
                    const dy = gestureState.dy - lastMove.current.y;

                    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
                        queueMouseMove(dx, dy);
                    }
                }

                lastMove.current = { x: gestureState.dx, y: gestureState.dy };
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
                    if (evt.nativeEvent.changedTouches && evt.nativeEvent.changedTouches.length === 2) {
                        sendMouseClick('right');
                    } else {
                        sendMouseClick('left');
                    }
                }
            }
        })
    , [baseUrl]);

    const isConnected = wsConnected || !!baseUrl;
    const statusLabel = isConnected ? (t('home.status_connected') || 'Bağlı') : (t('home.status_disconnected') || 'Bağlantı Yok');

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Üst Bar (Landscape) */}
            <View style={[
                styles.header, 
                { 
                    paddingLeft: Math.max(insets.left, 20), 
                    paddingRight: Math.max(insets.right, 20),
                    paddingTop: Math.max(insets.top, 8),
                }
            ]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('mouse.title')}</Text>
                </View>

                <View style={styles.headerRight}>
                    {/* Hız / Hassasiyet Değiştirici Buton (Bordersız) */}
                    <TouchableOpacity
                        onPress={cycleSpeed}
                        style={styles.speedBtn}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="tachometer-alt" size={13} color="#9CA0AC" style={{ marginRight: 6 }} />
                        <Text style={styles.speedBtnText}>{SPEED_PRESETS[speedIndex].label}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Keyboard')}
                        style={styles.actionBtn}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="keyboard" size={14} color="#E2E8F0" />
                    </TouchableOpacity>

                    {/* Sade Durum Rozeti (Sadece Bağlı / Bağlantı Yok) */}
                    <View style={styles.statusPill}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
                        <Text style={styles.statusText}>{statusLabel}</Text>
                    </View>
                </View>
            </View>

            {/* Touchpad Alanı (Bordersız & Dot-Grid Tabanlı) */}
            <View
                style={[
                    styles.mainArea,
                    {
                        paddingLeft: Math.max(insets.left, 16),
                        paddingRight: Math.max(insets.right, 16),
                        paddingBottom: Math.max(insets.bottom, 12),
                    }
                ]}
            >
                <View
                    ref={trackpadRef}
                    style={styles.trackpad}
                    onLayout={() => {
                        trackpadRef.current?.measure((x, y, width, height, pageX, pageY) => {
                            trackpadOffset.current = { x: pageX, y: pageY };
                        });
                    }}
                    {...panResponder.panHandlers}
                >
                    {/* 1. Izgara Arkasındaki Soluk Kutusuz Mouse İkonu ve Bilgilendirici Yazı */}
                    <View style={styles.watermarkContainer} pointerEvents="none">
                        <FontAwesome5 name="mouse" size={38} color="#9CA0AC" style={styles.watermarkIcon} />
                        <Text style={styles.watermarkTitle}>{t('mouse.touchpad_active') || 'Dokunmatik Yüzey'}</Text>
                        <Text style={styles.watermarkSub}>Tek Tık: Sol • 2 Parmak: Sağ Tık & Kaydırma</Text>
                    </View>

                    {/* 2. Statik Arka Plan Nokta Izgarası (Silüetin Üzerinden Geçen Hafif Izgara) */}
                    <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject} pointerEvents="none">
                        <Defs>
                            <Pattern id="dotMatrix" width={GRID_STEP} height={GRID_STEP} patternUnits="userSpaceOnUse">
                                <Circle cx={GRID_STEP / 2} cy={GRID_STEP / 2} r="1.1" fill="#FFFFFF" fillOpacity="0.08" />
                            </Pattern>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#dotMatrix)" />
                    </Svg>

                    {/* Parmağın Çevresinde Izgara Üzerinde Parlayıp Sönen Grimsi Noktalar */}
                    {gridDots.map((dot, idx) => (
                        <Animated.View
                            key={idx}
                            pointerEvents="none"
                            style={[
                                styles.gridDot,
                                {
                                    transform: [
                                        { translateX: dot.x },
                                        { translateY: dot.y },
                                        { scale: dot.scale },
                                    ],
                                    opacity: dot.opacity,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Alt Fiziksel Tıklama Tuşları (Bordersız) */}
                <View style={styles.buttonsBar}>
                    <TouchableOpacity
                        style={[styles.clickButton, styles.leftButton]}
                        onPress={() => sendMouseClick('left')}
                        activeOpacity={0.65}
                    >
                        <FontAwesome5 name="mouse" size={14} color="#9CA0AC" style={{ marginRight: 8 }} />
                        <Text style={styles.clickButtonText}>SOL TIK</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.clickButton, styles.rightButton]}
                        onPress={() => sendMouseClick('right')}
                        activeOpacity={0.65}
                    >
                        <Text style={styles.clickButtonText}>SAĞ TIK</Text>
                        <FontAwesome5 name="mouse" size={14} color="#9CA0AC" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </View>
            </View>
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
        paddingBottom: 8,
        backgroundColor: '#080808',
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 17,
        letterSpacing: -0.3,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    speedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 10,
    },
    speedBtnText: {
        color: '#E2E8F0',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
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
    mainArea: {
        flex: 1,
        backgroundColor: '#080808',
        gap: 8,
    },
    trackpad: {
        flex: 1,
        backgroundColor: '#111215',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    watermarkContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.22,
        zIndex: 0,
    },
    watermarkIcon: {
        marginBottom: 8,
    },
    watermarkTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        letterSpacing: 0.3,
        marginBottom: 3,
    },
    watermarkSub: {
        color: '#9CA0AC',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_400Regular',
        letterSpacing: 0.2,
    },
    buttonsBar: {
        flexDirection: 'row',
        height: 48,
        gap: 8,
    },
    clickButton: {
        flex: 1,
        backgroundColor: '#1E1F24',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leftButton: {
        borderTopRightRadius: 6,
        borderBottomRightRadius: 6,
    },
    rightButton: {
        borderTopLeftRadius: 6,
        borderBottomLeftRadius: 6,
    },
    clickButtonText: {
        color: '#E2E8F0',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 0.5,
    },
    // Arka plandaki ızgaraya tam oturan minik grimsi noktacık
    gridDot: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 4,
        height: 4,
        marginLeft: -2,
        marginTop: -2,
        borderRadius: 2,
        backgroundColor: '#A0A4B0',
    },
});

export default MouseScreen;
