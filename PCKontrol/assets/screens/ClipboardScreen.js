import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const ClipboardScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        const loadIp = async () => {
            const ip = await AsyncStorage.getItem('@pc_ip_address');
            const port = await AsyncStorage.getItem('@pc_port') || '9090';
            if (ip) {
                setBaseUrl(`http://${ip}:${port}`);
            }
        };
        loadIp();
    }, []);

    const sendToClipboard = async () => {
        if (!text.trim()) return;
        if (!baseUrl) {
            Alert.alert(t('deck.no_connection'), t('clipboard.no_conn_desc'));
            return;
        }

        try {
            const res = await fetch(`${baseUrl}/set-clipboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (res.ok) {
                Alert.alert(t('clipboard.success'), t('clipboard.copied'));
                setText('');
            } else {
                Alert.alert(t('deck.error'), t('clipboard.failed'));
            }
        } catch (error) {
            Alert.alert(t('deck.error'), t('clipboard.unreachable'));
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 16 }]}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('clipboard.title')}</Text>
                <View style={{ width: 38 }} />
            </View>

            <KeyboardAvoidingView 
                style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Text style={styles.descText}>
                    {t('clipboard.desc')}
                </Text>

                <TextInput
                    style={styles.textInput}
                    placeholder={t('clipboard.placeholder')}
                    placeholderTextColor="#555966"
                    multiline
                    value={text}
                    onChangeText={setText}
                    textAlignVertical="top"
                />

                <TouchableOpacity 
                    style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]} 
                    onPress={sendToClipboard}
                    disabled={!text.trim()}
                    activeOpacity={0.8}
                >
                    <FontAwesome5 name="paper-plane" size={15} color="#080808" style={{ marginRight: 10 }} />
                    <Text style={styles.sendBtnText}>{t('clipboard.send')}</Text>
                </TouchableOpacity>
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
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.3,
    },
    content: {
        flex: 1,
        paddingHorizontal: 18,
        paddingTop: 8,
    },
    descText: {
        color: '#717684',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginBottom: 16,
        lineHeight: 18,
    },
    textInput: {
        flex: 1,
        maxHeight: 240,
        backgroundColor: '#1E1F24',
        borderRadius: 18,
        color: '#FFFFFF',
        padding: 18,
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginBottom: 18,
        textAlignVertical: 'top',
        lineHeight: 22,
    },
    sendBtn: {
        backgroundColor: '#FFFFFF',
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnText: {
        color: '#080808',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});

export default ClipboardScreen;
