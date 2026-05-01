import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ModesScreen = ({ navigation }) => {
    const [baseUrl, setBaseUrl] = useState('');
    const [loading, setLoading] = useState(false);

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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome5 name="chevron-left" size={20} color="#E1E1E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MODLAR</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Senaryolar</Text>
                
                <TouchableOpacity 
                    style={styles.modeCard}
                    onPress={() => activateMode('/mode-study')}
                    disabled={loading}
                >
                    <FontAwesome5 name="graduation-cap" size={120} color="#4285F4" style={styles.cardBgIcon} />
                    <View style={[styles.iconContainer, { backgroundColor: '#4285F4' }]}>
                        <FontAwesome5 name="graduation-cap" size={24} color="#FFF" />
                    </View>
                    <View style={styles.modeInfo}>
                        <Text style={styles.modeName}>Ders Modu</Text>
                        <Text style={styles.modeDescription}>Google Classroom ve Gemini'yi Chrome'da açar.</Text>
                    </View>
                    {loading ? (
                        <ActivityIndicator color="#4285F4" />
                    ) : (
                        <FontAwesome5 name="play" size={16} color="#444" />
                    )}
                </TouchableOpacity>

                {/* Placeholder for future modes */}
                <View style={[styles.modeCard, { opacity: 0.5 }]}>
                    <FontAwesome5 name="robot" size={120} color="#E74C3C" style={styles.cardBgIcon} />
                    <View style={[styles.iconContainer, { backgroundColor: '#E74C3C' }]}>
                        <FontAwesome5 name="robot" size={24} color="#FFF" />
                    </View>
                    <View style={styles.modeInfo}>
                        <Text style={styles.modeName}>Stark Modu</Text>
                        <Text style={styles.modeDescription}>Yakında eklenecek...</Text>
                    </View>
                    <FontAwesome5 name="lock" size={16} color="#444" />
                </View>

            </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    sectionTitle: {
        color: '#444',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 13,
        textTransform: 'uppercase',
        marginBottom: 16,
        letterSpacing: 1.5,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 32,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
        overflow: 'hidden',
    },
    cardBgIcon: {
        position: 'absolute',
        right: -30,
        bottom: -30,
        opacity: 0.04,
        transform: [{ rotate: '15deg' }],
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modeInfo: {
        flex: 1,
    },
    modeName: {
        color: '#FFFFFF',
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    modeDescription: {
        color: '#666',
        fontFamily: 'SpaceGrotesk_400Regular',
        fontSize: 12,
    },
});

export default ModesScreen;
