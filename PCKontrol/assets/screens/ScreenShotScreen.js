import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

const ScreenShotScreen = ({ navigation }) => {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            NavigationBar.setVisibilityAsync('hidden');
            NavigationBar.setBehaviorAsync('overlay-swipe');
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        });

        const unsubscribeBlur = navigation.addListener('blur', () => {
            NavigationBar.setVisibilityAsync('visible');
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
            const savedPort = await AsyncStorage.getItem('@pc_port');
            if (savedIP && savedPort) {
                setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
            } else if (savedIP) {
                setBaseUrl(`http://${savedIP.trim()}`);
            }
        } catch (e) {
            console.error('Settings load error');
        }
    };

    const takeScreenshot = async () => {
        if (!baseUrl) return;
        setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/screenshot`);
            const data = await response.json();
            if (data.image) {
                setImage(`data:image/png;base64,${data.image}`);
            }
        } catch (error) {
            console.error('Screenshot error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar hidden />
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <FontAwesome5 name="chevron-left" size={16} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>EKRAN</Text>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#4285F4" />
                        <Text style={styles.loadingText}>Görüntü alınıyor...</Text>
                    </View>
                ) : image ? (
                    <ScrollView
                        horizontal={true}
                        contentContainerStyle={styles.imageScroll}
                        maximumZoomScale={3}
                        minimumZoomScale={0.5}
                    >
                        <Image
                            source={{ uri: image }}
                            style={styles.screenshot}
                            resizeMode="contain"
                        />
                    </ScrollView>
                ) : (
                    <View style={styles.centerContainer}>
                        <FontAwesome5 name="camera" size={40} color="#1E1E1E" />
                        <Text style={styles.placeholderText}>Henüz görüntü alınmadı</Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.captureButton, loading && styles.disabledButton]}
                    onPress={takeScreenshot}
                    disabled={loading}
                >
                    <FontAwesome5 name="camera" size={16} color="#E1E1E1" style={{ marginRight: 10 }} />
                    <Text style={styles.captureButtonText}>Yeni Görüntü Al</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0e0e0e',
    },
    header: {
        position: 'absolute',
        top: 25,
        left: 25,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(14, 14, 14, 0.7)',
        borderRadius: 20,
        paddingRight: 20,
        paddingLeft: 6,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 20,
        textAlign: 'left',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    content: {
        flex: 1,
        backgroundColor: '#0e0e0e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 15,
        fontFamily: 'SpaceGrotesk_500Medium',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 10,
    },
    placeholderText: {
        color: '#222',
        marginTop: 16,
        fontFamily: 'SpaceGrotesk_500Medium',
        fontSize: 14,
    },
    imageScroll: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    screenshot: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    footer: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        zIndex: 10,
    },
    captureButton: {
        backgroundColor: '#00E5FF',
        flexDirection: 'row',
        paddingHorizontal: 25,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonText: {
        color: '#000',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 15,
    },
    disabledButton: {
        backgroundColor: '#2A2A2A',
        opacity: 0.5,
    },
});

export default ScreenShotScreen;
