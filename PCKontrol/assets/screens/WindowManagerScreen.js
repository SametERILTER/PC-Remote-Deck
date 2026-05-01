import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    PanResponder,
    Animated,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

const WindowItem = ({ window, scaleX, scaleY, onMove, onClose }) => {
    const pan = useRef(new Animated.ValueXY({ x: window.x * scaleX, y: window.y * scaleY })).current;

    // Update pan when window position updates from server (if not being dragged)
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
                >
                    <FontAwesome5 name="times" size={12} color="#FFF" />
                </TouchableOpacity>
            </View>
            <View style={styles.windowContent}>
                <FontAwesome5 name="window-maximize" size={20} color="#333" />
            </View>
        </Animated.View>
    );
};

const WindowManagerScreen = ({ navigation }) => {
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
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            NavigationBar.setVisibilityAsync('hidden');
        });

        const setup = async () => {
            await loadSettings();
        };

        setup();

        return () => {
            if (windowInterval.current) clearInterval(windowInterval.current);
            unsubscribeFocus();
        };
    }, [navigation]);

    useEffect(() => {
        if (baseUrl) {
            fetchScreenInfo();
            fetchWindows();
            windowInterval.current = setInterval(fetchWindows, 500); // 500ms to balance performance
        }
    }, [baseUrl]);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port');
            if (savedIP && savedPort) {
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
            // Optimistik güncelleme: Pencereyi anında listeden çıkar
            setWindows(prev => prev.filter(w => w.id !== id));
        } catch (e) {
            console.log('Close window error');
        }
    };

    const handleBack = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar hidden />
            
            {/* Header Overlay */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <FontAwesome5 name="chevron-left" size={16} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pencere Yönetimi</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4285F4" />
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A1A1A',
    },
    header: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 25,
    },
    backButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 14,
        color: '#E1E1E1',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    canvas: {
        flex: 1,
        backgroundColor: '#121212',
    },
    windowBox: {
        position: 'absolute',
        backgroundColor: '#FFF',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#4285F4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    windowTitleBar: {
        height: 28,
        backgroundColor: '#4285F4',
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    windowTitle: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'Inter_600SemiBold',
        flex: 1,
    },
    closeButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#C0392B',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
    },
    windowContent: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default WindowManagerScreen;
