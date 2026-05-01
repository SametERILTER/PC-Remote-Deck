import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function QrScannerScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, []);

    const handleBarcodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);
        // data format: "192.168.1.5:9090"
        try {
            const parts = data.split(":");
            if (parts.length === 2 && data.includes(".")) {
                const ip = parts[0];
                const port = parts[1];
                await AsyncStorage.setItem('@pc_ip_address', ip);
                await AsyncStorage.setItem('@pc_port', port);
                Alert.alert("Başarılı", `Bağlantı başarılı bir şekilde kaydedildi:\nIP: ${ip}\nPort: ${port}`, [
                    { text: "Tamam", onPress: () => navigation.navigate("MainTabs") }
                ]);
            } else {
                Alert.alert("Hata", "Geçersiz veya desteklenmeyen QR Kod", [
                    { text: "Tekrar Oku", onPress: () => setScanned(false) }
                ]);
            }
        } catch (e) {
            console.error("QR Error", e);
            Alert.alert("Hata", "Ayarlar kaydedilemedi.", [
                { text: "Tamam", onPress: () => setScanned(false) }
            ]);
        }
    };

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome5 name="arrow-left" size={24} color="#E1E1E1" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>QR Tarayıcı</Text>
                </View>
                <View style={styles.permissionContainer}>
                    <Text style={{color: 'white', marginBottom: 20, fontFamily: 'Inter_500Medium'}}>Kameraya erişim izni gerekiyor</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                        <Text style={{color: '#121212', fontFamily: 'Inter_700Bold'}}>İzin Ver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome5 name="arrow-left" size={24} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>QR Kodu Taratın</Text>
            </View>
            
            <View style={styles.cameraContainer}>
                <CameraView
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.overlay}>
                    <View style={styles.scanFrame} />
                    <View style={styles.scanLine} />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 24,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        color: '#E1E1E1',
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
    },
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#333',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#E1E1E1',
        backgroundColor: 'transparent',
        borderRadius: 20,
    },
    scanLine: {
        position: 'absolute',
        width: 250,
        height: 2,
        backgroundColor: '#27AE60',
        top: '50%',
        shadowColor: '#27AE60',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permissionButton: {
        backgroundColor: '#E1E1E1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 14,
    }
});
