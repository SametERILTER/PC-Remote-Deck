import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, Keyboard, ScrollView, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ALL_DECK_BUTTONS, DEFAULT_DECK_IDS } from '../../constants';

const PRESET_KEYS = [
    { label: 'CTRL', value: '^' },
    { label: 'ALT', value: '%' },
    { label: 'SHIFT', value: '+' },
    { label: 'ENTER', value: '{ENTER}' },
    { label: 'TAB', value: '{TAB}' },
    { label: 'ESC', value: '{ESC}' },
    { label: 'DEL', value: '{DEL}' },
    { label: 'F4', value: '{F4}' },
    { label: 'F5', value: '{F5}' },
    { label: 'SPACE', value: ' ' },
];

const PRESET_COMMANDS = [
    { label: 'PC Kapat', value: 'shutdown /s /t 0' },
    { label: 'Yeniden Başlat', value: 'shutdown /r /t 0' },
    { label: 'Çöpü Boşalt', value: 'powershell -Command "Clear-RecycleBin -Force"' },
    { label: 'Görev Yön.', value: 'taskmgr' },
    { label: 'Hesap Mak.', value: 'calc' },
    { label: 'Not Defteri', value: 'notepad' },
    { label: 'Ekranı Kapat', value: 'powershell (Add-Type -MemberDefinition "[DllImport(\\"user32.dll\\")] public static extern int SendMessage(int hWnd, uint Msg, int wParam, int lParam);" -Name "W" -PassThru)::SendMessage(0xffff, 0x0112, 0xf170, 2)' },
];

const SettingsScreen = () => {
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('5000');
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [activeItemIds, setActiveItemIds] = useState([]);
    const [viewMode, setViewMode] = useState('10');
    const [customButtons, setCustomButtons] = useState([]);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

    // Yeni Buton State'leri
    const [newBtnTitle, setNewBtnTitle] = useState('');
    const [newBtnIcon, setNewBtnIcon] = useState('rocket');
    const [newBtnColor, setNewBtnColor] = useState('#3498DB');
    const [newBtnType, setNewBtnType] = useState('path'); // path, command, keys
    const [newBtnAction, setNewBtnAction] = useState('');
    const [newBtnImage, setNewBtnImage] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedIP = await AsyncStorage.getItem('@pc_ip_address');
            const savedPort = await AsyncStorage.getItem('@pc_port');
            const savedActiveIds = await AsyncStorage.getItem('@active_deck_ids');
            const savedViewMode = await AsyncStorage.getItem('@deck_view_mode');
            const savedCustomButtons = await AsyncStorage.getItem('@custom_buttons');

            if (savedCustomButtons !== null) {
                setCustomButtons(JSON.parse(savedCustomButtons));
            }

            if (savedIP !== null) setIpAddress(savedIP);
            if (savedPort !== null) setPort(savedPort);
            if (savedViewMode !== null) setViewMode(savedViewMode);

            if (savedActiveIds !== null) {
                setActiveItemIds(JSON.parse(savedActiveIds));
            } else {
                setActiveItemIds(DEFAULT_DECK_IDS);
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const handleViewModeToggle = async (mode) => {
        setViewMode(mode);
        try {
            await AsyncStorage.setItem('@deck_view_mode', mode);
        } catch (e) { }
    }

    const saveSettings = async () => {
        try {
            if (!ipAddress.trim()) {
                Alert.alert('Hata', 'Lütfen geçerli bir IP adresi giriniz.');
                return;
            }
            if (!port.trim()) {
                Alert.alert('Hata', 'Lütfen geçerli bir Port giriniz.');
                return;
            }
            await AsyncStorage.setItem('@pc_ip_address', ipAddress.trim());
            await AsyncStorage.setItem('@pc_port', port.trim());
            Keyboard.dismiss();
            Alert.alert('Başarılı', 'Bağlantı ayarları kaydedildi.');
        } catch (e) {
            Alert.alert('Hata', 'Kaydedilirken bir sorun oluştu.');
        }
    };

    const saveActiveIds = async (newIds) => {
        try {
            await AsyncStorage.setItem('@active_deck_ids', JSON.stringify(newIds));
            setActiveItemIds(newIds);
        } catch (e) {
            console.error('Failed to save active ids', e);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setNewBtnImage(result.assets[0].uri);
        }
    };

    const addPresetToAction = (value) => {
        if (newBtnType === 'keys') {
            setNewBtnAction(prev => prev + value);
        } else if (newBtnType === 'command') {
            setNewBtnAction(value);
        }
    };

    const addCustomButton = async () => {
        if (!newBtnTitle || !newBtnAction) {
            Alert.alert('Hata', 'Lütfen isim ve eylem alanlarını doldurun.');
            return;
        }

        const newBtn = {
            id: `custom_${Date.now()}`,
            title: newBtnTitle,
            icon: newBtnIcon,
            imageUri: newBtnImage,
            color: newBtnColor,
            type: newBtnType,
            action: newBtnAction,
            isCustom: true,
            library: 'FontAwesome5'
        };

        const updatedCustoms = [...customButtons, newBtn];
        setCustomButtons(updatedCustoms);
        await AsyncStorage.setItem('@custom_buttons', JSON.stringify(updatedCustoms));

        // Otomatik olarak aktif listeye ekle
        const updatedActiveIds = [...activeItemIds, newBtn.id];
        saveActiveIds(updatedActiveIds);

        // Formu sıfırla
        setNewBtnTitle('');
        setNewBtnAction('');
        setIsCreateModalVisible(false);
        Alert.alert('Başarılı', 'Özel butonunuz oluşturuldu!');
    };

    const deleteCustomButton = async (id) => {
        Alert.alert('Emin misiniz?', 'Bu özel butonu tamamen silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { 
                text: 'Sil', 
                style: 'destructive',
                onPress: async () => {
                    const updatedCustoms = customButtons.filter(b => b.id !== id);
                    const updatedActiveIds = activeItemIds.filter(itemId => itemId !== id);
                    
                    setCustomButtons(updatedCustoms);
                    setActiveItemIds(updatedActiveIds);
                    
                    await AsyncStorage.setItem('@custom_buttons', JSON.stringify(updatedCustoms));
                    await AsyncStorage.setItem('@active_deck_ids', JSON.stringify(updatedActiveIds));
                }
            }
        ]);
    };

    const toggleItem = (id) => {
        if (activeItemIds.includes(id)) {
            const newIds = activeItemIds.filter(itemId => itemId !== id);
            saveActiveIds(newIds);
        } else {
            const newIds = [...activeItemIds, id];
            saveActiveIds(newIds);
        }
    };

    const mergedButtons = [...ALL_DECK_BUTTONS, ...customButtons];
    const activeItems = mergedButtons.filter(item => activeItemIds.includes(item.id)).sort((a, b) => activeItemIds.indexOf(a.id) - activeItemIds.indexOf(b.id));
    const otherItems = mergedButtons.filter(item => !activeItemIds.includes(item.id));

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AYARLAR</Text>
            </View>
            
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bilgisayar IP Adresi</Text>
                        <Text style={styles.descriptionText}>Bilgisayarınızın yerel ağdaki adresini girin.</Text>
                        <TextInput style={styles.input} value={ipAddress} onChangeText={setIpAddress} placeholder="Örn: 192.168.1.42" placeholderTextColor="#444" keyboardType="numeric" />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Port</Text>
                        <TextInput style={styles.input} value={port} onChangeText={setPort} placeholder="Örn: 5000" placeholderTextColor="#444" keyboardType="numeric" />
                    </View>
                    <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
                        <FontAwesome5 name="save" size={16} color="#000" style={styles.saveIcon} />
                        <Text style={styles.saveButtonText}>Kaydet</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { marginBottom: 20 }]}>
                    <Text style={[styles.label, { marginBottom: 4 }]}>Görünüm Modu</Text>
                    <Text style={[styles.descriptionText, { marginBottom: 15 }]}>Deck ekranında aynı anda kaç butonun görüneceğini seçin.</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.modeButton, viewMode === '10' && styles.modeButtonActive]} onPress={() => handleViewModeToggle('10')}>
                            <Text style={[styles.modeButtonText, viewMode === '10' && styles.modeButtonTextActive]}>10 Buton</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modeButton, viewMode === '15' && styles.modeButtonActive]} onPress={() => handleViewModeToggle('15')}>
                            <Text style={[styles.modeButtonText, viewMode === '15' && styles.modeButtonTextActive]}>15 Buton</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.label, { marginBottom: 5 }]}>Deck Özelleştirme</Text>
                    <Text style={styles.descriptionText}>Butonları yönetin veya yenisini oluşturun.</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#2C3E50', flex: 1 }]} onPress={() => setIsEditModalVisible(true)}>
                            <FontAwesome5 name="edit" size={14} color="#E1E1E1" style={styles.saveIcon} />
                            <Text style={[styles.saveButtonText, { color: '#E1E1E1', fontSize: 13 }]}>Düzenle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#00E5FF', flex: 1.2 }]} onPress={() => setIsCreateModalVisible(true)}>
                            <FontAwesome5 name="plus" size={14} color="#000" style={styles.saveIcon} />
                            <Text style={[styles.saveButtonText, { color: '#000', fontSize: 13 }]}>Buton Oluştur</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {customButtons.length > 0 && (
                    <View style={styles.card}>
                        <Text style={[styles.label, { marginBottom: 15 }]}>Özel Butonlarım</Text>
                        {customButtons.map((btn) => (
                            <View key={btn.id} style={styles.customBtnItem}>
                                <View style={[styles.customBtnIcon, { backgroundColor: btn.color }]}>
                                    <FontAwesome5 name={btn.icon} size={16} color="white" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.customBtnTitle}>{btn.title}</Text>
                                    <Text style={styles.customBtnSubtitle} numberOfLines={1}>{btn.action}</Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteCustomButton(btn.id)} style={styles.deleteBtn}>
                                    <FontAwesome5 name="trash-alt" size={16} color="#E74C3C" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
                <View style={{ height: 60 }} />
            </ScrollView>

            <Modal animationType="slide" transparent={true} visible={isEditModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>DÜZENLE</Text>
                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.modalCloseButton}>
                                <FontAwesome5 name="times" size={16} color="#E1E1E1" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <Text style={styles.modalSubTitle}>AKTİF ÖGELER ({activeItems.length})</Text>
                            <View style={styles.itemsGrid}>
                                {activeItems.map((item) => (
                                    <TouchableOpacity key={item.id} style={[styles.itemCard, { borderColor: '#27AE60', borderWidth: 1 }]} onPress={() => toggleItem(item.id)}>
                                        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                            <FontAwesome5 name={item.icon || 'circle'} size={18} color="#FFF" />
                                        </View>
                                        <Text style={styles.itemName} numberOfLines={1}>{item.title}</Text>
                                        <View style={styles.removeBadge}><FontAwesome5 name="minus" size={10} color="#FFF" /></View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={[styles.modalSubTitle, { marginTop: 25 }]}>DİĞER ÖGELER</Text>
                            <View style={styles.itemsGrid}>
                                {otherItems.map((item) => (
                                    <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => toggleItem(item.id)}>
                                        <View style={[styles.iconContainer, { backgroundColor: item.color, opacity: 0.7 }]}>
                                            <FontAwesome5 name={item.icon || 'circle'} size={18} color="#FFF" />
                                        </View>
                                        <Text style={[styles.itemName, { color: '#888' }]} numberOfLines={1}>{item.title}</Text>
                                        <View style={styles.addBadge}><FontAwesome5 name="plus" size={10} color="#FFF" /></View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsEditModalVisible(false)}>
                            <Text style={styles.closeModalButtonText}>Tamam</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={isCreateModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>YENİ BUTON</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.modalCloseButton}>
                                <FontAwesome5 name="times" size={16} color="#E1E1E1" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubTitle}>GÖRÜNÜM</Text>
                            <TextInput style={styles.input} value={newBtnTitle} onChangeText={setNewBtnTitle} placeholder="Buton Başlığı" placeholderTextColor="#444" />
                            <Text style={[styles.modalSubTitle, { marginTop: 20 }]}>İKON VEYA ÖZEL RESİM</Text>
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 }}>
                                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                                    {newBtnImage ? (
                                        <Image source={{ uri: newBtnImage }} style={styles.pickedImage} />
                                    ) : (
                                        <FontAwesome5 name="image" size={18} color="#00E5FF" />
                                    )}
                                    <Text style={styles.imagePickerText}>{newBtnImage ? 'Değiştir' : 'Resim Seç'}</Text>
                                </TouchableOpacity>
                                
                                {newBtnImage && (
                                    <TouchableOpacity onPress={() => setNewBtnImage(null)}>
                                        <Text style={{ color: '#E74C3C', fontSize: 12 }}>Resmi Kaldır</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {!newBtnImage && (
                                <View style={styles.matrixGrid}>
                                    {['rocket', 'gamepad', 'code', 'folder-open', 'globe', 'tv', 'music', 'camera', 'terminal', 'play'].map(icon => (
                                        <TouchableOpacity key={icon} style={[styles.iconOption, newBtnIcon === icon && styles.optionActive]} onPress={() => setNewBtnIcon(icon)}>
                                            <FontAwesome5 name={icon} size={18} color={newBtnIcon === icon ? '#00E5FF' : '#555'} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            <Text style={[styles.modalSubTitle, { marginTop: 20 }]}>RENK</Text>
                            <View style={styles.matrixGrid}>
                                {['#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6', '#E67E22', '#00E5FF', '#FF00A8'].map(color => (
                                    <TouchableOpacity key={color} style={[styles.colorOption, { backgroundColor: color }, newBtnColor === color && styles.colorActive]} onPress={() => setNewBtnColor(color)} />
                                ))}
                            </View>
                            <Text style={[styles.modalSubTitle, { marginTop: 20 }]}>EYLEM TİPİ</Text>
                            <View style={styles.typeSelector}>
                                {['path', 'command', 'keys'].map(type => (
                                    <TouchableOpacity key={type} style={[styles.typeTab, newBtnType === type && styles.typeTabActive]} onPress={() => setNewBtnType(type)}>
                                        <Text style={[styles.typeTabText, newBtnType === type && styles.typeTabTextActive]}>{type === 'path' ? 'Yol' : type === 'command' ? 'Komut' : 'Tuşlar'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.actionDetailBox}>
                                <Text style={styles.actionHelpText}>
                                    {newBtnType === 'path' ? 'Uygulama/Klasör yolu girin.' : newBtnType === 'command' ? 'CMD/PowerShell komutu girin.' : 'Tuş makrosu girin (Örn: ^+s)'}
                                </Text>

                                {newBtnType !== 'path' && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                                        {(newBtnType === 'keys' ? PRESET_KEYS : PRESET_COMMANDS).map((preset, idx) => (
                                            <TouchableOpacity 
                                                key={idx} 
                                                style={styles.presetChip} 
                                                onPress={() => addPresetToAction(preset.value)}
                                            >
                                                <Text style={styles.presetChipText}>{newBtnType === 'keys' ? '+' : ''}{preset.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}

                                <TextInput 
                                    style={[styles.input, { borderBottomWidth: 0, marginTop: 10 }]} 
                                    value={newBtnAction} 
                                    onChangeText={setNewBtnAction} 
                                    placeholder="Eylem verisi..." 
                                    placeholderTextColor="#444" 
                                    multiline 
                                />
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.createButton} onPress={addCustomButton}>
                            <Text style={styles.createButtonText}>OLUŞTUR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0e0e0e' },
    header: { paddingHorizontal: 24, paddingTop: 65, paddingBottom: 10 },
    headerTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: '#FFFFFF', letterSpacing: 1 },
    content: { flex: 1, paddingHorizontal: 20 },
    scrollContent: { paddingTop: 10, paddingBottom: 120 },
    card: { backgroundColor: '#1a1a1a', padding: 25, borderRadius: 32, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.03)' },
    label: { fontFamily: 'SpaceGrotesk_600SemiBold', color: '#E1E1E1', fontSize: 16, marginBottom: 10 },
    descriptionText: { color: '#666', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 8 },
    inputGroup: { marginBottom: 20 },
    input: { backgroundColor: '#0e0e0e', color: '#FFFFFF', fontFamily: 'SpaceGrotesk_500Medium', fontSize: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
    saveButton: { backgroundColor: '#00E5FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
    saveButtonText: { fontFamily: 'SpaceGrotesk_700Bold', color: '#000', fontSize: 16 },
    saveIcon: { marginRight: 8 },
    modeButton: { flex: 1, paddingVertical: 14, backgroundColor: '#0e0e0e', borderRadius: 14, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
    modeButtonActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
    modeButtonText: { fontFamily: 'SpaceGrotesk_600SemiBold', color: '#888', fontSize: 14 },
    modeButtonTextActive: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold' },
    customBtnItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
    customBtnIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    customBtnTitle: { color: '#FFFFFF', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 },
    customBtnSubtitle: { color: '#666', fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11 },
    deleteBtn: { padding: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0e0e0e', height: '90%', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingTop: 30, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { fontFamily: 'SpaceGrotesk_700Bold', color: '#FFFFFF', fontSize: 26, letterSpacing: 1 },
    modalCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
    modalSubTitle: { fontFamily: 'SpaceGrotesk_700Bold', color: '#444', fontSize: 12, letterSpacing: 1.5 },
    itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    itemCard: { width: '31%', backgroundColor: '#1a1a1a', borderRadius: 20, padding: 12, alignItems: 'center', position: 'relative' },
    iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    itemName: { color: '#E1E1E1', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10, textAlign: 'center' },
    removeBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF5252', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0e0e0e' },
    addBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#00E676', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0e0e0e' },
    closeModalButton: { backgroundColor: '#00E5FF', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 15 },
    closeModalButtonText: { fontFamily: 'SpaceGrotesk_700Bold', color: '#000', fontSize: 16 },
    matrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    iconOption: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    colorOption: { width: 35, height: 35, borderRadius: 10 },
    optionActive: { borderColor: '#00E5FF', backgroundColor: '#00E5FF10' },
    colorActive: { borderWidth: 2, borderColor: '#FFF' },
    typeSelector: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, marginTop: 10 },
    typeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    typeTabActive: { backgroundColor: '#222' },
    typeTabText: { color: '#666', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12 },
    typeTabTextActive: { color: '#00E5FF' },
    actionDetailBox: { backgroundColor: '#111', borderRadius: 16, padding: 15, marginTop: 15, borderWidth: 1, borderColor: '#222' },
    actionHelpText: { color: '#555', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
    createButton: { backgroundColor: '#00E5FF', paddingVertical: 18, alignItems: 'center', borderRadius: 20, marginTop: 10 },
    createButtonText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
    imagePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#222',
        gap: 10,
    },
    imagePickerText: {
        color: '#E1E1E1',
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    pickedImage: {
        width: 30,
        height: 30,
        borderRadius: 8,
    },
    presetsScroll: {
        marginTop: 12,
        marginBottom: 5,
    },
    presetChip: {
        backgroundColor: '#222',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    presetChipText: {
        color: '#00E5FF',
        fontFamily: 'SpaceGrotesk_600SemiBold',
        fontSize: 10,
    }
});

export default SettingsScreen;



