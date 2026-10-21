import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    Platform,
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

    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('hidden');
                } catch (e) {}
            }
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            } catch (e) {}
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

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            
            {/* Header Overlay */}
            <View style={[
                styles.header, 
                { 
                    top: Math.max(insets.top, 16), 
                    left: Math.max(insets.left, 20) 
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
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.loadingText}>{t('screenshot.loading')}</Text>
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
                        <View style={styles.emptyIconBox}>
                            <FontAwesome5 name="camera" size={24} color="#717684" />
                        </View>
                        <Text style={styles.placeholderText}>{t('screenshot.empty')}</Text>
                    </View>
                )}
            </View>

            {/* Footer Action */}
            <View style={[
                styles.footer, 
                { 
                    bottom: Math.max(insets.bottom, 16), 
                    right: Math.max(insets.right, 20) 
                }
            ]}>
                <TouchableOpacity
                    style={[styles.captureButton, loading && styles.disabledButton]}
                    onPress={takeScreenshot}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <FontAwesome5 name="camera" size={14} color="#080808" style={{ marginRight: 8 }} />
                    <Text style={styles.captureButtonText}>{t('screenshot.button')}</Text>
                </TouchableOpacity>
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
        position: 'absolute',
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
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
        fontSize: 14,
        color: '#FFFFFF',
    },
    content: {
        flex: 1,
        backgroundColor: '#080808',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconBox: {
        width: 56,
        height: 56,
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
        backgroundColor: '#1E1F24',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
        fontSize: 13,
    },
    placeholderText: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
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
        zIndex: 10,
    },
    captureButton: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        paddingHorizontal: 20,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonText: {
        color: '#080808',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    disabledButton: {
        backgroundColor: '#27282F',
        opacity: 0.6,
    },
});

export default ScreenShotScreen;
