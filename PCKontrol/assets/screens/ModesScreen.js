import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const ModesScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [baseUrl, setBaseUrl] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = (await AsyncStorage.getItem('@pc_port')) || '9090';
            if (savedIP) {
                setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
            }
        } catch (e) {
            console.error('Settings load error');
        }
    };

    const activateMode = async (endpoint) => {
        if (!baseUrl) return;
        setLoading(true);
        try {
            await fetch(`${baseUrl}${endpoint}`);
        } catch (e) {
            console.log('Mode activation error');
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    };

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
                <Text style={styles.headerTitle}>{t('modes.title')}</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView 
                contentContainerStyle={[
                    styles.scrollContent, 
                    { paddingBottom: Math.max(insets.bottom, 16) + 30 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionTitle}>{t('modes.scenarios')}</Text>
                
                <TouchableOpacity 
                    style={styles.modeCard}
                    onPress={() => activateMode('/mode-study')}
                    disabled={loading}
                    activeOpacity={0.75}
                >
                    <View style={styles.iconContainer}>
                        <FontAwesome5 name="graduation-cap" size={18} color="#60A5FA" />
                    </View>
                    <View style={styles.modeInfo}>
                        <Text style={styles.modeName}>{t('modes.study_mode')}</Text>
                        <Text style={styles.modeDescription}>{t('modes.study_desc')}</Text>
                    </View>
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <View style={styles.playBtn}>
                            <FontAwesome5 name="play" size={12} color="#CBD5E1" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Gelecek Modlar */}
                <View style={[styles.modeCard, { opacity: 0.55 }]}>
                    <View style={styles.iconContainer}>
                        <FontAwesome5 name="robot" size={18} color="#9CA0AC" />
                    </View>
                    <View style={styles.modeInfo}>
                        <Text style={styles.modeName}>{t('modes.stark_mode')}</Text>
                        <Text style={styles.modeDescription}>{t('modes.stark_desc')}</Text>
                    </View>
                    <View style={styles.playBtn}>
                        <FontAwesome5 name="lock" size={12} color="#717684" />
                    </View>
                </View>
            </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    sectionTitle: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        textTransform: 'uppercase',
        marginBottom: 12,
        letterSpacing: 1.2,
        marginLeft: 2,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#27282F',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    modeInfo: {
        flex: 1,
    },
    modeName: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        marginBottom: 2,
    },
    modeDescription: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 12,
        lineHeight: 16,
    },
    playBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});

export default ModesScreen;
