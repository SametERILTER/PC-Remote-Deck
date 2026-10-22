import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const KeyboardScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [isRealtime, setIsRealtime] = useState(true);
    const inputRef = useRef(null);
    const lastSentText = useRef('');

    useEffect(() => {
        loadSettings();
        // Otomatik klavye açma
        setTimeout(() => {
            inputRef.current?.focus();
        }, 500);
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

    const sendChar = async (char) => {
        if (!baseUrl || !char) return;
        try {
            const encodedChar = encodeURIComponent(char);
            await fetch(`${baseUrl}/type-text?text=${encodedChar}`);
        } catch (e) {
            console.log('Type error');
        }
    };

    const sendBackspace = async () => {
        if (!baseUrl) return;
        try {
            await fetch(`${baseUrl}/backspace`);
        } catch (e) {
            console.log('Backspace error');
        }
    };

    const sendEnter = async () => {
        if (!baseUrl) return;
        try {
            await fetch(`${baseUrl}/enter`);
        } catch (e) {
            console.log('Enter error');
        }
    };

    const handleTextChange = (newText) => {
        if (isRealtime) {
            if (newText.length > lastSentText.current.length) {
                const addedChars = newText.substring(lastSentText.current.length);
                if (addedChars === '\n' || addedChars === '\r\n') {
                    sendEnter();
                } else {
                    sendChar(addedChars);
                }
            }
            lastSentText.current = newText;
        }
        setText(newText);
    };

    const handleKeyPress = ({ nativeEvent }) => {
        if (isRealtime) {
            if (nativeEvent.key === 'Backspace') {
                sendBackspace();
            } else if (nativeEvent.key === 'Enter') {
                sendEnter();
            }
        }
    };

    const handleSendBulk = async () => {
        if (!text || !baseUrl) return;
        try {
            const encodedText = encodeURIComponent(text);
            await fetch(`${baseUrl}/type-text?text=${encodedText}`);
            setText('');
            lastSentText.current = '';
        } catch (e) {
            console.log('Bulk type error');
        }
    };

    const clearInput = () => {
        setText('');
        lastSentText.current = '';
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
                    <Text style={styles.headerTitle}>{t('keyboard.title')}</Text>
                </View>
                <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: baseUrl ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.statusText}>{baseUrl ? (t('home.status_connected') || 'Bağlı') : (t('home.status_disconnected') || 'Bağlantı Yok')}</Text>
                </View>
            </View>

            {/* Mod Ayarı Kartı */}
            <View style={styles.modeCard}>
                <View style={styles.modeRow}>
                    <Text style={styles.modeText}>{t('keyboard.realtime')}</Text>
                    <Switch
                        value={isRealtime}
                        onValueChange={setIsRealtime}
                        trackColor={{ false: '#27282F', true: '#22C55E' }}
                        thumbColor="#FFFFFF"
                    />
                </View>
                <Text style={styles.infoText}>
                    {isRealtime ? t('keyboard.realtime_desc') : t('keyboard.bulk_desc')}
                </Text>
            </View>

            {/* Metin Giriş Alanı */}
            <View style={styles.inputWrapper}>
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    multiline
                    placeholder={t('keyboard.placeholder')}
                    placeholderTextColor="#555966"
                    value={text}
                    onChangeText={handleTextChange}
                    onKeyPress={handleKeyPress}
                    autoFocus={true}
                />
            </View>

            {/* Alt Butonlar */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
            >
                <View style={styles.buttonRow}>
                    <TouchableOpacity 
                        style={styles.clearButton} 
                        onPress={clearInput}
                        activeOpacity={0.75}
                    >
                        <FontAwesome5 name="eraser" size={14} color="#9CA0AC" style={{ marginRight: 8 }} />
                        <Text style={styles.clearButtonText}>{t('keyboard.clear')}</Text>
                    </TouchableOpacity>
                    
                    {!isRealtime && (
                        <TouchableOpacity 
                            style={styles.sendButton} 
                            onPress={handleSendBulk}
                            activeOpacity={0.8}
                        >
                            <FontAwesome5 name="paper-plane" size={14} color="#080808" style={{ marginRight: 8 }} />
                            <Text style={styles.sendButtonText}>{t('keyboard.send')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
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
    modeCard: {
        marginHorizontal: 18,
        marginBottom: 14,
        backgroundColor: '#1E1F24',
        borderRadius: 18,
        padding: 16,
    },
    modeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    modeText: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14.5,
    },
    infoText: {
        color: '#717684',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 16,
    },
    inputWrapper: {
        flex: 1,
        marginHorizontal: 18,
        backgroundColor: '#1E1F24',
        borderRadius: 20,
        padding: 18,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlignVertical: 'top',
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: 18,
        paddingTop: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    clearButton: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        backgroundColor: '#1E1F24',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    sendButton: {
        flex: 2,
        height: 50,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#080808',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
});

export default KeyboardScreen;
