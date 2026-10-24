import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ActivityIndicator,
    Alert,
    Image,
    Easing,
    ScrollView,
    Platform,
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_DECK_BUTTONS, DEFAULT_DECK_IDS, CHROME_DECK_IDS, SPOTIFY_DECK_IDS, ANTIGRAVITY_DECK_IDS, getDeckBtnTitle } from '../../constants';


const fetchWithTimeout = (url, ms = 4000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal })
        .finally(() => clearTimeout(timer));
};

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const GRID_COLS = 4;
const GRID_ROWS = 2;
const TOTAL_BUTTONS = GRID_COLS * GRID_ROWS; // 8

// ─── İkon Yardımcısı ──────────────────────────────────────────────────────────
const DeckIcon = ({ library, name, size, color }) => {
    if (library === 'MaterialCommunityIcons') {
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
    }
    return <FontAwesome5 name={name || 'circle'} size={size} color={color} />;
};

// ─── Kayan Yazı (Marquee) Bileşeni ─────────────────────────────────────────────
const MarqueeText = ({ text, style }) => {
    const [containerWidth, setContainerWidth] = useState(0);
    const [textWidth, setTextWidth] = useState(0);
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        translateX.stopAnimation();
        translateX.setValue(0);
        if (textWidth > containerWidth + 10 && containerWidth > 0) {
            const distance = textWidth - containerWidth + 20;

            const animate = () => {
                Animated.sequence([
                    Animated.delay(2000),
                    Animated.timing(translateX, {
                        toValue: -distance,
                        duration: (distance / 30) * 1000, // Saniyede 30px kayma
                        useNativeDriver: true,
                        easing: Easing.linear,
                    }),
                    Animated.delay(1500),
                    Animated.timing(translateX, {
                        toValue: 0,
                        duration: 600, // Hızlıca başa sar
                        useNativeDriver: true,
                    })
                ]).start(({ finished }) => {
                    if (finished) animate();
                });
            };
            animate();
        }
    }, [textWidth, containerWidth, text]);

    return (
        <View
            style={{ overflow: 'hidden', width: '100%', justifyContent: 'center' }}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={{ alignItems: 'center' }}
            >
                <Animated.Text
                    style={[style, { transform: [{ translateX }] }]}
                    onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
                    numberOfLines={1}
                >
                    {text}
                </Animated.Text>
            </ScrollView>
        </View>
    );
};

// ─── 3D Buton Taban Rengi Hesaplayıcı ─────────────────────────────────────────
const getDarkerColor = (color) => {
    if (!color || typeof color !== 'string') return '#101216';
    if (color.startsWith('#')) {
        let c = color.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length === 6) {
            const num = parseInt(c, 16);
            const r = Math.max(0, Math.floor(((num >> 16) & 255) * 0.44));
            const g = Math.max(0, Math.floor(((num >> 8) & 255) * 0.44));
            const b = Math.max(0, Math.floor((num & 255) * 0.44));
            return `rgb(${r}, ${g}, ${b})`;
        }
    } else if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
            const r = Math.max(0, Math.floor(parseInt(matches[0], 10) * 0.44));
            const g = Math.max(0, Math.floor(parseInt(matches[1], 10) * 0.44));
            const b = Math.max(0, Math.floor(parseInt(matches[2], 10) * 0.44));
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return '#101216';
};

// ─── Tek Deck Butonu (3D Mekanik Tuş) ──────────────────────────────────────────
const DeckButton = ({ item, onPress }) => {
    const { t } = useTranslation();
    const pressAnim = useRef(new Animated.Value(0)).current;

    const pressIn = () => {
        Animated.spring(pressAnim, {
            toValue: 1,
            speed: 60,
            bounciness: 0,
            useNativeDriver: true,
        }).start();
    };

    const pressOut = () => {
        Animated.spring(pressAnim, {
            toValue: 0,
            speed: 35,
            bounciness: 6,
            useNativeDriver: true,
        }).start();
    };

    // 3D basma: basınca buton yüzeyi 4.5px aşağı iner, alt taban gölgesi sıkışır
    const translateY = pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 4.5],
    });

    const scale = pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.985],
    });

    const baseColor = getDarkerColor(item.color);
    const title = getDeckBtnTitle(item, t);
    const hasTitle = Boolean(title && title.trim().length > 0);
    const isCover = item.imageUri && item.imageFit === 'cover';

    return (
        <TouchableOpacity
            onPressIn={pressIn}
            onPressOut={pressOut}
            onPress={() => onPress(item)}
            activeOpacity={1}
            style={styles.deckBtnWrapper}
        >
            {/* 3D Taban Derinliği (Tuşun kendi renginin gölgesi) */}
            <View style={[styles.deckBtnBase, { backgroundColor: baseColor }]}>
                {/* 3D Üst Tuş Yüzeyi */}
                <Animated.View style={[
                    styles.deckBtnFace,
                    {
                        backgroundColor: item.color,
                        transform: [{ translateY }, { scale }],
                    },
                ]}>
                    {item.imageUri ? (
                        isCover ? (
                            <>
                                <Image
                                    source={{ uri: item.imageUri }}
                                    style={styles.deckBtnImageCover}
                                    resizeMode="cover"
                                />
                                <View style={styles.deckBtnHighlight} pointerEvents="none" />
                                {hasTitle && (
                                    <View style={styles.deckBtnLabelCoverBadge}>
                                        <Text style={styles.deckBtnLabelCover} numberOfLines={1}>
                                            {title}
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <>
                                <View style={styles.deckBtnHighlight} pointerEvents="none" />
                                <Image
                                    source={{ uri: item.imageUri }}
                                    style={[
                                        styles.deckBtnImage,
                                        !hasTitle && styles.deckBtnImageNoTitle,
                                    ]}
                                    resizeMode="contain"
                                />
                                {hasTitle && (
                                    <Text style={styles.deckBtnLabel} numberOfLines={2}>
                                        {title}
                                    </Text>
                                )}
                            </>
                        )
                    ) : (
                        <>
                            <View style={styles.deckBtnHighlight} pointerEvents="none" />
                            <DeckIcon
                                library={item.library || 'FontAwesome5'}
                                name={item.icon}
                                size={23}
                                color="#FFFFFF"
                            />
                            {hasTitle && (
                                <Text style={styles.deckBtnLabel} numberOfLines={2}>
                                    {title}
                                </Text>
                            )}
                        </>
                    )}
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
};

// ─── Alt Hızlı Eylem Butonu (3D) ──────────────────────────────────────────────
const QuickButton = ({ icon, label, onPress, color = '#FFFFFF' }) => {
    const pressAnim = useRef(new Animated.Value(0)).current;

    const pressIn = () => {
        Animated.spring(pressAnim, { toValue: 1, speed: 60, bounciness: 0, useNativeDriver: true }).start();
    };
    const pressOut = () => {
        Animated.spring(pressAnim, { toValue: 0, speed: 35, bounciness: 6, useNativeDriver: true }).start();
    };

    const translateY = pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 2],
    });

    return (
        <TouchableOpacity
            onPressIn={pressIn}
            onPressOut={pressOut}
            onPress={onPress}
            activeOpacity={1}
            style={styles.quickBtnWrapper}
        >
            <Animated.View style={[styles.quickBtn, { transform: [{ translateY }] }]}>
                <FontAwesome5 name={icon} size={16} color={color} />
                <Text style={[styles.quickBtnLabel, { color }]}>{label}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
const DeckScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [baseButtons, setBaseButtons] = useState([]);
    const [row2Buttons, setRow2Buttons] = useState([]);
    const [gridCols, setGridCols] = useState(4);
    const [activeProfile, setActiveProfile] = useState('default');
    const [isYouTubeActive, setIsYouTubeActive] = useState(false);
    const [ytIsPlaying, setYtIsPlaying] = useState(true);
    const [baseUrl, setBaseUrl] = useState('');
    const [displayIp, setDisplayIp] = useState('---.---.---.---');
    const [isConnected, setIsConnected] = useState(false);
    const [cpu, setCpu] = useState('--');
    const [ram, setRam] = useState('--');
    const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

    const statsTimerRef = useRef(null);
    const pingTimerRef = useRef(null);
    const activeAppTimerRef = useRef(null);
    const allBtnsRef = useRef([]);
    const activeProfileRef = useRef('default');
    const isYouTubeActiveRef = useRef(false);
    const row2Opacity = useRef(new Animated.Value(1)).current;
    const ytAnim = useRef(new Animated.Value(0)).current;
    const [mediaTitle, setMediaTitle] = useState('');
    const mediaAnim = useRef(new Animated.Value(0)).current;
    const combinedAnim = useRef(new Animated.Value(0)).current;

    const [isMediaExpanded, setIsMediaExpanded] = useState(false);
    const expandAnim = useRef(new Animated.Value(0)).current;

    const [connModalVisible, setConnModalVisible] = useState(false);
    const connModalAnim = useRef(new Animated.Value(0)).current;

    const [winTabModalVisible, setWinTabModalVisible] = useState(false);
    const winTabModalAnim = useRef(new Animated.Value(0)).current;

    const openWinTabModal = () => {
        setWinTabModalVisible(true);
        Animated.spring(winTabModalAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
            tension: 50
        }).start();
    };

    const closeWinTabModal = () => {
        Animated.timing(winTabModalAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
        }).start(() => setWinTabModalVisible(false));
    };

    const openConnModal = () => {
        setConnModalVisible(true);
        Animated.spring(connModalAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
            tension: 50
        }).start();
    };

    const closeConnModal = () => {
        Animated.timing(connModalAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
        }).start(() => setConnModalVisible(false));
    };

    // Ekran boyutunu al (landscape'e geçince güncellenir)
    useEffect(() => {
        const update = () => {
            const { width, height } = Dimensions.get('window');
            setScreenSize({ width, height });
        };
        update();
        const sub = Dimensions.addEventListener('change', update);
        return () => sub?.remove();
    }, []);

    // Odak: landscape + tam ekran, verileri yükle, polling başlat
    useEffect(() => {
        const unsubFocus = navigation.addListener('focus', async () => {
            try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            } catch (e) {}
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    await NavigationBar.setVisibilityAsync('hidden');
                } catch (e) {}
            }
            loadData();
        });

        const unsubBlur = navigation.addListener('blur', async () => {
            clearInterval(statsTimerRef.current);
            clearInterval(pingTimerRef.current);
            clearInterval(activeAppTimerRef.current);
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    await NavigationBar.setVisibilityAsync('visible');
                } catch (e) {}
            }
        });

        return () => {
            unsubFocus();
            unsubBlur();
        };
    }, [navigation]);

    const loadData = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port');
            const savedActiveIds = await AsyncStorage.getItem('@active_deck_ids');
            const savedCustom = await AsyncStorage.getItem('@custom_buttons');
            const savedViewMode = await AsyncStorage.getItem('@deck_view_mode');

            const cols = savedViewMode === '12' ? 6 : 4;
            setGridCols(cols);
            const totalBtns = cols * 2;

            const ip = savedIP?.trim() || '';
            const port = savedPort?.trim() || '9090';
            const url = ip ? `http://${ip}:${port}` : '';

            setBaseUrl(url);
            setDisplayIp(ip || '---.---.---');

            const customBtns = savedCustom ? JSON.parse(savedCustom) : [];
            const allBtns = [...ALL_DECK_BUTTONS, ...customBtns];
            allBtnsRef.current = allBtns; // Animasyon geçişlerinde butonları bulmak için

            const activeIds = savedActiveIds ? JSON.parse(savedActiveIds) : DEFAULT_DECK_IDS;

            const ordered = activeIds
                .map(id => allBtns.find(b => b.id === id))
                .filter(Boolean)
                .slice(0, totalBtns);

            // Boş slotları doldur
            while (ordered.length < totalBtns) {
                ordered.push(null);
            }

            setBaseButtons(ordered);
            if (activeProfileRef.current === 'default') {
                setRow2Buttons(ordered.slice(cols, cols * 2));
            }

            if (url) {
                startPolling(url);
                fetchStats(url);
                checkConnection(url);
            }
        } catch (e) {
            console.error('DeckScreen loadData error:', e);
        }
    };

    const fetchStats = async (url) => {
        try {
            const res = await fetchWithTimeout(`${url}/stats`, 4000);
            if (res.ok) {
                const data = await res.json();
                setCpu(data.cpu ?? '--');
                setRam(data.ram ?? '--');
                if (data.media) {
                    setMediaTitle(data.media);
                }
                setIsConnected(true);
            } else {
                setIsConnected(false);
            }
        } catch {
            setIsConnected(false);
        }
    };

    const fetchActiveApp = async (url) => {
        try {
            const res = await fetchWithTimeout(`${url}/active-app`, 2000);
            if (res.ok) {
                const data = await res.json();
                // Profil ve YouTube kontrolü
                const app = (data.activeApp || '').toLowerCase();
                const title = (data.activeTitle || '').toLowerCase();

                let newProfile = 'default';
                const isBrowser = app.includes('chrome') || app.includes('msedge') || app.includes('brave') || app.includes('opera');

                if (isBrowser) newProfile = 'chrome';
                else if (app.includes('spotify')) newProfile = 'spotify';
                else if (app.includes('code') || app.includes('devenv') || app.includes('idea')) newProfile = 'code';

                if (newProfile !== activeProfileRef.current) {
                    activeProfileRef.current = newProfile;
                    setActiveProfile(newProfile);
                }

                const ytOpen = isBrowser && title.includes('youtube');
                if (ytOpen !== isYouTubeActiveRef.current) {
                    isYouTubeActiveRef.current = ytOpen;
                    setIsYouTubeActive(ytOpen);
                }
            }
        } catch { }
    };

    const checkConnection = async (url) => {
        try {
            const res = await fetchWithTimeout(`${url}/stats`, 3000);
            setIsConnected(res.ok);
        } catch {
            setIsConnected(false);
        }
    };

    const startPolling = (url) => {
        clearInterval(statsTimerRef.current);
        clearInterval(pingTimerRef.current);
        clearInterval(activeAppTimerRef.current);

        // İstatistikler (Ağır İşlem)
        statsTimerRef.current = setInterval(() => fetchStats(url), 4000);
        // Aktif Uygulama (Çok Hafif, Anlık)
        activeAppTimerRef.current = setInterval(() => fetchActiveApp(url), 800);
        // Bağlantıyı kontrol et
        pingTimerRef.current = setInterval(() => checkConnection(url), 10000);
    };

    const handleBack = async () => {
        clearInterval(statsTimerRef.current);
        clearInterval(pingTimerRef.current);
        clearInterval(activeAppTimerRef.current);
        if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
            try {
                await NavigationBar.setVisibilityAsync('visible');
            } catch (e) {}
        }
        try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch (e) {}
        navigation.goBack();
    };

    // Profil değiştiğinde row2Buttons'u animasyonla güncelle
    useEffect(() => {
        if (!baseButtons.length) return;

        let newRow2Ids = [];
        if (activeProfile === 'chrome') newRow2Ids = CHROME_DECK_IDS.slice(0, gridCols);
        else if (activeProfile === 'spotify') newRow2Ids = SPOTIFY_DECK_IDS.slice(0, gridCols);
        else if (activeProfile === 'code') newRow2Ids = ANTIGRAVITY_DECK_IDS.slice(0, gridCols);

        let newRow2 = [];
        if (activeProfile === 'default') {
            newRow2 = baseButtons.slice(gridCols, gridCols * 2);
        } else {
            newRow2 = newRow2Ids.map(id => allBtnsRef.current.find(b => b.id === id)).filter(Boolean);
            while (newRow2.length < gridCols) newRow2.push(null);
        }

        Animated.timing(row2Opacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setRow2Buttons(newRow2);
            Animated.timing(row2Opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    }, [activeProfile, baseButtons, gridCols]);

    // YouTube ve Media animasyonunu tetikle
    useEffect(() => {
        const showYouTube = isYouTubeActive && !mediaTitle;
        const showMedia = !!mediaTitle;

        Animated.spring(ytAnim, {
            toValue: showYouTube ? 1 : 0,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
        }).start();

        Animated.spring(mediaAnim, {
            toValue: showMedia ? 1 : 0,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
        }).start();

        Animated.spring(combinedAnim, {
            toValue: (showYouTube || showMedia) ? 1 : 0,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
        }).start();
    }, [isYouTubeActive, mediaTitle]);

    // Genişletilmiş medya oynatıcı animasyonu
    useEffect(() => {
        Animated.spring(expandAnim, {
            toValue: isMediaExpanded ? 1 : 0,
            useNativeDriver: true,
            speed: 14,
            bounciness: 4,
        }).start();
    }, [isMediaExpanded]);

    const handleLock = async () => {
        if (!baseUrl) return;
        try {
            await fetch(`${baseUrl}/lock-pc`);
        } catch (e) {
            Alert.alert(t('deck.error'), t('deck.lock_failed'));
        }
    };

    const handleButtonPress = useCallback(async (item) => {
        if (!item) return;
        if (!baseUrl) {
            Alert.alert(t('deck.no_connection'), t('deck.config_ip'));
            return;
        }

        if (item.endpoint === '/windows-tab') {
            openWinTabModal();
        }

        // Fire-and-forget: yanıt beklenmez, anında tepki verir
        let url = '';
        if (item.isCustom) {
            if (item.type === 'path') url = `${baseUrl}/open-path?path=${encodeURIComponent(item.action)}`;
            else if (item.type === 'command') url = `${baseUrl}/run-command?cmd=${encodeURIComponent(item.action)}`;
            else if (item.type === 'keys') url = `${baseUrl}/press-combo?keys=${encodeURIComponent(item.action)}`;
        } else {
            url = `${baseUrl}${item.endpoint}`;
        }
        fetchWithTimeout(url, 6000).catch(() => { });
    }, [baseUrl]);

    const gridScale = combinedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.80] // Grid daha fazla küçülür
    });

    const gridTranslateY = combinedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -25] // Grid slider'dan kaçmak için biraz yukarı çıkar
    });

    const ytSliderTranslateY = ytAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [150, 0] // 150px aşağıdan yukarı çıkar
    });

    const mediaSliderTranslateY = mediaAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [150, 0] // 150px aşağıdan yukarı çıkar
    });

    const expandOpacity = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    });

    const expandTranslateY = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0]
    });

    const miniPlayerOpacity = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0]
    });

    // Medya başlığını Şarkı ve Sanatçı olarak ayır
    let artistName = '';
    let songName = mediaTitle;
    if (mediaTitle && mediaTitle.includes(' - ')) {
        const parts = mediaTitle.split(' - ');
        artistName = parts[0];
        songName = parts.slice(1).join(' - ');
    }

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Status bar'ı gizle */}
            <StatusBar hidden />

            {/* ── Top Bar ───────────────────────────────────────────────── */}
            <View style={[
                styles.topBar,
                {
                    paddingLeft: Math.max(insets.left, 16),
                    paddingRight: Math.max(insets.right, 16),
                }
            ]}>

                {/* Sol: CPU & RAM */}
                <View style={styles.topBarLeft}>
                    <View style={styles.statChip}>
                        <FontAwesome5 name="microchip" size={10} color="#717684" style={styles.statIcon} />
                        <Text style={styles.statLabel}>CPU</Text>
                        <Text style={styles.statValue}>{cpu}%</Text>
                    </View>
                    <View style={[styles.statChip, { marginLeft: 8 }]}>
                        <FontAwesome5 name="memory" size={10} color="#717684" style={styles.statIcon} />
                        <Text style={styles.statLabel}>RAM</Text>
                        <Text style={styles.statValue}>{ram}%</Text>
                    </View>
                </View>

                {/* Orta: IP + Bağlantı */}
                <TouchableOpacity style={styles.topBarCenter} onPress={openConnModal} activeOpacity={0.7}>
                    <View style={[styles.connDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.ipText}>{displayIp}</Text>
                    <Text style={[styles.connText, { color: isConnected ? '#22C55E' : '#EF4444' }]}>
                        {isConnected ? t('home.status_connected') : t('home.status_disconnected')}
                    </Text>
                    <FontAwesome5 name="chevron-down" size={9} color="#717684" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                {/* Sağ: Kilit + Geri */}
                <View style={styles.topBarRight}>
                    <TouchableOpacity style={styles.lockBtn} onPress={handleLock} activeOpacity={0.7}>
                        <FontAwesome5 name="lock" size={12} color="#9CA0AC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
                        <FontAwesome5 name="times" size={12} color="#9CA0AC" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Dinamik Grid ──────────────────────────────────────────────── */}
            <Animated.View style={[
                styles.grid, 
                { 
                    paddingLeft: Math.max(insets.left, 26), 
                    paddingRight: Math.max(insets.right, 26),
                    transform: [{ scale: gridScale }, { translateY: gridTranslateY }] 
                }
            ]}>
                {/* 1. Satır (Sabit) */}
                <View style={styles.gridRow}>
                    {baseButtons.slice(0, gridCols).map((item, colIdx) => (
                        <View key={`slot-0-${colIdx}`} style={styles.deckBtnWrapper}>
                            {item ? (
                                <DeckButton item={item} onPress={handleButtonPress} />
                            ) : (
                                <View style={styles.emptySlot} />
                            )}
                        </View>
                    ))}
                </View>

                {/* 2. Satır (Profil ile Dinamik Değişen) */}
                <Animated.View style={[styles.gridRow, { opacity: row2Opacity }]}>
                    {row2Buttons.slice(0, gridCols).map((item, colIdx) => (
                        <View key={`slot-1-${colIdx}`} style={styles.deckBtnWrapper}>
                            {item ? (
                                <DeckButton item={item} onPress={handleButtonPress} />
                            ) : (
                                <View style={styles.emptySlot} />
                            )}
                        </View>
                    ))}
                </Animated.View>
            </Animated.View>

            {/* ── YouTube Slider (Overlay) ─────────────────────────────────── */}
            <Animated.View style={[styles.ytSlider, { transform: [{ translateY: ytSliderTranslateY }] }]}>
                <TouchableOpacity
                    style={styles.ytBtn}
                    onPress={() => handleButtonPress({ endpoint: '/prev', isCustom: false })}
                >
                    <FontAwesome5 name="step-backward" size={16} color="#E1E1E1" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.ytPlayBtn}
                    onPress={() => {
                        setYtIsPlaying(!ytIsPlaying);
                        handleButtonPress({ endpoint: '/play-pause', isCustom: false });
                    }}
                >
                    <FontAwesome5
                        name={ytIsPlaying ? "pause" : "play"}
                        size={20}
                        color="#fff"
                        style={ytIsPlaying ? {} : { marginLeft: 3 }}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.ytBtn}
                    onPress={() => handleButtonPress({ endpoint: '/next', isCustom: false })}
                >
                    <FontAwesome5 name="step-forward" size={16} color="#E1E1E1" />
                </TouchableOpacity>
            </Animated.View>

            {/* ── Mini Media Player Slider (Overlay) ────────────────────────────── */}
            <Animated.View style={[
                styles.mediaSlider,
                { transform: [{ translateY: mediaSliderTranslateY }], opacity: miniPlayerOpacity },
                isMediaExpanded && { pointerEvents: 'none' }
            ]}>
                <TouchableOpacity style={styles.mediaInfoTouch} onPress={() => setIsMediaExpanded(true)} activeOpacity={0.7}>
                    <FontAwesome5 name="music" size={12} color="#A78BFA" />
                    <View style={styles.mediaTextContainer}>
                        <MarqueeText
                            text={songName || t('deck.unknown_song')}
                            style={styles.mediaSongText}
                        />
                        {artistName ? (
                            <MarqueeText
                                text={artistName}
                                style={styles.mediaArtistText}
                            />
                        ) : null}
                    </View>
                </TouchableOpacity>
                <View style={styles.mediaControls}>
                    <TouchableOpacity
                        style={styles.mediaBtn}
                        onPress={() => handleButtonPress({ endpoint: '/prev', isCustom: false })}
                    >
                        <FontAwesome5 name="step-backward" size={12} color="#E1E1E1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.mediaPlayBtn}
                        onPress={() => {
                            setYtIsPlaying(!ytIsPlaying);
                            handleButtonPress({ endpoint: '/play-pause', isCustom: false });
                        }}
                    >
                        <FontAwesome5
                            name={ytIsPlaying ? "pause" : "play"}
                            size={14}
                            color="#fff"
                            style={ytIsPlaying ? {} : { marginLeft: 2 }}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.mediaBtn}
                        onPress={() => handleButtonPress({ endpoint: '/next', isCustom: false })}
                    >
                        <FontAwesome5 name="step-forward" size={12} color="#E1E1E1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.mediaExpandBtn}
                        onPress={() => setMediaTitle('')}
                    >
                        <FontAwesome5 name="times" size={14} color="#888" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* ── Expanded Media Player (Full Screen Overlay) ───────────────────────── */}
            <Animated.View style={[
                styles.expandedPlayer,
                { opacity: expandOpacity, transform: [{ translateY: expandTranslateY }] },
                !isMediaExpanded && { pointerEvents: 'none' }
            ]}>
                <TouchableOpacity style={styles.closeExpandedBtn} onPress={() => setIsMediaExpanded(false)}>
                    <FontAwesome5 name="chevron-down" size={24} color="#A78BFA" />
                </TouchableOpacity>

                <View style={styles.expandedContent}>
                    {/* Sol Taraf: Bilgiler */}
                    <View style={styles.expandedLeft}>
                        <FontAwesome5 name="music" size={48} color="#A78BFA" style={styles.expandedMusicIcon} />
                        <View style={{ width: '100%', marginBottom: 4 }}>
                            <MarqueeText text={songName || t('deck.unknown_song')} style={styles.expandedSongText} />
                        </View>
                        <View style={{ width: '100%' }}>
                            <MarqueeText text={artistName} style={styles.expandedArtistText} />
                        </View>
                    </View>

                    {/* Sağ Taraf: Kontroller ve Ses */}
                    <View style={styles.expandedRight}>
                        <View style={styles.expandedPlayback}>
                            <TouchableOpacity style={styles.expBtn} onPress={() => handleButtonPress({ endpoint: '/prev', isCustom: false })}>
                                <FontAwesome5 name="step-backward" size={24} color="#E1E1E1" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.expPlayBtn} onPress={() => { setYtIsPlaying(!ytIsPlaying); handleButtonPress({ endpoint: '/play-pause', isCustom: false }); }}>
                                <FontAwesome5 name={ytIsPlaying ? "pause" : "play"} size={28} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.expBtn} onPress={() => handleButtonPress({ endpoint: '/next', isCustom: false })}>
                                <FontAwesome5 name="step-forward" size={24} color="#E1E1E1" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.expandedVolume}>
                            <TouchableOpacity style={styles.volBtn} onPress={() => handleButtonPress({ endpoint: '/vol-down', isCustom: false })}>
                                <FontAwesome5 name="volume-down" size={20} color="#A78BFA" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.volBtn} onPress={() => handleButtonPress({ endpoint: '/mute', isCustom: false })}>
                                <FontAwesome5 name="volume-mute" size={20} color="#A78BFA" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.volBtn} onPress={() => handleButtonPress({ endpoint: '/vol-up', isCustom: false })}>
                                <FontAwesome5 name="volume-up" size={20} color="#A78BFA" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Animated.View>

            {/* ── Alt Hızlı Eylemler ─────────────────────────────────────── */}
            <View style={[
                styles.bottomBar,
                {
                    paddingLeft: Math.max(insets.left, 16),
                    paddingRight: Math.max(insets.right, 16),
                }
            ]}>
                <QuickButton
                    icon="keyboard"
                    label={t('features.keyboard')}
                    color="#60A5FA"
                    onPress={() => {
                        handleBack().then(() => navigation.navigate('Keyboard'));
                    }}
                />
                <QuickButton
                    icon="mouse-pointer"
                    label={t('features.mouse')}
                    color="#A78BFA"
                    onPress={() => {
                        handleBack().then(() => navigation.navigate('Mouse'));
                    }}
                />
                <QuickButton
                    icon="terminal"
                    label={t('features.sendCommand')}
                    color="#34D399"
                    onPress={() => {
                        handleBack().then(() => navigation.navigate('SendCommand'));
                    }}
                />
                <QuickButton
                    icon="camera"
                    label={t('features.screenShot')}
                    color="#F59E0B"
                    onPress={() => {
                        handleBack().then(() => navigation.navigate('ScreenShot'));
                    }}
                />
            </View>

            {/* Bağlantı Bilgisi Modalı */}
            {connModalVisible && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeConnModal}>
                        <Animated.View style={[styles.modalBackdropBg, { opacity: connModalAnim }]} />
                    </TouchableOpacity>
                    <View style={styles.connModalContainer} pointerEvents="box-none">
                        <Animated.View
                            style={[
                                styles.connModalInner,
                                {
                                    opacity: connModalAnim,
                                    transform: [
                                        { scale: connModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                                        { translateY: connModalAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                                    ]
                                }
                            ]}
                        >
                            <View style={styles.connModalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <FontAwesome5 name="network-wired" size={18} color="#00E5FF" style={{ marginRight: 10 }} />
                                    <Text style={styles.connModalTitle}>{t('deck.conn_info')}</Text>
                                </View>
                                <TouchableOpacity onPress={closeConnModal} style={{ padding: 4 }}>
                                    <FontAwesome5 name="times" size={16} color="#888" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.connModalBody}>
                                <View style={styles.connModalRow}>
                                    <Text style={styles.connModalLabel}>{t('home.ip_address')}</Text>
                                    <Text style={styles.connModalValue}>{displayIp}</Text>
                                </View>
                                <View style={styles.connModalRow}>
                                    <Text style={styles.connModalLabel}>{t('home.port')}</Text>
                                    <Text style={styles.connModalValue}>9090</Text>
                                </View>
                                <View style={styles.connModalRow}>
                                    <Text style={styles.connModalLabel}>{t('home.status')}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.connDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444', marginRight: 6 }]} />
                                        <Text style={[styles.connModalValue, { color: isConnected ? '#22C55E' : '#EF4444' }]}>
                                            {isConnected ? t('home.status_connected') : t('home.status_disconnected')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </View>
                </View>
            )}

            {/* Windows Tab Modalı */}
            {winTabModalVisible && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeWinTabModal}>
                        <Animated.View style={[styles.modalBackdropBg, { opacity: winTabModalAnim }]} />
                    </TouchableOpacity>
                    <View style={styles.connModalContainer} pointerEvents="box-none">
                        <Animated.View
                            style={[
                                styles.connModalInner,
                                {
                                    opacity: winTabModalAnim,
                                    transform: [
                                        { scale: winTabModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                                        { translateY: winTabModalAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                                    ]
                                }
                            ]}
                        >
                            <View style={styles.connModalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <FontAwesome5 name="th-large" size={18} color="#9B59B6" style={{ marginRight: 10 }} />
                                    <Text style={styles.connModalTitle}>{t('deck.windows')}</Text>
                                </View>
                                <TouchableOpacity onPress={closeWinTabModal} style={{ padding: 4 }}>
                                    <FontAwesome5 name="times" size={16} color="#888" />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.connModalBody, { alignItems: 'center', padding: 30 }]}>
                                {/* Yukarı */}
                                <TouchableOpacity
                                    style={styles.dirBtn}
                                    onPress={() => fetchWithTimeout(`${baseUrl}/send-key?vk=38`, 2000).catch(() => { })}
                                >
                                    <FontAwesome5 name="chevron-up" size={24} color="#FFF" />
                                </TouchableOpacity>

                                <View style={{ flexDirection: 'row', gap: 40, marginVertical: 20 }}>
                                    {/* Sol */}
                                    <TouchableOpacity
                                        style={styles.dirBtn}
                                        onPress={() => fetchWithTimeout(`${baseUrl}/send-key?vk=37`, 2000).catch(() => { })}
                                    >
                                        <FontAwesome5 name="chevron-left" size={24} color="#FFF" />
                                    </TouchableOpacity>

                                    {/* Enter/Seç */}
                                    <TouchableOpacity
                                        style={[styles.dirBtn, { backgroundColor: '#9B59B6', borderColor: '#9B59B6' }]}
                                        onPress={() => {
                                            fetchWithTimeout(`${baseUrl}/send-key?vk=13`, 2000).catch(() => { });
                                            closeWinTabModal();
                                        }}
                                    >
                                        <FontAwesome5 name="check" size={20} color="#FFF" />
                                    </TouchableOpacity>

                                    {/* Sağ */}
                                    <TouchableOpacity
                                        style={styles.dirBtn}
                                        onPress={() => fetchWithTimeout(`${baseUrl}/send-key?vk=39`, 2000).catch(() => { })}
                                    >
                                        <FontAwesome5 name="chevron-right" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>

                                {/* Aşağı */}
                                <TouchableOpacity
                                    style={styles.dirBtn}
                                    onPress={() => fetchWithTimeout(`${baseUrl}/send-key?vk=40`, 2000).catch(() => { })}
                                >
                                    <FontAwesome5 name="chevron-down" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── Stiller ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080808',
    },

    // ── Top Bar ───────────────────────────────────────────────────────────────
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
        paddingHorizontal: 12,
        backgroundColor: '#080808',
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statIcon: {
        marginRight: 4,
    },
    statLabel: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 9.5,
        marginRight: 4,
        letterSpacing: 0.5,
    },
    statValue: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        minWidth: 24,
    },
    topBarCenter: {
        flex: 1.4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 6,
    },
    connDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    ipText: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
    },
    connText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10.5,
    },
    topBarRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    lockBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#1E1F24',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── 3D Grid & Deck Buttons ────────────────────────────────────────────────
    grid: {
        flex: 1,
        flexDirection: 'column',
        paddingVertical: 10,
        gap: 10,
    },
    gridRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 10,
    },
    deckBtnWrapper: {
        flex: 1,
    },
    // 3D Taban Derinliği (Tuşun arkasında kalan koyu mekanik taban)
    deckBtnBase: {
        flex: 1,
        borderRadius: 20,
        paddingBottom: 5, // 5px 3D yükseklik payı
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 6,
    },
    // 3D Tuş Yüzeyi (Basınca aşağı inen hareketli ön yüz)
    deckBtnFace: {
        flex: 1,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingHorizontal: 6,
        paddingVertical: 6,
    },
    deckBtnHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '42%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        zIndex: 2,
    },
    deckBtnImage: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginBottom: 3,
    },
    deckBtnImageNoTitle: {
        width: 74,
        height: 74,
        borderRadius: 16,
        marginBottom: 0,
    },
    deckBtnImageCover: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    deckBtnLabelCoverBadge: {
        position: 'absolute',
        bottom: 5,
        left: 6,
        right: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        alignItems: 'center',
        zIndex: 3,
    },
    deckBtnLabelCover: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
        textAlign: 'center',
    },
    deckBtnLabel: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 4,
        paddingHorizontal: 4,
        lineHeight: 14,
        letterSpacing: -0.2,
    },
    emptySlot: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#141519',
    },

    // ── YouTube Slider ───────────────────────────────────────────────────────
    ytSlider: {
        position: 'absolute',
        bottom: 66,
        alignSelf: 'center',
        width: 200,
        height: 52,
        backgroundColor: '#1E1F24',
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
    },
    ytBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ytPlayBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Media Player Slider ─────────────────────────────────────────────────
    mediaSlider: {
        position: 'absolute',
        bottom: 66,
        alignSelf: 'center',
        width: 360,
        height: 50,
        backgroundColor: '#1E1F24',
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 16,
        paddingRight: 8,
        zIndex: 10,
    },
    mediaInfoTouch: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    mediaTextContainer: {
        marginLeft: 10,
        flexShrink: 1,
        justifyContent: 'center',
    },
    mediaSongText: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        lineHeight: 15,
    },
    mediaArtistText: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 9.5,
        lineHeight: 13,
    },
    mediaControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    mediaBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaPlayBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaExpandBtn: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 2,
    },

    // ── Expanded Media Player ───────────────────────────────────────────────
    expandedPlayer: {
        position: 'absolute',
        top: 38,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#080808',
        zIndex: 20,
    },
    closeExpandedBtn: {
        position: 'absolute',
        top: 15,
        right: 25,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 21,
    },
    expandedContent: {
        flex: 1,
        flexDirection: 'row',
        padding: 40,
        alignItems: 'center',
    },
    expandedLeft: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 20,
    },
    expandedMusicIcon: {
        marginBottom: 16,
        opacity: 0.8,
    },
    expandedSongText: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 26,
        lineHeight: 32,
        paddingRight: 20,
    },
    expandedArtistText: {
        color: '#9CA0AC',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        paddingRight: 20,
    },
    expandedRight: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: '#1E1F24',
        paddingLeft: 20,
    },
    expandedPlayback: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
        marginBottom: 40,
    },
    expBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    expPlayBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandedVolume: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        backgroundColor: '#1E1F24',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
    },
    volBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Bottom Bar ────────────────────────────────────────────────────────────
    bottomBar: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingHorizontal: 10,
        backgroundColor: '#080808',
    },
    quickBtnWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    quickBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        width: '100%',
    },
    quickBtnLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 10.5,
        marginTop: 3,
        textAlign: 'center',
    },

    // ── Bağlantı Modalı ───────────────────────────────────────────────────────
    modalBackdropBg: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    connModalContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    connModalInner: {
        width: 320,
        backgroundColor: '#1E1F24',
        borderRadius: 22,
        overflow: 'hidden',
    },
    connModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        backgroundColor: '#27282F',
    },
    connModalTitle: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    connModalBody: {
        padding: 20,
    },
    connModalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    connModalLabel: {
        color: '#717684',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13.5,
    },
    connModalValue: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13.5,
    },
    dirBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default DeckScreen;
