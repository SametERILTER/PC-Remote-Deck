import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

const HomeScreen = ({ navigation }) => {
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        });
        return unsubscribe;
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Sabit Başlık */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>PCKONTROL</Text>
                <TouchableOpacity onPress={() => navigation.navigate('QrScanner')}>
                    <FontAwesome5 name="qrcode" size={24} color="#00E5FF" />
                </TouchableOpacity>
            </View>

            {/* Kaydırılabilir İçerik */}
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Öne Çıkan: Deck Mode */}
                <TouchableOpacity
                    style={styles.largeButton}
                    onPress={() => navigation.navigate('Deck')}
                >
                    <View style={styles.largeButtonIconContainer}>
                        <FontAwesome5 name="th-large" size={32} color="#00E5FF" />
                    </View>
                    <View style={styles.largeButtonTextContainer}>
                        <Text style={styles.largeButtonTitle}>Deck Mode</Text>
                        <Text style={styles.largeButtonDesc}>PC'nizi özelleştirilebilir butonlarla yönetin</Text>
                    </View>
                    <FontAwesome5 name="th-large" size={80} color="#00E5FF" style={styles.bgIcon} />
                </TouchableOpacity>

                {/* Buton Grubu 1 */}
                <View style={[styles.buttonContainer, { marginTop: 20 }]}>
                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('SendCommand')}
                    >
                        <FontAwesome5 name="terminal" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Komut Gönder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('ScreenShot')}
                    >
                        <FontAwesome5 name="camera" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Ekran Görüntüsü</Text>
                    </TouchableOpacity>
                </View>

                {/* Buton Grubu 2 */}
                <View style={[styles.buttonContainer, { marginTop: 20 }]}>
                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('Keyboard')}
                    >
                        <FontAwesome5 name="keyboard" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Klavye</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('Mouse')}
                    >
                        <FontAwesome5 name="mouse-pointer" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Mouse</Text>
                    </TouchableOpacity>
                </View>

                {/* Buton Grubu 3 */}
                <View style={[styles.buttonContainer, { marginTop: 20 }]}>
                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('WindowManager')}
                    >
                        <FontAwesome5 name="window-restore" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Pencere Yönetimi</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('FileTransfer')}
                    >
                        <FontAwesome5 name="file-import" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Dosya Gönder</Text>
                    </TouchableOpacity>
                </View>

                {/* Buton Grubu 4 */}
                <View style={[styles.buttonContainer, { marginTop: 20 }]}>
                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('Modes')}
                    >
                        <FontAwesome5 name="magic" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Modlar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('Statistics')}
                    >
                        <FontAwesome5 name="chart-pie" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>İstatistikler</Text>
                    </TouchableOpacity>
                </View>

                {/* Buton Grubu 5 */}
                <View style={[styles.buttonContainer, { marginTop: 20 }]}>
                    <TouchableOpacity
                        style={styles.commandButton}
                        onPress={() => navigation.navigate('Volume')}
                    >
                        <FontAwesome5 name="volume-up" size={28} color="#00E5FF" />
                        <Text style={styles.deckButtonText}>Ses Yöneticisi</Text>
                    </TouchableOpacity>

                    {/* PC Kapama Butonu (Yeni) */}
                    <TouchableOpacity
                        style={[styles.commandButton, { backgroundColor: '#2a1a1a' }]}
                        onPress={() => {/* Buraya Shutdown komutu gelebilir */ }}
                    >
                        <FontAwesome5 name="power-off" size={28} color="#FF5252" />
                        <Text style={[styles.deckButtonText, { color: '#FF5252' }]}>PC Kapat</Text>
                    </TouchableOpacity>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#1E1E1E',
        backgroundColor: '#0e0e0e',
        zIndex: 10,
    },
    headerTitle: {
        color: '#E1E1E1',
        fontSize: 24,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 180, // Mobilde daha rahat kaydırma alanı
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    commandButton: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 110,
    },
    largeButton: {
        width: '100%',
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0,
        overflow: 'hidden',
    },
    bgIcon: {
        position: 'absolute',
        right: -15,
        bottom: -15,
        opacity: 0.08,
        transform: [{ rotate: '15deg' }],
    },
    largeButtonIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 229, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 18,
    },
    largeButtonTextContainer: {
        flex: 1,
    },
    largeButtonTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    largeButtonDesc: {
        color: '#888',
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_500Medium',
        marginTop: 4,
    },
    deckButtonText: {
        color: '#E1E1E1',
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        textAlign: 'center',
    }
});

export default HomeScreen;
