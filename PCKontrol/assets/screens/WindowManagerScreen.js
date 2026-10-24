import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    PanResponder,
    Animated,
    Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const WindowItem = ({ window, scaleX, scaleY, onMove, onClose }) => {
    const pan = useRef(new Animated.ValueXY({ x: window.x * scaleX, y: window.y * scaleY })).current;
    const isDragging = useRef(false);

    useEffect(() => {
        if (!isDragging.current) {
            pan.setValue({ x: window.x * scaleX, y: window.y * scaleY });
        }
    }, [window.x, window.y, scaleX, scaleY]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                isDragging.current = true;
                pan.setOffset({
                    x: pan.x._value,
                    y: pan.y._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gesture) => {
                isDragging.current = false;
                pan.flattenOffset();
                
                const newX = pan.x._value / scaleX;
                const newY = pan.y._value / scaleY;
                onMove(window.id, Math.round(newX), Math.round(newY));
            }
        })
    ).current;

    return (
        <Animated.View
            style={[
                styles.windowBox,
                {
                    width: window.width * scaleX,
                    height: window.height * scaleY,
                    transform: [{ translateX: pan.x }, { translateY: pan.y }]
                }
            ]}
            {...panResponder.panHandlers}
        >
            <View style={styles.windowTitleBar}>
                <Text style={styles.windowTitle} numberOfLines={1}>{window.title}</Text>
                <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => onClose(window.id)}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="times" size={10} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
            <View style={styles.windowContent}>
                <FontAwesome5 name="window-maximize" size={18} color="#555966" />
            </View>
        </Animated.View>
    );
};

const WindowManagerScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [windows, setWindows] = useState([]);
    const [baseUrl, setBaseUrl] = useState('');
    const [pcResolution, setPcResolution] = useState({ width: 1920, height: 1080 });
    const [loading, setLoading] = useState(true);
    const windowInterval = useRef(null);

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    const scaleX = screenWidth / pcResolution.width;
    const scaleY = screenHeight / pcResolution.height;

    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            if (ScreenOrientation && ScreenOrientation.lockAsync) {
                try {
                    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
                } catch (e) {}
            }
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('hidden');
                } catch (e) {}
            }
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            if (windowInterval.current) clearInterval(windowInterval.current);
            if (ScreenOrientation && ScreenOrientation.lockAsync) {
                try {
                    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                } catch (e) {}
            }
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('visible');
                } catch (e) {}
            }
        });

        loadSettings();

        return () => {
            if (windowInterval.current) clearInterval(windowInterval.current);
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation]);

    useEffect(() => {
        if (baseUrl) {
            fetchScreenInfo();
            fetchWindows();
            windowInterval.current = setInterval(fetchWindows, 600);
        }
    }, [baseUrl]);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = (await AsyncStorage.getItem('@pc_port')) || '9090';
            if (savedIP) {
                setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
            }
        } catch (e) {
            console.error('Settings load error');
        }
    };

    const fetchScreenInfo = async () => {
        try {
            const response = await fetch(`${baseUrl}/screen-info`);
            const data = await response.json();
            if (data.width && data.height) {
                setPcResolution(data);
            }
        } catch (e) {
            console.log('Screen info error');
        }
    };

    const fetchWindows = async () => {
        try {
            const response = await fetch(`${baseUrl}/windows`);
            if (response.ok) {
                const data = await response.json();
                setWindows(data);
                setLoading(false);
            }
        } catch (e) {
            console.log('Fetch windows error');
        }
    };

    const moveWindow = async (id, x, y) => {
        try {
            await fetch(`${baseUrl}/move-window?id=${id}&x=${x}&y=${y}`);
        } catch (e) {
            console.log('Move window error');
        }
    };

    const closeWindow = async (id) => {
        try {
            await fetch(`${baseUrl}/close-window-by-handle?id=${id}`);
            setWindows(prev => prev.filter(w => w.id !== id));
        } catch (e) {
            console.log('Close window error');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            
            {/* Header Overlay */}
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
                <Text style={styles.headerTitle}>{t('window_manager.title')}</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            ) : (
                <View style={styles.canvas}>
                    {windows.map(win => (
                        <WindowItem 
                            key={win.id} 
                            window={win} 
                            scaleX={scaleX} 
                            scaleY={scaleY} 
                            onMove={moveWindow}
                            onClose={closeWindow}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080808',
    },
    header: {
        position: 'absolute',
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 10,
    },
    backButton: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#27282F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#FFFFFF',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    canvas: {
        flex: 1,
        backgroundColor: '#080808',
    },
    windowBox: {
        position: 'absolute',
        backgroundColor: '#1E1F24',
        borderRadius: 12,
        overflow: 'hidden',
    },
    windowTitleBar: {
        height: 28,
        backgroundColor: '#27282F',
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    windowTitle: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        flex: 1,
    },
    closeButton: {
        width: 18,
        height: 18,
        borderRadius: 6,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    windowContent: {
        flex: 1,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default WindowManagerScreen;
