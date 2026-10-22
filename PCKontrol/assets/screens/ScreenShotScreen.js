import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Dimensions,
    Platform,
    Animated,
    PanResponder,
    Vibration,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const ScreenShotScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');
    const [currentZoomLevel, setCurrentZoomLevel] = useState(1);

    // Animasyon ve Zoom Değerleri
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    // Güncel değerleri JS tarafında takip etme
    const scaleVal = useRef(1);
    const panVal = useRef({ x: 0, y: 0 });
    const lastDistance = useRef(0);
    const lastPan = useRef({ x: 0, y: 0 });
    const lastTapTime = useRef(0);

    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('hidden');
                } catch {}
            }
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            } catch {}
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
        });

        loadSettings();

        return () => {
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation]);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port') || '9090';
            if (savedIP && savedPort) {
                const url = `http://${savedIP.trim()}:${savedPort.trim()}`;
                setBaseUrl(url);
                // Ekran açıldığında otomatik ekran görüntüsü çek
                fetchScreenshot(url);
            }
        } catch {}
    };

    const fetchScreenshot = async (url = baseUrl) => {
        if (!url || loading) return;
        setLoading(true);
        try {
            const response = await fetch(`${url}/screenshot`);
            const data = await response.json();
            if (data && data.image) {
                setImage(`data:image/png;base64,${data.image}`);
                resetZoom();
            }
        } catch (error) {
            console.error('Screenshot error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Zoom Sıfırlama
    const resetZoom = useCallback(() => {
        scaleVal.current = 1;
        panVal.current = { x: 0, y: 0 };
        setCurrentZoomLevel(1);

        Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7 }),
        ]).start();
    }, [scale, translateX, translateY]);

    // Belirli bir Zoom seviyesine animasyonlu gitme
    const setZoom = useCallback((targetScale) => {
        const clampedScale = Math.min(Math.max(targetScale, 1), 4.5);
        scaleVal.current = clampedScale;
        setCurrentZoomLevel(Math.round(clampedScale * 10) / 10);

        if (clampedScale === 1) {
            panVal.current = { x: 0, y: 0 };
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }),
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7 }),
            ]).start();
        } else {
            Animated.spring(scale, {
                toValue: clampedScale,
                useNativeDriver: true,
                friction: 7,
            }).start();
        }
    }, [scale, translateX, translateY]);

    const handleZoomIn = () => {
        try { Vibration.vibrate(10); } catch {}
        setZoom(scaleVal.current + 0.7);
    };

    const handleZoomOut = () => {
        try { Vibration.vibrate(10); } catch {}
        setZoom(scaleVal.current - 0.7);
    };

    // İki parmak arası mesafe hesaplayıcı (Pinch)
    const calcDistance = (touches) => {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        return Math.hypot(dx, dy);
    };

    const panResponder = useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const touches = evt.nativeEvent.touches;
                if (touches && touches.length === 2) {
                    lastDistance.current = calcDistance(touches);
                } else {
                    lastPan.current = { x: 0, y: 0 };

                    // Çift dokunma kontrolü (Double Tap to Zoom)
                    const now = Date.now();
                    if (now - lastTapTime.current < 280) {
                        try { Vibration.vibrate(15); } catch {}
                        if (scaleVal.current > 1.3) {
                            resetZoom();
                        } else {
                            setZoom(2.4);
                        }
                    }
                    lastTapTime.current = now;
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const touches = evt.nativeEvent.touches;

                if (touches && touches.length === 2) {
                    // İki parmakla Pinch-to-Zoom
                    const dist = calcDistance(touches);
                    if (lastDistance.current > 0) {
                        const factor = dist / lastDistance.current;
                        const newScale = Math.min(Math.max(scaleVal.current * factor, 0.9), 4.5);
                        scaleVal.current = newScale;
                        scale.setValue(newScale);
                        setCurrentZoomLevel(Math.round(newScale * 10) / 10);
                    }
                    lastDistance.current = dist;
                } else if (touches && touches.length === 1 && scaleVal.current > 1.05) {
                    // Tek parmakla Pan (Görseli Kaydırma) - Sadece resim büyütüldüğünde
                    const dx = gestureState.dx - lastPan.current.x;
                    const dy = gestureState.dy - lastPan.current.y;
                    lastPan.current = { x: gestureState.dx, y: gestureState.dy };

                    panVal.current.x += dx;
                    panVal.current.y += dy;

                    translateX.setValue(panVal.current.x);
                    translateY.setValue(panVal.current.y);
                }
            },
            onPanResponderRelease: () => {
                lastDistance.current = 0;
                // Eğer zoom 1'in altına indiyse 1'e geri yaylandır
                if (scaleVal.current < 1) {
                    resetZoom();
                }
            },
        })
    , [resetZoom, setZoom, scale, translateX, translateY]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Üst Header Bar */}
            <View style={[
                styles.header, 
                { 
                    top: Math.max(insets.top, 14), 
                    left: Math.max(insets.left, 16) 
                }
            ]}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="chevron-left" size={13} color="#E2E8F0" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('screenshot.title')}</Text>

                <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: baseUrl ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.statusText}>{baseUrl ? (t('home.status_connected') || 'Bağlı') : (t('home.status_disconnected') || 'Bağlantı Yok')}</Text>
                </View>

                {currentZoomLevel > 1 && (
                    <View style={styles.zoomBadge}>
                        <Text style={styles.zoomBadgeText}>{currentZoomLevel}x</Text>
                    </View>
                )}
            </View>

            {/* Sağ Üst Hızlı Zoom Kontrolleri */}
            {image && (
                <View style={[
                    styles.zoomControls, 
                    { 
                        top: Math.max(insets.top, 14), 
                        right: Math.max(insets.right, 16) 
                    }
                ]}>
                    <TouchableOpacity 
                        style={styles.zoomBtn} 
                        onPress={handleZoomIn}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="search-plus" size={14} color="#E2E8F0" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.zoomBtn} 
                        onPress={handleZoomOut}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="search-minus" size={14} color="#E2E8F0" />
                    </TouchableOpacity>

                    {currentZoomLevel > 1 && (
                        <TouchableOpacity 
                            style={styles.zoomBtn} 
                            onPress={resetZoom}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="compress-arrows-alt" size={13} color="#38BDF8" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Ana Resim Görünümü (Tüm Ekranı Kaplayan & Zoomable) */}
            <View style={styles.viewport} {...panResponder.panHandlers}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#38BDF8" />
                        <Text style={styles.loadingText}>{t('screenshot.loading')}</Text>
                    </View>
                ) : image ? (
                    <Animated.View
                        style={[
                            styles.imageContainer,
                            {
                                transform: [
                                    { translateX: translateX },
                                    { translateY: translateY },
                                    { scale: scale },
                                ],
                            },
                        ]}
                    >
                        <Image
                            source={{ uri: image }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    </Animated.View>
                ) : (
                    <View style={styles.centerContainer}>
                        <View style={styles.emptyIconBox}>
                            <FontAwesome5 name="desktop" size={28} color="#717684" />
                        </View>
                        <Text style={styles.placeholderText}>{t('screenshot.empty')}</Text>
                        <Text style={styles.placeholderSub}>Ekran görüntüsü almak için aşağıdaki butona basın</Text>
                    </View>
                )}
            </View>

            {/* Alt Sağ Yenile / Ekran Görüntüsü Al Butonu */}
            <View style={[
                styles.footer, 
                { 
                    bottom: Math.max(insets.bottom, 14), 
                    right: Math.max(insets.right, 16) 
                }
            ]}>
                <TouchableOpacity
                    style={[styles.captureButton, loading && styles.disabledButton]}
                    onPress={() => fetchScreenshot()}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#080808" />
                    ) : (
                        <>
                            <FontAwesome5 name="sync-alt" size={13} color="#080808" style={{ marginRight: 8 }} />
                            <Text style={styles.captureButtonText}>{t('screenshot.button')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050507',
    },
    header: {
        position: 'absolute',
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 27, 32, 0.88)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 10,
    },
    backButton: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#27282F',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#FFFFFF',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 10,
        height: 28,
        borderRadius: 8,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_500Medium',
        color: '#9CA0AC',
    },
    zoomBadge: {
        backgroundColor: '#38BDF8',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    zoomBadgeText: {
        color: '#080808',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
    },
    zoomControls: {
        position: 'absolute',
        zIndex: 20,
        flexDirection: 'row',
        backgroundColor: 'rgba(26, 27, 32, 0.88)',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    zoomBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#22232A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewport: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconBox: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    loadingText: {
        color: '#E2E8F0',
        marginTop: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    placeholderText: {
        color: '#E2E8F0',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
        marginBottom: 4,
    },
    placeholderSub: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 12,
    },
    footer: {
        position: 'absolute',
        zIndex: 20,
    },
    captureButton: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        paddingHorizontal: 16,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    captureButtonText: {
        color: '#080808',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
    },
    disabledButton: {
        backgroundColor: '#27282F',
        opacity: 0.6,
    },
});

export default ScreenShotScreen;
