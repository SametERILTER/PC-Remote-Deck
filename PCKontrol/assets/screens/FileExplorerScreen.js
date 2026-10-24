import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const FileExplorerScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [baseUrl, setBaseUrl] = useState('');
    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = (await AsyncStorage.getItem('@pc_port')) || '9090';
            if (savedIP) {
                const url = `http://${savedIP.trim()}:${savedPort.trim()}`;
                setBaseUrl(url);
                fetchDrives(url);
            } else {
                Alert.alert(t('files.conn_err'), t('files.conn_err_desc'));
            }
        } catch (e) {
            console.error('Settings load error', e);
        }
    };

    const fetchDrives = async (url) => {
        setLoading(true);
        try {
            const res = await fetch(`${url}/drives`);
            if (res.ok) {
                const data = await res.json();
                const mappedDrives = data.map(d => ({
                    name: d,
                    isDir: true,
                    isDrive: true,
                    size: 0,
                    modTime: ''
                }));
                setItems(mappedDrives);
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('deck.error'), t('files.read_drives_err'));
        } finally {
            setLoading(false);
        }
    };

    const fetchDir = async (path, url = baseUrl) => {
        if (!path) {
            fetchDrives(url);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${url}/list-dir?path=${encodeURIComponent(path)}`);
            if (res.ok) {
                const data = await res.json();
                const sortedData = (data || []).sort((a, b) => {
                    if (a.isDir && !b.isDir) return -1;
                    if (!a.isDir && b.isDir) return 1;
                    return a.name.localeCompare(b.name);
                });
                setItems(sortedData);
                setCurrentPath(path);
            } else {
                throw new Error('Okuma hatası');
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('deck.error'), t('files.read_folder_err'));
        } finally {
            setLoading(false);
        }
    };

    const handleItemPress = (item) => {
        if (item.isDir || item.isDrive) {
            let newPath = '';
            if (item.isDrive) {
                newPath = item.name;
            } else {
                newPath = currentPath.endsWith('\\') 
                    ? currentPath + item.name 
                    : currentPath + '\\' + item.name;
            }
            fetchDir(newPath);
        } else {
            const fullPath = currentPath.endsWith('\\') 
                ? currentPath + item.name 
                : currentPath + '\\' + item.name;
            openFile(fullPath);
        }
    };

    const openFile = async (path) => {
        try {
            const res = await fetch(`${baseUrl}/open-path?path=${encodeURIComponent(path)}`);
            if (!res.ok) throw new Error('Açılamadı');
        } catch (e) {
            Alert.alert(t('deck.error'), t('files.open_file_err'));
        }
    };

    const goUp = () => {
        if (!currentPath) return;
        if (currentPath.length <= 3 && currentPath.endsWith(':\\')) {
            setCurrentPath('');
            fetchDrives(baseUrl);
            return;
        }

        let parts = currentPath.split('\\');
        parts.pop();
        let newPath = parts.join('\\');
        if (newPath.length === 2 && newPath[1] === ':') {
            newPath += '\\';
        }
        
        if (!newPath) {
            setCurrentPath('');
            fetchDrives(baseUrl);
        } else {
            fetchDir(newPath);
        }
    };

    const deleteItem = (item) => {
        const fullPath = item.isDrive 
            ? item.name 
            : currentPath.endsWith('\\') 
                ? currentPath + item.name 
                : currentPath + '\\' + item.name;

        Alert.alert(
            t('files.warning'),
            t('files.delete_confirm', {
                name: item.name,
                type: item.isDir ? t('files.folder_acc') : t('files.file_acc')
            }),
            [
                { text: t('files.cancel'), style: 'cancel' },
                {
                    text: t('files.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await fetch(`${baseUrl}/delete-file?path=${encodeURIComponent(fullPath)}`);
                            if (res.ok) {
                                fetchDir(currentPath);
                            } else {
                                throw new Error('Silinemedi');
                            }
                        } catch (error) {
                            Alert.alert(t('deck.error'), t('files.delete_err'));
                        }
                    }
                }
            ]
        );
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const renderItem = ({ item }) => {
        let iconName = 'file';
        let iconColor = '#717684';

        if (item.isDrive) {
            iconName = 'hdd';
            iconColor = '#60A5FA';
        } else if (item.isDir) {
            iconName = 'folder';
            iconColor = '#F59E0B';
        } else {
            const ext = item.name.split('.').pop().toLowerCase();
            if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) { iconName = 'file-image'; iconColor = '#EC4899'; }
            else if (['mp4', 'avi', 'mkv'].includes(ext)) { iconName = 'file-video'; iconColor = '#8B5CF6'; }
            else if (['mp3', 'wav'].includes(ext)) { iconName = 'file-audio'; iconColor = '#3B82F6'; }
            else if (['pdf'].includes(ext)) { iconName = 'file-pdf'; iconColor = '#EF4444'; }
            else if (['txt', 'md', 'doc', 'docx'].includes(ext)) { iconName = 'file-alt'; iconColor = '#06B6D4'; }
            else if (['zip', 'rar', '7z'].includes(ext)) { iconName = 'file-archive'; iconColor = '#F97316'; }
            else if (['exe', 'msi'].includes(ext)) { iconName = 'cog'; iconColor = '#9CA0AC'; }
        }

        return (
            <TouchableOpacity 
                style={styles.itemContainer} 
                onPress={() => handleItemPress(item)}
                onLongPress={() => !item.isDrive && deleteItem(item)}
                activeOpacity={0.7}
            >
                <View style={styles.itemIconBox}>
                    <FontAwesome5 name={iconName} size={18} color={iconColor} solid={item.isDir || item.isDrive} />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {!item.isDrive && (
                        <Text style={styles.itemMeta}>
                            {item.isDir ? t('files.folder') : formatBytes(item.size)} {item.modTime && ` • ${new Date(item.modTime).toLocaleDateString()}`}
                        </Text>
                    )}
                </View>
                {!item.isDrive && (
                    <TouchableOpacity 
                        style={styles.deleteBtn} 
                        onPress={() => deleteItem(item)}
                        activeOpacity={0.7}
                    >
                        <FontAwesome5 name="trash-alt" size={13} color="#717684" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
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
                    <Text style={styles.headerTitle}>{t('files.title')}</Text>
                </View>
                <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: baseUrl ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.statusText}>{baseUrl ? (t('home.status_connected') || 'Bağlı') : (t('home.status_disconnected') || 'Bağlantı Yok')}</Text>
                </View>
            </View>

            {/* Dizin Yolu */}
            <View style={styles.pathContainer}>
                {currentPath !== '' && (
                    <TouchableOpacity style={styles.upBtn} onPress={goUp} activeOpacity={0.7}>
                        <FontAwesome5 name="level-up-alt" size={14} color="#E2E8F0" />
                    </TouchableOpacity>
                )}
                <View style={styles.pathTextContainer}>
                    <Text style={styles.pathText} numberOfLines={1}>
                        {currentPath || t('files.drives')}
                    </Text>
                </View>
            </View>

            {/* Dosya / Klasör Listesi */}
            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item, index) => item.name + index}
                        renderItem={renderItem}
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingBottom: Math.max(insets.bottom, 16) + 30 }
                        ]}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<Text style={styles.emptyText}>{t('files.empty_or_no_access')}</Text>}
                    />
                )}
            </View>
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
    pathContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 18,
        borderRadius: 14,
        marginBottom: 12,
    },
    upBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    pathTextContainer: {
        flex: 1,
    },
    pathText: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
    },
    content: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 18,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        padding: 14,
        borderRadius: 16,
        marginBottom: 8,
    },
    itemIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 3,
    },
    itemMeta: {
        color: '#717684',
        fontSize: 11.5,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    deleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    emptyText: {
        color: '#717684',
        textAlign: 'center',
        marginTop: 50,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    }
});

export default FileExplorerScreen;
