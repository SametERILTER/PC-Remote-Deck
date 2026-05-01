import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PanResponder,
    Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

const MouseScreen = ({ navigation }) => {
    const [baseUrl, setBaseUrl] = useState('');
    const [status, setStatus] = useState('Başlatılıyor...');
    const lastMove = useRef({ x: 0, y: 0 });
    const lastSendTime = useRef(0);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port');
            if (savedIP && savedPort) {
                setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
                setStatus('Bağlı');
            } else {
                setStatus('IP Yok');
            }
        } catch (e) {
            setStatus('Hata');
        }
    };

    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            NavigationBar.setVisibilityAsync('hidden');
        });

        loadSettings();

        return unsubscribeFocus;
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
        // Scroll biraz daha yavaş gönderilmeli
        if (now - lastSendTime.current < 40) return;
        lastSendTime.current = now;

        try {
            // Kaydırma yönü terslendi
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

            onPanResponderGrant: (evt, gestureState) => {
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
                // Eğer parmak pek haraket etmediyse (Tık işlemi)
                if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
                    // grant anında touches 2 ise sağ tık, tek ise sol tık
                    // Not: changedTouches'a bakmak daha garantidir
                    if (evt.nativeEvent.changedTouches.length === 2) {
                        sendMouseClick('right');
                    } else {
                        sendMouseClick('left');
                    }
                }
            }
        })
        , [baseUrl]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="chevron-left" size={20} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MOUSE</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Keyboard')}
                        style={{ marginRight: 20, padding: 10, backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#222' }}
                    >
                        <FontAwesome5 name="keyboard" size={16} color="#00E5FF" />
                    </TouchableOpacity>

                    <FontAwesome5 name="mouse" size={16} color="#00E5FF" style={{ marginRight: 8 }} />
                    <Text style={[styles.statusText, { color: status === 'Bağlı' ? '#00E5FF' : '#E74C3C' }]}>{status}</Text>
                </View>
            </View>

            <View
                style={styles.trackpadContainer}
                {...panResponder.panHandlers}
            >
                <View style={styles.trackpad} pointerEvents="none">
                    <View style={styles.hintContainer}>
                        <FontAwesome5 name="hand-pointer" size={40} color="#222" />
                        <Text style={styles.hintText}>Touchpad Aktif</Text>
                        <Text style={styles.hintSubText}>İki parmak ile kaydırın, tek parmak ile taşıyın</Text>
                    </View>
                </View>
            </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        height: 80,
        backgroundColor: '#0e0e0e',
        zIndex: 100,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 28,
        letterSpacing: 2,
        flex: 1,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    trackpadContainer: {
        flex: 1,
        backgroundColor: '#0e0e0e',
    },
    trackpad: {
        flex: 1,
        margin: 15,
        backgroundColor: '#1a1a1a',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    trackpadBgIcon: {
        position: 'absolute',
        right: -40,
        bottom: -40,
        opacity: 0.03,
        transform: [{ rotate: '-15deg' }],
    },
    hintContainer: {
        alignItems: 'center',
        opacity: 0.5,
    },
    hintText: {
        color: '#1a1a1a', // Hafif belli olan yazı
        marginTop: 20,
        fontSize: 20,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    hintSubText: {
        color: '#353535ff',
        marginTop: 8,
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_400Regular',
    },
});

export default MouseScreen;
