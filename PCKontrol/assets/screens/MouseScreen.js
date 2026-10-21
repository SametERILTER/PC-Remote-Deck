import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PanResponder,
    Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const MouseScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [baseUrl, setBaseUrl] = useState('');
    const [status, setStatus] = useState(t('mouse.initializing'));
    const lastMove = useRef({ x: 0, y: 0 });
    const lastSendTime = useRef(0);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port');
            if (savedIP && savedPort) {
                setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
                setStatus(t('home.status_connected'));
            } else {
                setStatus(t('mouse.no_ip'));
            }
        } catch (e) {
            setStatus(t('deck.error'));
        }
    };

    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            } catch (e) {}
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('hidden');
                } catch (e) {}
            }
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('visible');
                } catch (e) {}
            }
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (e) {}
        });

        loadSettings();

        return () => {
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation]);

    const sendMouseMove = async (dx, dy) => {
        if (!baseUrl) return;
        const now = Date.now();
        if (now - lastSendTime.current < 16) return;
        lastSendTime.current = now;

        try {
            const speed = 4.8; 
            fetch(`${baseUrl}/mouse-move?dx=${Math.round(dx * speed)}&dy=${Math.round(dy * speed)}`);
        } catch (e) { }
    };

    const sendMouseScroll = async (delta) => {
        if (!baseUrl) return;
        const now = Date.now();
        if (now - lastSendTime.current < 40) return;
        lastSendTime.current = now;

        try {
            fetch(`${baseUrl}/mouse-scroll?delta=${delta > 0 ? 1 : -1}`);
        } catch (e) { }
    };

    const sendMouseClick = async (button) => {
        if (!baseUrl) return;
        try {
            fetch(`${baseUrl}/mouse-click?button=${button}`);
        } catch (e) { }
    };

    const panResponder = useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,

            onPanResponderGrant: () => {
                lastMove.current = { x: 0, y: 0 };
            },
            onPanResponderMove: (evt, gestureState) => {
                const touches = evt.nativeEvent.touches;

                if (touches.length === 2) {
                    const dy = gestureState.dy - lastMove.current.y;
                    if (Math.abs(dy) > 2) {
                        sendMouseScroll(dy);
                    }
                } else if (touches.length === 1) {
                    const dx = gestureState.dx - lastMove.current.x;
                    const dy = gestureState.dy - lastMove.current.y;

                    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                        sendMouseMove(dx, dy);
                    }
                }

                lastMove.current = { x: gestureState.dx, y: gestureState.dy };
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
                    if (evt.nativeEvent.changedTouches.length === 2) {
                        sendMouseClick('right');
                    } else {
                        sendMouseClick('left');
                    }
                }
            }
        })
    , [baseUrl]);

    const isConnected = status === t('home.status_connected');

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
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Keyboard')}
                        style={styles.actionBtn}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="keyboard" size={15} color="#E2E8F0" />
                    </TouchableOpacity>

                    <View style={styles.statusPill}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
                        <Text style={styles.statusText}>{status}</Text>
                    </View>
                </View>
            </View>

            {/* Touchpad Yüzeyi */}
            <View
                style={[
                    styles.trackpadContainer,
                    {
                        paddingLeft: Math.max(insets.left, 16),
                        paddingRight: Math.max(insets.right, 16),
                        paddingBottom: Math.max(insets.bottom, 12),
                    }
                ]}
                {...panResponder.panHandlers}
            >
                <View style={styles.trackpad} pointerEvents="none">
                    <View style={styles.hintContainer}>
                        <View style={styles.hintIconBox}>
                            <FontAwesome5 name="hand-pointer" size={26} color="#717684" />
                        </View>
                        <Text style={styles.hintText}>{t('mouse.touchpad_active')}</Text>
                        <Text style={styles.hintSubText}>{t('mouse.touchpad_desc')}</Text>
                    </View>
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
        paddingBottom: 10,
        backgroundColor: '#080808',
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        letterSpacing: -0.3,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 12,
        height: 38,
        borderRadius: 12,
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
    trackpadContainer: {
        flex: 1,
        backgroundColor: '#080808',
    },
    trackpad: {
        flex: 1,
        backgroundColor: '#1E1F24',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hintContainer: {
        alignItems: 'center',
    },
    hintIconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    hintText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 4,
    },
    hintSubText: {
        color: '#717684',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
});

export default MouseScreen;
