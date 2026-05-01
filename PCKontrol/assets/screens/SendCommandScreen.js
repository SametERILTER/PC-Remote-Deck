import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SendCommandScreen = ({ navigation }) => {
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState([]);
    const [baseUrl, setBaseUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef();

    useEffect(() => {
        loadSettings();
    }, []);

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

    const handleSend = async () => {
        if (!command.trim()) return;
        if (!baseUrl) {
            addToHistory('Sistem: Hata - IP adresi ayarlanmamış!', 'error');
            return;
        }

        const cmdToSend = command.trim();
        setCommand('');
        addToHistory(`> ${cmdToSend}`, 'command');
        setLoading(true);

        try {
            const encodedCmd = encodeURIComponent(cmdToSend);
            const response = await fetch(`${baseUrl}/run-command?cmd=${encodedCmd}`);
            const result = await response.text();

            if (response.ok) {
                addToHistory(`Sistem: ${result}`, 'success');
            } else {
                addToHistory(`Sistem: Hata - ${result}`, 'error');
            }
        } catch (error) {
            addToHistory(`Sistem: Bağlantı hatası - ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const addToHistory = (text, type) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setHistory(prev => [...prev, { id: Date.now().toString(), text, type, time }]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome5 name="chevron-left" size={20} color="#E1E1E1" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>KOMUT</Text>
                </View>

                <View style={styles.terminalContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
                        style={styles.terminalScroll}
                        contentContainerStyle={styles.terminalContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {history.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <FontAwesome5 name="terminal" size={40} color="#333" style={{ marginBottom: 20 }} />
                                <Text style={styles.placeholderText}>Terminal hazır. Komut gönderin...</Text>
                            </View>
                        ) : (
                            history.map((item) => (
                                <View key={item.id} style={styles.historyItem}>
                                    <Text style={styles.timeText}>[{item.time}] </Text>
                                    <Text style={[
                                        styles.historyText,
                                        item.type === 'error' && styles.errorText,
                                        item.type === 'success' && styles.successText,
                                        item.type === 'command' && styles.commandText,
                                    ]}>
                                        {item.text}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>

                <View style={styles.inputSection}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={command}
                            onChangeText={setCommand}
                            placeholder="Komutunuzu yazın..."
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !command.trim() && styles.disabledButton]}
                            onPress={handleSend}
                            disabled={!command.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                <FontAwesome5 name="paper-plane" size={18} color="#000" />
                            )}
                        </TouchableOpacity>
                    </View>
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
    terminalContainer: {
        flex: 1,
        marginHorizontal: 20,
        marginBottom: 15,
        backgroundColor: '#000',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    terminalScroll: {
        flex: 1,
    },
    terminalContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
        opacity: 0.5,
    },
    placeholderText: {
        fontFamily: 'SpaceGrotesk_400Regular',
        color: '#333',
        fontSize: 14,
        textAlign: 'center',
    },
    historyItem: {
        flexDirection: 'row',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    timeText: {
        fontFamily: 'SpaceGrotesk_400Regular',
        color: '#333',
        fontSize: 11,
    },
    historyText: {
        fontFamily: 'SpaceGrotesk_400Regular',
        fontSize: 14,
        color: '#E1E1E1',
        flex: 1,
        lineHeight: 20,
    },
    commandText: {
        color: '#00E5FF',
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    successText: {
        color: '#27AE60',
    },
    errorText: {
        color: '#E74C3C',
    },
    inputSection: {
        paddingHorizontal: 20,
        paddingBottom: 100, // Tab bar boşluğu
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        paddingLeft: 20,
        paddingRight: 10,
        height: 64,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#FFFFFF',
        fontFamily: 'SpaceGrotesk_500Medium',
        fontSize: 16,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#00E5FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#2A2A2A',
        opacity: 0.5,
    },
});

export default SendCommandScreen;
