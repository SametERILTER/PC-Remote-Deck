import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    Animated,
    Dimensions,
    Easing,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FileTransferScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');

    const cardScale = useRef(new Animated.Value(1)).current;
    const cardTranslateY = useRef(new Animated.Value(0)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;
    const progress = useRef(new Animated.Value(0)).current;

    const [statusText, setStatusText] = useState(t('file_transfer.ready'));
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

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*', 
                copyToCacheDirectory: true,
                multiple: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                resetAnimations();
                setIsSuccess(false);
                setFiles(result.assets);
            }
        } catch (error) {
            console.error("Dosya seçme hatası", error);
            Alert.alert(t('deck.error'), t('file_transfer.select_err'));
        }
    };

    const removeFile = (indexToRemove) => {
        const newFiles = files.filter((_, index) => index !== indexToRemove);
        setFiles(newFiles);
    };

    const uploadFile = async () => {
        if (files.length === 0 || uploading) return;
        if (!baseUrl) {
            Alert.alert(t('deck.error'), t('file_transfer.no_conn'));
            return;
        }

        setUploading(true);
        setStatusText(t('file_transfer.sending', { current: 0, total: files.length }));
        setIsSuccess(false);

        Animated.timing(cardScale, {
            toValue: 1.25,
            duration: 8000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();

        let successCount = 0;
        try {
            for (let i = 0; i < files.length; i++) {
                const currentFile = files[i];
                setStatusText(t('file_transfer.sending', { current: i + 1, total: files.length }));
                
                Animated.timing(progress, { 
                    toValue: (i + 1) / files.length, 
                    duration: 300, 
                    useNativeDriver: false 
                }).start();

                const formData = new FormData();
                const uriParts = currentFile.uri.split('/');
                const fileName = currentFile.name || uriParts[uriParts.length - 1];

                formData.append('file', {
                    uri: currentFile.uri,
                    name: fileName,
                    type: currentFile.mimeType || 'application/octet-stream',
                });

                const response = await fetch(`${baseUrl}/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    successCount++;
                } else {
                    throw new Error(t('file_transfer.upload_err', { name: fileName }));
                }
            }

            if (successCount === files.length) {
                setStatusText(t('file_transfer.completed'));
                setTimeout(() => {
                    cardScale.stopAnimation();
                    
                    Animated.timing(cardTranslateY, {
                        toValue: -SCREEN_HEIGHT,
                        duration: 500,
                        easing: Easing.in(Easing.back(1.5)),
                        useNativeDriver: true,
                    }).start(() => {
                        setIsSuccess(true);
                        Animated.timing(successOpacity, {
                            toValue: 1,
                            duration: 500,
                            easing: Easing.out(Easing.exp),
                            useNativeDriver: true,
                        }).start();
                    });
                }, 350);
            }
        } catch (error) {
            console.error(error);
            resetAnimations();
            Alert.alert(t('deck.error'), t('file_transfer.transfer_err'));
            setUploading(false);
        }
    };

    const resetAnimations = () => {
        cardScale.setValue(1);
        cardTranslateY.setValue(0);
        progress.setValue(0);
        successOpacity.setValue(0);
    };

    const resetScreen = () => {
        setFiles([]);
        setIsSuccess(false);
        setUploading(false);
        setStatusText(t('file_transfer.ready'));
        resetAnimations();
    };

    const previewFiles = files.slice(0, 3);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Üst Başlık */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 16 }]}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('file_transfer.title')}</Text>
                <View style={{ width: 38 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.mainArea}>
                    {isSuccess ? (
                        <Animated.View style={[styles.successBox, { opacity: successOpacity }]}>
                            <View style={styles.successCircle}>
                                <FontAwesome5 name="check" size={40} color="#22C55E" />
                            </View>
                            <Text style={styles.successText}>{t('file_transfer.sent')}</Text>
                            <Text style={styles.successSub}>{t('file_transfer.sent_desc', { count: files.length })}</Text>
                        </Animated.View>
                    ) : (
                        <>
                            {files.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconBox}>
                                        <FontAwesome5 name="folder-open" size={36} color="#717684" />
                                    </View>
                                    <Text style={styles.emptyTitle}>{t('file_transfer.empty_title')}</Text>
                                    <Text style={styles.emptySubtitle}>{t('file_transfer.empty_desc')}</Text>
                                </View>
                            ) : (
                                <View style={styles.fileState}>
                                    <Animated.View style={[
                                        styles.bigCardContainer,
                                        {
                                            transform: [
                                                { scale: cardScale },
                                                { translateY: cardTranslateY }
                                            ]
                                        }
                                    ]}>
                                        {previewFiles.slice().reverse().map((fileItem, i) => {
                                            const actualIndex = previewFiles.length - 1 - i;
                                            const isImage = fileItem.mimeType && fileItem.mimeType.startsWith('image/');
                                            
                                            const rotateVal = `${actualIndex * 8}deg`;
                                            const translateXVal = actualIndex * 30;
                                            const translateYVal = -actualIndex * 20;
                                            const opacityVal = 1 - (actualIndex * 0.25);
                                            
                                            return (
                                                <View 
                                                    key={i}
                                                    style={[
                                                        styles.bigCardInner,
                                                        {
                                                            position: 'absolute',
                                                            transform: [
                                                                { rotate: rotateVal },
                                                                { translateX: translateXVal },
                                                                { translateY: translateYVal }
                                                            ],
                                                            opacity: opacityVal,
                                                            zIndex: 10 - actualIndex,
                                                        }
                                                    ]}
                                                >
                                                    {isImage ? (
                                                        <Image source={{ uri: fileItem.uri }} style={styles.bigImagePreview} />
                                                    ) : (
                                                        <FontAwesome5 name="file-alt" size={120} color="#E2E8F0" />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </Animated.View>

                                    {!uploading && (
                                        <View style={styles.listSection}>
                                            <Text style={styles.listTitle}>{t('file_transfer.files_to_send', { count: files.length })}</Text>
                                            <ScrollView style={styles.listScrollView} showsVerticalScrollIndicator={false}>
                                                {files.map((fileItem, index) => (
                                                    <View key={index} style={styles.listItem}>
                                                        <FontAwesome5 name="file" size={14} color="#717684" style={{ marginRight: 12 }} />
                                                        <Text style={styles.listItemName} numberOfLines={1}>
                                                            {fileItem.name || fileItem.uri.split('/').pop()}
                                                        </Text>
                                                        <TouchableOpacity onPress={() => removeFile(index)} style={styles.removeBtn} activeOpacity={0.7}>
                                                            <FontAwesome5 name="times" size={13} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {uploading && (
                                        <View style={styles.progressContainer}>
                                            <Text style={styles.progressText}>{statusText}</Text>
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
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Alt Aksiyon Butonu */}
                <View style={[
                    styles.bottomArea, 
                    { paddingBottom: Math.max(insets.bottom, 16) + 16 }
                ]}>
                    {isSuccess ? (
                        <TouchableOpacity style={styles.actionButton} onPress={resetScreen} activeOpacity={0.8}>
                            <FontAwesome5 name="plus" size={15} color="#080808" style={{ marginRight: 10 }} />
                            <Text style={styles.actionButtonText}>{t('file_transfer.send_new')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            {files.length === 0 ? (
                                <TouchableOpacity style={styles.actionButtonSecondary} onPress={pickFile} activeOpacity={0.8}>
                                    <FontAwesome5 name="folder-open" size={15} color="#FFFFFF" style={{ marginRight: 10 }} />
                                    <Text style={styles.actionButtonTextSecondary}>{t('file_transfer.select')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.actionButton, uploading && styles.actionButtonDisabled]} 
                                    onPress={uploadFile} 
                                    disabled={uploading}
                                    activeOpacity={0.8}
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="#080808" />
                                    ) : (
                                        <>
                                            <FontAwesome5 name="paper-plane" size={15} color="#080808" style={{ marginRight: 10 }} />
                                            <Text style={styles.actionButtonText}>{t('file_transfer.send')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </>
                    )}
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
        paddingHorizontal: 20,
        backgroundColor: '#080808',
        zIndex: 10,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        letterSpacing: -0.3,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    mainArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyState: {
        alignItems: 'center',
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#717684',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 20,
    },
    fileState: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    bigCardContainer: {
        width: 170,
        height: 170,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    bigCardInner: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bigImagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 20,
    },
    listSection: {
        width: '100%',
        alignItems: 'flex-start',
    },
    listTitle: {
        color: '#717684',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 10,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    listScrollView: {
        maxHeight: 160,
        width: '100%',
    },
    listItem: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
    },
    listItemName: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 13.5,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    removeBtn: {
        padding: 6,
        marginLeft: 8,
    },
    progressContainer: {
        width: '100%',
        marginTop: 20,
        alignItems: 'center',
    },
    progressText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 10,
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#27282F',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: 3,
    },
    successBox: {
        alignItems: 'center',
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 8,
    },
    successSub: {
        color: '#717684',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    bottomArea: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: '#080808',
    },
    actionButton: {
        width: '100%',
        height: 52,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#080808',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    actionButtonDisabled: {
        backgroundColor: '#27282F',
    },
    actionButtonSecondary: {
        width: '100%',
        height: 52,
        backgroundColor: '#1E1F24',
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonTextSecondary: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    }
});

export default FileTransferScreen;
