import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const SpeakScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('9090');
    const [isSending, setIsSending] = useState(false);
    const [isVolModalVisible, setIsVolModalVisible] = useState(false);

    useEffect(() => {
        loadConnection();
    }, []);

    const loadConnection = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = (await AsyncStorage.getItem('@pc_port')) || '9090';
            if (savedIP) setIpAddress(savedIP.trim());
            setPort(savedPort.trim());
        } catch (e) {
            console.error('Bağlantı bilgileri yüklenemedi', e);
        }
    };

    const handleSpeak = async () => {
        if (!ipAddress) {
            Alert.alert(t('deck.error'), t('speak.err_ip'));
            return;
        }

        if (!text.trim()) {
            Alert.alert(t('deck.error'), t('speak.err_empty'));
            return;
        }

        setIsSending(true);
        try {
            const url = `http://${ipAddress}:${port}/speak?text=${encodeURIComponent(text)}`;
            const response = await fetch(url, { method: 'GET' });

            if (response.ok) {
                setText('');
            } else {
                throw new Error('Bağlantı sorunu');
            }
        } catch (e) {
            Alert.alert(t('deck.error'), t('speak.err_conn'));
        } finally {
            setIsSending(false);
        }
    };

    const handleVolume = async (action) => {
        if (!ipAddress) return;
        try {
            await fetch(`http://${ipAddress}:${port}${action}`, { method: 'GET' });
        } catch (e) {
            console.error('Volume error:', e);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Üst Başlık */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 16 }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('speak.title')}</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.statusPill}>
                        <View style={[styles.statusDot, { backgroundColor: ipAddress ? '#22C55E' : '#EF4444' }]} />
                        <Text style={styles.statusText}>{ipAddress ? (t('home.status_connected') || 'Bağlı') : (t('home.status_disconnected') || 'Bağlantı Yok')}</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => setIsVolModalVisible(true)} 
                        style={styles.volButton}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="volume-up" size={15} color="#E2E8F0" />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={[
                        styles.content, 
                        { paddingBottom: Math.max(insets.bottom, 16) + 30 }
                    ]} 
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <Text style={styles.title}>{t('speak.header')}</Text>
                        <Text style={styles.subtitle}>
                            {t('speak.subtitle')}
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('speak.placeholder')}
                                placeholderTextColor="#555966"
                                value={text}
                                onChangeText={setText}
                                multiline={true}
                                maxLength={200}
                                autoFocus={true}
                            />
                            <Text style={styles.charCount}>{text.length}/200</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
                            onPress={handleSpeak}
                            disabled={!text.trim() || isSending}
                            activeOpacity={0.8}
                        >
                            {isSending ? (
                                <ActivityIndicator color="#080808" />
                            ) : (
                                <>
                                    <FontAwesome5 name="paper-plane" size={15} color="#080808" style={{ marginRight: 8 }} />
                                    <Text style={styles.sendBtnText}>{t('speak.button')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Ses Kontrol Bottom Sheet */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isVolModalVisible}
                onRequestClose={() => setIsVolModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackdrop} 
                        activeOpacity={1} 
                        onPress={() => setIsVolModalVisible(false)} 
                    />
                    <View style={[
                        styles.modalContent,
                        { paddingBottom: Math.max(insets.bottom, 24) + 10 }
                    ]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('speak.vol_title')}</Text>
                            <TouchableOpacity 
                                onPress={() => setIsVolModalVisible(false)} 
                                style={styles.modalCloseBtn}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="times" size={13} color="#9CA0AC" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.volControls}>
                            <TouchableOpacity 
                                style={styles.volBtn} 
                                onPress={() => handleVolume('/vol-down')}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="volume-down" size={20} color="#E2E8F0" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.volBtn, { backgroundColor: '#351B21' }]} 
                                onPress={() => handleVolume('/mute')}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="volume-mute" size={20} color="#EF4444" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.volBtn} 
                                onPress={() => handleVolume('/vol-up')}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="volume-up" size={20} color="#E2E8F0" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    volButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 10,
        gap: 8,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        color: '#9CA0AC',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        letterSpacing: -0.3,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#1E1F24',
        borderRadius: 20,
        padding: 20,
    },
    title: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 6,
    },
    subtitle: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 13,
        marginBottom: 20,
        lineHeight: 18,
    },
    inputContainer: {
        backgroundColor: '#27282F',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    input: {
        width: '100%',
        minHeight: 110,
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        textAlignVertical: 'top',
        lineHeight: 22,
    },
    charCount: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        textAlign: 'right',
        marginTop: 4,
    },
    sendBtn: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: '#FFFFFF',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#27282F',
        opacity: 0.6,
    },
    sendBtnText: {
        color: '#080808',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: '#1E1F24',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 12,
    },
    sheetHandleWrap: {
        alignItems: 'center',
        paddingVertical: 6,
        marginBottom: 10,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3F424E',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 17,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    volControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    volBtn: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#27282F',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SpeakScreen;
