import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KeyboardScreen = ({ navigation }) => {
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
            // Sadece yeni eklenen karakteri bul
            if (newText.length > lastSentText.current.length) {
                const addedChars = newText.substring(lastSentText.current.length);
                // Eğer eklenen şey newline ise enter gönder
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome5 name="chevron-left" size={20} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>KLAVYE</Text>
            </View>

            <View style={styles.modeContainer}>
                <View style={styles.modeRow}>
                    <Text style={styles.modeText}>Anlık Yazma Modu</Text>
                    <Switch
                        value={isRealtime}
                        onValueChange={setIsRealtime}
                        trackColor={{ false: '#333', true: '#00E5FF' }}
                    />
                </View>
                <Text style={styles.infoText}>
                    {isRealtime 
                        ? 'Siz telefonunuzda yazdıkça karakterler bilgisayarınıza iletilir.' 
                        : 'Metni yazın ve Gönder butonuna basın.'}
                </Text>
            </View>

            <View style={styles.inputWrapper}>
                <FontAwesome5 name="keyboard" size={120} color="#00E5FF" style={styles.cardBgIcon} />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    multiline
                    placeholder="Buraya yazın..."
                    placeholderTextColor="#444"
                    value={text}
                    onChangeText={handleTextChange}
                    onKeyPress={handleKeyPress}
                    autoFocus={true}
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.footer}
            >
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.clearButton} onPress={clearInput}>
                        <Text style={styles.clearButtonText}>Temizle</Text>
                    </TouchableOpacity>
                    
                    {!isRealtime && (
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendBulk}>
                            <FontAwesome5 name="paper-plane" size={16} color="#000" style={{marginRight: 8}} />
                            <Text style={styles.sendButtonText}>Gönder</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
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
    modeContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    modeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modeText: {
        color: '#E1E1E1',
        fontFamily: 'SpaceGrotesk_600SemiBold',
        fontSize: 16,
    },
    infoText: {
        color: '#666',
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_400Regular',
    },
    inputWrapper: {
        flex: 1,
        marginHorizontal: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 32,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        overflow: 'hidden',
    },
    cardBgIcon: {
        position: 'absolute',
        right: -30,
        bottom: -30,
        opacity: 0.04,
        transform: [{ rotate: '10deg' }],
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'SpaceGrotesk_400Regular',
        textAlignVertical: 'top',
    },
    footer: {
        padding: 20,
        paddingBottom: 65, // Butonları yukarı taşımak için alt boşluğu artırdık
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    clearButton: {
        flex: 1,
        height: 56,
        borderRadius: 20,
        backgroundColor: '#252525',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#666',
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    sendButton: {
        flex: 2,
        height: 56,
        borderRadius: 20,
        backgroundColor: '#00E5FF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#000',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 16,
    },
});

export default KeyboardScreen;
