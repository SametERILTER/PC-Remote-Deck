import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function QrScannerScreen({ navigation }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [layout, setLayout] = useState({ width: 0, height: 0 });

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }, []);

    const handleBarcodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            const trimmed = (data || '').trim();
            const parts = trimmed.split(":");
            if (parts.length === 2 && parts[0].includes(".")) {
                const ip = parts[0].trim();
                const port = parts[1].trim();
                await AsyncStorage.setItem('@pc_ip_address', ip);
                await AsyncStorage.setItem('@pc_port', port);
                Alert.alert(t('qr.success'), t('qr.saved', { ip, port }), [
                    { text: t('qr.ok'), onPress: () => navigation.navigate("MainTabs") }
                ]);
            } else {
                Alert.alert(t('deck.error'), t('qr.invalid'), [
                    { text: t('qr.scan_again'), onPress: () => setScanned(false) }
                ]);
            }
        } catch (e) {
            console.error("QR Error", e);
            Alert.alert(t('deck.error'), t('qr.save_err'), [
                { text: t('qr.ok'), onPress: () => setScanned(false) }
            ]);
        }
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
                        <FontAwesome5 name="arrow-left" size={22} color="#FFFFFF" />
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

    const FRAME_SIZE = 250;

    return (
        <View
            style={styles.container}
            onLayout={(e) => setLayout(e.nativeEvent.layout)}
        >
            <StatusBar style="light" backgroundColor="transparent" translucent={true} />

            {/* Kamera Önizlemesi */}
            {isFocused && (
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                    facing="back"
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* Arayüz Katmanı: Başlık ve tam ortalanmış görüş alanı */}
            <View style={styles.uiContainer} pointerEvents="box-none">
                {/* Üst Başlık */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome5 name="arrow-left" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('qr.scan_title')}</Text>
                </View>
            </View>

            {/* Ekranın ölçülen gerçek yüksekliğine göre tam dikey ortadaki kare */}
            {layout.height > 0 && (
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
                    <View style={styles.scanLine} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    uiContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    backButton: {
        marginRight: 15,
        padding: 4,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    viewfinderArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#22C55E',
        backgroundColor: 'transparent',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#22C55E',
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 5,
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
