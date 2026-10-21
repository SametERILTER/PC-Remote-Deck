import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const StatCard = ({ title, value, subtitle, icon, color, unit }) => {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#27282F' }]}>
                    <FontAwesome5 name={icon} size={15} color={color} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.statValue}>
                    {value} <Text style={styles.statUnit}>{unit}</Text>
                </Text>
                {subtitle ? <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
            </View>
        </View>
    );
};

const StatisticsScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState({ 
        cpu: '0', ram: '0', gpuTemp: '0', gpuUse: '0',
        cpuName: t('statistics.loading'), ramTot: '0', ramUse: '0', gpuName: t('statistics.loading')
    });
    const [baseUrl, setBaseUrl] = useState('');
    const [isListView, setIsListView] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState('cpu');
    const [chartWidth, setChartWidth] = useState(0);
    const insets = useSafeAreaInsets();
    const [history, setHistory] = useState({
        cpu: [0],
        ram: [0],
        gpuTemp: [0],
        gpuUse: [0]
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedIP = await AsyncStorage.getItem('@pc_ip_address');
                const savedPort = await AsyncStorage.getItem('@pc_port');
                
                if (savedIP && savedPort) {
                    setBaseUrl(`http://${savedIP.trim()}:${savedPort.trim()}`);
                } else if (savedIP) {
                    setBaseUrl(`http://${savedIP.trim()}`);
                }
            } catch (error) {
                console.log('Error loading settings:', error);
            }
        };
        loadSettings();

        const enableImmersive = async () => {
            try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            } catch (e) {}
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    await NavigationBar.setVisibilityAsync('hidden');
                } catch (e) {}
            }
        };
        enableImmersive();

        return () => {
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (e) {}
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    NavigationBar.setVisibilityAsync('visible');
                } catch (e) {}
            }
        };
    }, []);

    useEffect(() => {
        if (!baseUrl) return;

        let isMounted = true;
        const fetchStats = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            try {
                const response = await fetch(`${baseUrl}/stats`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok && isMounted) {
                    const data = await response.json();
                    setStats(data);
                    
                    setHistory(prev => {
                        const newHistory = { ...prev };
                        newHistory.cpu = [...prev.cpu.slice(-20), parseFloat(data.cpu) || 0];
                        newHistory.ram = [...prev.ram.slice(-20), parseFloat(data.ram) || 0];
                        newHistory.gpuTemp = [...prev.gpuTemp.slice(-20), parseFloat(data.gpuTemp) || 0];
                        newHistory.gpuUse = [...prev.gpuUse.slice(-20), parseFloat(data.gpuUse) || 0];
                        return newHistory;
                    });
                }
            } catch (error) {
                clearTimeout(timeoutId);
                // Host unreachable or timeout - fail silently without spamming console
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [baseUrl]);

    const renderListView = () => {
        const metrics = [
            { id: 'cpu', title: 'CPU', icon: 'microchip', color: '#60A5FA', current: stats.cpu, unit: '%' },
            { id: 'ram', title: 'RAM', icon: 'memory', color: '#A78BFA', current: stats.ram, unit: '%' },
            { id: 'gpuUse', title: t('statistics.gpu_usage'), icon: 'video', color: '#34D399', current: stats.gpuUse, unit: '%' },
            { id: 'gpuTemp', title: t('statistics.gpu_temp'), icon: 'thermometer-half', color: '#F87171', current: stats.gpuTemp, unit: '°C' },
        ];

        const selectedData = metrics.find(m => m.id === selectedMetric);
        const chartData = history[selectedMetric].length > 0 ? history[selectedMetric] : [0];

        return (
            <View style={[styles.listLayout, { 
                paddingLeft: Math.max(insets.left, 20), 
                paddingRight: Math.max(insets.right, 20),
                paddingBottom: Math.max(insets.bottom, 14),
            }]}>
                <ScrollView 
                    style={styles.listMenu}
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
                    showsVerticalScrollIndicator={false}
                >
                    {metrics.map(metric => (
                        <TouchableOpacity 
                            key={metric.id}
                            style={[
                                styles.menuItem,
                                selectedMetric === metric.id && styles.menuItemActive
                            ]}
                            onPress={() => setSelectedMetric(metric.id)}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name={metric.icon} size={20} color={selectedMetric === metric.id ? metric.color : '#717684'} />
                            <Text numberOfLines={1} style={[styles.menuItemTitle, selectedMetric === metric.id && { color: '#FFFFFF' }, { marginTop: 6, textAlign: 'center' }]}>
                                {metric.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.chartContainer} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 36)}>
                    <View style={styles.chartHeader}>
                        <View style={[styles.cardIconBox, { backgroundColor: '#27282F', marginRight: 10 }]}>
                            <FontAwesome5 name={selectedData.icon} size={15} color={selectedData.color} />
                        </View>
                        <Text style={styles.chartTitle}>{selectedData.title} {t('statistics.history')}</Text>
                        <Text style={styles.chartCurrentValue}>{selectedData.current}{selectedData.unit}</Text>
                    </View>
                    {chartWidth > 0 && (
                        <LineChart
                            data={{
                                labels: [],
                                datasets: [{ data: chartData }]
                            }}
                            width={chartWidth}
                            height={190}
                            yAxisSuffix={selectedData.unit}
                            withVerticalLabels={false}
                            chartConfig={{
                                backgroundColor: '#1E1F24',
                                backgroundGradientFrom: '#1E1F24',
                                backgroundGradientTo: '#1E1F24',
                                decimalPlaces: 0,
                                color: (opacity = 1) => selectedData.color,
                                labelColor: (opacity = 1) => `rgba(160, 165, 175, ${opacity})`,
                                propsForDots: {
                                    r: "3",
                                    strokeWidth: "1",
                                    stroke: selectedData.color
                                }
                            }}
                            bezier
                            style={{
                                marginVertical: 6,
                                borderRadius: 16
                            }}
                        />
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" hidden={true} />
            
            {/* Header */}
            <View style={[styles.header, { 
                paddingLeft: Math.max(insets.left, 20), 
                paddingRight: Math.max(insets.right, 20),
                paddingTop: Math.max(insets.top, 14),
            }]}>
                <TouchableOpacity 
                    style={styles.backButton}  
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="chevron-left" size={15} color="#E2E8F0" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('statistics.title')}</Text>
                
                <View style={{ flex: 1 }} />
                
                <TouchableOpacity 
                    style={styles.viewToggleBtn}
                    onPress={() => setIsListView(!isListView)}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name={isListView ? "th-large" : "chart-line"} size={16} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* İçerik Alanı */}
            {isListView ? renderListView() : (
                <ScrollView 
                    style={styles.listWrapper} 
                    contentContainerStyle={[styles.scrollContent, { 
                        paddingLeft: Math.max(insets.left, 20), 
                        paddingRight: Math.max(insets.right, 20),
                        paddingBottom: Math.max(insets.bottom, 16) + 10,
                    }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.gridContainer}>
                        <StatCard 
                            title="CPU" 
                            value={stats.cpu} 
                            unit="%"
                            subtitle={stats.cpuName}
                            icon="microchip" 
                            color="#60A5FA" 
                        />
                        <StatCard 
                            title="RAM" 
                            value={stats.ram} 
                            unit="%"
                            subtitle={`${stats.ramUse} GB / ${stats.ramTot} GB ${t('statistics.used')}`}
                            icon="memory" 
                            color="#A78BFA" 
                        />
                        <StatCard 
                            title="GPU" 
                            value={stats.gpuUse} 
                            unit="%"
                            subtitle={stats.gpuName}
                            icon="video" 
                            color="#34D399" 
                        />
                        <StatCard 
                            title={t('statistics.temp')} 
                            value={stats.gpuTemp} 
                            unit="°C"
                            subtitle={stats.gpuName !== "GPU" ? stats.gpuName + " " + t('statistics.temp_of') : "GPU " + t('statistics.temp_of')}
                            icon="thermometer-half" 
                            color="#F87171" 
                        />
                    </View>
                </ScrollView>
            )}
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
        paddingBottom: 12,
        backgroundColor: '#080808',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.3,
    },
    listWrapper: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 6,
        alignItems: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 14,
        width: '100%',
        maxWidth: 800,
    },
    card: {
        width: '47%',
        minWidth: 200,
        backgroundColor: '#1E1F24',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
        minHeight: 135,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    cardIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        color: '#717684',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    cardBody: {
        alignItems: 'flex-start',
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 30,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        letterSpacing: -0.5,
    },
    statUnit: {
        fontSize: 15,
        color: '#717684',
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    cardSubtitle: {
        color: '#9CA0AC',
        fontSize: 11.5,
        marginTop: 4,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 15,
    },
    viewToggleBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listLayout: {
        flex: 1,
        flexDirection: 'row',
        paddingTop: 6,
        gap: 14,
    },
    listMenu: {
        flex: 1,
    },
    menuItem: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1F24',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 14,
        marginBottom: 10,
    },
    menuItemActive: {
        backgroundColor: '#27282F',
    },
    menuItemTitle: {
        color: '#717684',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    chartContainer: {
        flex: 5,
        backgroundColor: '#1E1F24',
        borderRadius: 20,
        padding: 18,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    chartTitle: {
        color: '#717684',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        flex: 1,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    chartCurrentValue: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    }
});

export default StatisticsScreen;
