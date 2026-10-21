import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const SendCommandScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
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
            addToHistory(t('command.sys_error_ip'), 'error');
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
                addToHistory(`${t('command.sys')} ${result}`, 'success');
            } else {
                addToHistory(`${t('command.sys_error')} ${result}`, 'error');
            }
        } catch (error) {
            addToHistory(`${t('command.sys_conn_error')} ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const addToHistory = (text, type) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setHistory(prev => [...prev, { id: Date.now().toString(), text, type, time }]);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Üst Başlık */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 16 }]}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('command.title')}</Text>
                    <View style={styles.headerPlaceholder} />
                </View>

                {/* Terminal Alanı */}
                <View style={styles.terminalContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                        style={styles.terminalScroll}
                        contentContainerStyle={styles.terminalContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {history.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconBox}>
                                    <FontAwesome5 name="terminal" size={24} color="#717684" />
                                </View>
                                <Text style={styles.placeholderText}>{t('command.terminal_ready')}</Text>
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

                {/* Komut Giriş Alanı */}
                <View style={[styles.inputSection, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={command}
                            onChangeText={setCommand}
                            placeholder={t('command.placeholder')}
                            placeholderTextColor="#555966"
                            autoCapitalize="none"
                            autoCorrect={false}
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !command.trim() && styles.disabledButton]}
                            onPress={handleSend}
                            disabled={!command.trim() || loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#080808" />
                            ) : (
                                <FontAwesome5 
                                    name="paper-plane" 
                                    size={15} 
                                    color={command.trim() ? '#080808' : '#717684'} 
                                />
                            )}
                        </TouchableOpacity>
                    </View>
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
    headerPlaceholder: {
        width: 38,
    },
    terminalContainer: {
        flex: 1,
        marginHorizontal: 18,
        marginBottom: 14,
        backgroundColor: '#1E1F24',
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
    },
    terminalScroll: {
        flex: 1,
    },
    terminalContent: {
        paddingBottom: 16,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 70,
    },
    emptyIconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    placeholderText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        color: '#717684',
        fontSize: 13,
        textAlign: 'center',
    },
    historyItem: {
        flexDirection: 'row',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    timeText: {
        fontFamily: 'PlusJakartaSans_400Regular',
        color: '#555966',
        fontSize: 11,
    },
    historyText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        color: '#E2E8F0',
        flex: 1,
        lineHeight: 19,
    },
    commandText: {
        color: '#93C5FD',
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    successText: {
        color: '#22C55E',
    },
    errorText: {
        color: '#EF4444',
    },
    inputSection: {
        paddingHorizontal: 18,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        borderRadius: 16,
        paddingLeft: 16,
        paddingRight: 8,
        height: 56,
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#27282F',
    },
});

export default SendCommandScreen;
