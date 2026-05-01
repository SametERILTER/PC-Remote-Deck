import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Animated,
    Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FileTransferScreen = ({ navigation }) => {
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');

    // Animasyon değerleri
    const translateY = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const progress = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;
    
    const [statusText, setStatusText] = useState('Gönderilmeye Hazır');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

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

    const pickImage = async () => {
        // İzin iste
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermeniz gerekiyor.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
        });

        if (!result.canceled) {
            // Yeni resim seçildiğinde animasyon değerlerini sıfırla
            translateY.setValue(0);
            opacity.setValue(1);
            setImage(result.assets[0]);
        }
    };

    const uploadFile = async () => {
        if (!image || uploading) return;
        if (!baseUrl) {
            Alert.alert('Hata', 'Bilgisayar bağlantısı ayarlanmamış.');
            return;
        }

        setUploading(true);
        setStatusText('Gönderiliyor...');
        setIsSuccess(false);

        // 1. FIRLATMA ANIMASYONU
        Animated.parallel([
            Animated.timing(translateY, { toValue: -SCREEN_HEIGHT, duration: 800, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.1, duration: 800, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
            Animated.timing(progress, { toValue: 1, duration: 2500, useNativeDriver: false }), // Progress için native driver kapalı
        ]).start();

        try {
            const formData = new FormData();
            const uriParts = image.uri.split('/');
            const fileName = uriParts[uriParts.length - 1];

            formData.append('file', {
                uri: image.uri,
                name: fileName,
                type: 'image/jpeg',
            });

            const response = await fetch(`${baseUrl}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setStatusText('Tamamlandı!');
                progress.setValue(1);
                
                setTimeout(() => {
                    setIsSuccess(true);
                    Animated.timing(successOpacity, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }).start();
                }, 500);
            } else {
                throw new Error('Yükleme başarısız');
            }
        } catch (error) {
            console.error(error);
            resetAnimations();
            Alert.alert('Hata', 'Dosya gönderilemedi. Bağlantıyı kontrol edin.');
            setUploading(false);
        }
    };

    const resetAnimations = () => {
        translateY.setValue(0);
        scale.setValue(1);
        rotate.setValue(0);
        opacity.setValue(1);
        progress.setValue(0);
        successOpacity.setValue(0);
    };

    const resetScreen = () => {
        setImage(null);
        setIsSuccess(false);
        setUploading(false);
        setStatusText('Gönderilmeye Hazır');
        resetAnimations();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome5 name="chevron-left" size={20} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>DOSYA GÖNDER</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.uploadCard}>
                    {isSuccess ? (
                        <Animated.View style={[styles.successBox, { opacity: successOpacity }]}>
                            <View style={styles.successCircle}>
                                <FontAwesome5 name="check" size={40} color="#00E5FF" />
                            </View>
                            <Text style={styles.successText}>BAŞARIYLA AKTARILDI</Text>
                            <TouchableOpacity style={styles.resetButton} onPress={resetScreen}>
                                <Text style={styles.resetButtonText}>Tamam</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ) : (
                        <>
                            <FontAwesome5 name="file-upload" size={120} color="#00E5FF" style={styles.cardBgIcon} />
                            <FontAwesome5 name="cloud-upload-alt" size={60} color="#00E5FF" style={styles.bigIcon} />
                            <Text style={styles.title}>{uploading ? 'GÖNDERİLİYOR' : 'Dosya Seçin'}</Text>
                            <Text style={styles.subtitle}>
                                {uploading ? 'Görsel bilgisayarınıza aktarılıyor.' : 'İstediğiniz resmi seçerek doğrudan bilgisayarınıza aktarın.'}
                            </Text>

                            {!uploading && (
                                <TouchableOpacity
                                    style={styles.selectButton}
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                >
                                    <FontAwesome5 name="images" size={20} color="#00E5FF" style={{ marginRight: 10 }} />
                                    <Text style={styles.buttonText}>Galeriden Seç</Text>
                                </TouchableOpacity>
                            )}

                            {image && (
                                <Animated.View style={[
                                    styles.previewContainer,
                                    {
                                        opacity: opacity,
                                        transform: [
                                            { translateY: translateY },
                                            { scale: scale },
                                            { rotate: rotate.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0deg', '45deg']
                                            })}
                                        ]
                                    }
                                ]}>
                                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                                    
                                    <View style={{ flex: 1, marginLeft: 15 }}>
                                        <Text style={styles.fileName} numberOfLines={1}>
                                            {image.uri.split('/').pop()}
                                        </Text>
                                        <Text style={{ color: '#00E5FF', fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold' }}>{statusText}</Text>
                                    </View>
                                    
                                    {!uploading && (
                                        <TouchableOpacity onPress={() => setImage(null)} style={styles.removeButton}>
                                            <FontAwesome5 name="times-circle" size={24} color="#E74C3C" />
                                        </TouchableOpacity>
                                    )}
                                </Animated.View>
                            )}

                            {uploading && (
                                <View style={styles.progressWrapper}>
                                    <View style={styles.progressTrack}>
                                        <Animated.View style={[
                                            styles.progressBar,
                                            {
                                                width: progress.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%']
                                                })
                                            }
                                        ]} />
                                    </View>
                                </View>
                            )}

                            {image && !uploading && (
                                <TouchableOpacity
                                    style={styles.uploadButton}
                                    onPress={uploadFile}
                                    activeOpacity={0.8}
                                >
                                    <FontAwesome5 name="paper-plane" size={20} color="white" style={{ marginRight: 10 }} />
                                    <Text style={styles.buttonText}>Gönder</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.infoBox}>
                    <FontAwesome5 name="info-circle" size={16} color="#666" style={{ marginRight: 10 }} />
                    <Text style={styles.infoText}>
                        Resimler doğrudan Masaüstüne kaydedilir.
                    </Text>
                </View>
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
        padding: 20,
        alignItems: 'center',
    },
    uploadCard: {
        width: '100%',
        backgroundColor: '#1a1a1a',
        borderRadius: 32,
        padding: 35,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        overflow: 'hidden',
    },
    cardBgIcon: {
        position: 'absolute',
        right: -30,
        bottom: -30,
        opacity: 0.04,
        transform: [{ rotate: '-10deg' }],
    },
    bigIcon: {
        marginBottom: 20,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'SpaceGrotesk_700Bold',
        marginBottom: 8,
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        fontFamily: 'SpaceGrotesk_400Regular',
        marginBottom: 35,
    },
    selectButton: {
        width: '100%',
        height: 60,
        backgroundColor: '#252525',
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    uploadButton: {
        width: '100%',
        height: 64,
        backgroundColor: '#00E5FF',
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    disabledButton: {
        backgroundColor: '#252525',
        opacity: 0.5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    previewContainer: {
        width: '100%',
        height: 100,
        backgroundColor: '#222',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    previewImage: {
        width: 70,
        height: 70,
        borderRadius: 12,
    },
    fileName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    removeButton: {
        padding: 10,
    },
    infoBox: {
        flexDirection: 'row',
        marginTop: 30,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    infoText: {
        color: '#666',
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_400Regular',
        textAlign: 'center',
    },
    progressWrapper: {
        width: '100%',
        marginTop: 20,
    },
    progressTrack: {
        width: '100%',
        height: 8,
        backgroundColor: '#1a1a1a',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#00E5FF',
        borderRadius: 4,
    },
    successBox: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#00E5FF10',
        borderWidth: 1,
        borderColor: '#00E5FF40',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'SpaceGrotesk_700Bold',
        marginBottom: 25,
    },
    resetButton: {
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    resetButtonText: {
        color: '#00E5FF',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 14,
    }
});

export default FileTransferScreen;
