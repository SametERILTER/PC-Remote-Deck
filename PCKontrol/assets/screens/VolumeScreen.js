import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PanResponder,
    Animated,
    Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.35;
const BAR_HEIGHT = SCREEN_HEIGHT * 0.55;

const VolumeScreen = ({ navigation }) => {
    const [volume, setVolume] = useState(50);
    const [baseUrl, setBaseUrl] = useState('');
    const lastSentVolume = useRef(50);
    const lastRequestTime = useRef(0);
    const startVolume = useRef(50);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port');
            if (savedIP && savedPort) {
                const url = `http://${savedIP.trim()}:${savedPort.trim()}`;
                setBaseUrl(url);
                // İlk açılışta backend ile senkronize et
                fetch(`${url}/set-volume?level=${volume}`).catch(() => {});
            }
        } catch (e) {}
    };

    const updateVolumeFromY = (y) => {
        // Bar'ın içindeki konumu hesapla (yukarıdan aşağıya 0'dan BAR_HEIGHT'a)
        const relativeY = Math.max(0, Math.min(BAR_HEIGHT, y));
        // Yükseklik %'sini hesapla (Alt taraf %100, üst taraf %0 olduğu için ters çevir)
        const vol = Math.round(100 - (relativeY / BAR_HEIGHT * 100));
        
        if (vol === volume) return;
        setVolume(vol);
        
        const now = Date.now();
        // Mutlak değer (Absolute Set) kullandığımız için 150ms idealdir
        if (now - lastRequestTime.current > 150) {
            sendVolumeToBackend(vol);
            lastSentVolume.current = vol;
            lastRequestTime.current = now;
        }
    };

    const sendVolumeToBackend = async (vol) => {
        if (!baseUrl) return;
        try {
            fetch(`${baseUrl}/set-volume?level=${vol}`).catch(() => {});
        } catch (e) {}
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                updateVolumeFromY(evt.nativeEvent.locationY);
            },
            onPanResponderMove: (evt) => {
                updateVolumeFromY(evt.nativeEvent.locationY);
            },
            onPanResponderRelease: () => {
                sendVolumeToBackend(volume);
            }
        })
    ).current;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome5 name="chevron-left" size={20} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SES PANELİ</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.volumeWrapper}>
                    {/* Dikey Bar Katmanları */}
                    <View 
                        style={styles.barContainer} 
                        {...panResponder.panHandlers}
                    >
                        {/* Arka Plan (Boş Kısım) */}
                        <View style={styles.barBackground} pointerEvents="none">
                            {/* Parlama Efekti */}
                            <View style={[styles.glow, { height: `${volume}%`, opacity: volume / 100 * 0.4 }]} />
                            
                            {/* Dolu Kısım */}
                            <Animated.View 
                                style={[
                                    styles.barFill, 
                                    { height: `${volume}%` }
                                ]} 
                            >
                                <View style={styles.barCap} />
                            </Animated.View>
                        </View>
                        
                        {/* İkon ve Değer (Bar'ın üstünde yüzen tasarım) */}
                        <View style={styles.barOverlay} pointerEvents="none">
                            <View style={[styles.iconCircle, { backgroundColor: volume > 0 ? 'rgba(0,0,0,0.05)' : 'transparent' }]}>
                                <FontAwesome5 
                                    name={volume === 0 ? "volume-mute" : volume < 50 ? "volume-down" : "volume-up"} 
                                    size={36} 
                                    color={volume > 45 ? "#000" : "#fff"} 
                                />
                            </View>
                            <Text style={[styles.volumeValue, { color: volume > 45 ? "#000" : "#fff" }]}>
                                {Math.round(volume)}
                            </Text>
                            <Text style={[styles.percentLabel, { color: volume > 45 ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)" }]}>
                                % VOLUME
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                     <TouchableOpacity style={styles.quickButton} onPress={() => {
                        setVolume(0);
                        sendVolumeToBackend(0);
                     }}>
                        <FontAwesome5 name="volume-mute" size={18} color="#E1E1E1" />
                        <Text style={styles.quickButtonText}>SESSİZ</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.quickButton} onPress={() => {
                        setVolume(50);
                        sendVolumeToBackend(50);
                    }}>
                        <FontAwesome5 name="volume-down" size={18} color="#E1E1E1" />
                        <Text style={styles.quickButtonText}>%50</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickButton} onPress={() => {
                        setVolume(100);
                        sendVolumeToBackend(100);
                    }}>
                        <FontAwesome5 name="volume-up" size={18} color="#E1E1E1" />
                        <Text style={styles.quickButtonText}>%100</Text>
                    </TouchableOpacity>
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
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 32,
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    volumeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
        elevation: 15,
    },
    barContainer: {
        width: BAR_WIDTH,
        height: BAR_HEIGHT,
        borderRadius: 60,
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    barBackground: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    barFill: {
        backgroundColor: '#00E5FF',
        width: '100%',
    },
    glow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#00E5FF',
        filter: 'blur(30px)',
    },
    barCap: {
        height: 5,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.4)',
        position: 'absolute',
        top: 0,
    },
    barOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    volumeValue: {
        fontSize: 64,
        fontFamily: 'SpaceGrotesk_700Bold',
        lineHeight: 64,
    },
    percentLabel: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: 3,
        marginTop: 5,
    },
    footer: {
        flexDirection: 'row',
        marginTop: 60,
        gap: 15,
        paddingHorizontal: 30,
        width: '100%',
    },
    quickButton: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        paddingVertical: 20,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    quickButtonText: {
        color: '#E1E1E1',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 10,
        marginTop: 10,
        letterSpacing: 1,
    }
});

export default VolumeScreen;
