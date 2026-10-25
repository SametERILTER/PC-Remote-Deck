import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Keyboard, ScrollView, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5, Octicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_DECK_BUTTONS, DEFAULT_DECK_IDS, getDeckBtnTitle } from '../../constants';

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

const getPresetCommands = (t) => [
    { label: t('settings.preset_shutdown'), value: 'shutdown /s /t 0' },
    { label: t('settings.preset_restart'), value: 'shutdown /r /t 0' },
    { label: t('settings.preset_trash'), value: 'powershell -Command "Clear-RecycleBin -Force"' },
    { label: t('settings.preset_taskmgr'), value: 'taskmgr' },
    { label: t('settings.preset_calc'), value: 'calc' },
    { label: t('settings.preset_notepad'), value: 'notepad' },
    { label: t('settings.preset_screenoff'), value: 'powershell (Add-Type -MemberDefinition "[DllImport(\\"user32.dll\\")] public static extern int SendMessage(int hWnd, uint Msg, int wParam, int lParam);" -Name "W" -PassThru)::SendMessage(0xffff, 0x0112, 0xf170, 2)' },
];

const SettingsScreen = () => {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const PRESET_COMMANDS = getPresetCommands(t);

    const [isLangModalVisible, setIsLangModalVisible] = useState(false);
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('9090');
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [activeItemIds, setActiveItemIds] = useState([]);
    const [viewMode, setViewMode] = useState('8');
    const [customButtons, setCustomButtons] = useState([]);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

    // Yeni Buton State'leri
    const [newBtnTitle, setNewBtnTitle] = useState('');
    const [newBtnIcon, setNewBtnIcon] = useState('rocket');
    const [newBtnColor, setNewBtnColor] = useState('#3498DB');
    const [newBtnType, setNewBtnType] = useState('path'); // path, command, keys, app
    const [newBtnAction, setNewBtnAction] = useState('');
    const [newBtnImage, setNewBtnImage] = useState(null);
    const [newBtnImageFit, setNewBtnImageFit] = useState('contain'); // contain or cover

    const [installedApps, setInstalledApps] = useState([]);
    const [isLoadingApps, setIsLoadingApps] = useState(false);
    const [isAppModalVisible, setIsAppModalVisible] = useState(false);

    useEffect(() => {
        if (newBtnType === 'app' && installedApps.length === 0) {
            fetchInstalledApps();
        }
    }, [newBtnType]);

    const fetchInstalledApps = async () => {
        if (!ipAddress || !port) {
            Alert.alert(t('deck.error'), t('settings.err_ip_save'));
            return;
        }
        setIsLoadingApps(true);
        try {
            const url = `http://${ipAddress}:${port}/installed-apps`;
            const response = await fetch(url, { method: 'GET' });
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            setInstalledApps(data || []);
        } catch (e) {
            console.error('Fetch Apps Error:', e);
            Alert.alert(t('deck.error'), t('settings.err_fetch_apps'));
        } finally {
            setIsLoadingApps(false);
        }
    };

    const mergedButtons = [...ALL_DECK_BUTTONS, ...customButtons];

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
            else setViewMode('8');

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
    };

    const saveSettings = async () => {
        try {
            if (!ipAddress.trim()) {
                Alert.alert(t('deck.error'), t('settings.err_invalid_ip'));
                return;
            }
            if (!port.trim()) {
                Alert.alert(t('deck.error'), t('settings.err_invalid_port'));
                return;
            }
            await AsyncStorage.setItem('@pc_ip_address', ipAddress.trim());
            await AsyncStorage.setItem('@pc_port', port.trim());
            Keyboard.dismiss();
            Alert.alert(t('power.success'), t('settings.success_save'));
        } catch (e) {
            Alert.alert(t('deck.error'), t('settings.err_save'));
        }
    };

    const changeLanguage = async (lang) => {
        await AsyncStorage.setItem('@language', lang);
        i18n.changeLanguage(lang);
        setIsLangModalVisible(false);
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
            quality: 0.9,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setNewBtnImage(result.assets[0].uri);
        }
    };

    const removeImage = () => {
        setNewBtnImage(null);
        setNewBtnImageFit('contain');
    };

    const addPresetToAction = (value) => {
        if (newBtnType === 'keys') {
            setNewBtnAction(prev => prev + value);
        } else if (newBtnType === 'command') {
            setNewBtnAction(value);
        }
    };

    const addCustomButton = async () => {
        if (!newBtnAction) {
            Alert.alert(t('deck.error'), t('settings.err_empty_btn'));
            return;
        }
        if (!newBtnTitle && !newBtnImage) {
            Alert.alert(t('deck.error'), t('settings.err_empty_btn'));
            return;
        }

        const newBtn = {
            id: `custom_${Date.now()}`,
            title: newBtnTitle || '',
            icon: newBtnIcon,
            imageUri: newBtnImage,
            imageFit: newBtnImageFit,
            color: newBtnColor,
            type: newBtnType,
            action: newBtnAction,
            isCustom: true,
            library: 'FontAwesome5'
        };

        const updatedCustoms = [...customButtons, newBtn];
        setCustomButtons(updatedCustoms);
        await AsyncStorage.setItem('@custom_buttons', JSON.stringify(updatedCustoms));

        const validActiveCount = mergedButtons.filter(item => activeItemIds.includes(item.id)).length;
        const limit = viewMode === '12' ? 12 : 8;
        if (validActiveCount < limit) {
            const updatedActiveIds = [...activeItemIds, newBtn.id];
            saveActiveIds(updatedActiveIds);
        }

        setNewBtnTitle('');
        setNewBtnAction('');
        setNewBtnImage(null);
        setNewBtnImageFit('contain');
        setIsCreateModalVisible(false);
        Alert.alert(t('power.success'), t('settings.success_btn_create'));
    };

    const deleteCustomButton = async (id) => {
        Alert.alert(t('settings.confirm_del_title'), t('settings.confirm_del_desc'), [
            { text: t('settings.cancel'), style: 'cancel' },
            { 
                text: t('settings.delete'), 
                style: 'destructive',
                onPress: async () => {
                    const updatedCustoms = customButtons.filter(b => b.id !== id);
                    setCustomButtons(updatedCustoms);
                    await AsyncStorage.setItem('@custom_buttons', JSON.stringify(updatedCustoms));
                    if (activeItemIds.includes(id)) {
                        saveActiveIds(activeItemIds.filter(itemId => itemId !== id));
                    }
                }
            }
        ]);
    };

    const toggleItem = (id) => {
        if (activeItemIds.includes(id)) {
            const newIds = activeItemIds.filter(itemId => itemId !== id);
            saveActiveIds(newIds);
        } else {
            const validActiveCount = mergedButtons.filter(item => activeItemIds.includes(item.id)).length;
            const limit = viewMode === '12' ? 12 : 8;
            if (validActiveCount >= limit) {
                Alert.alert(t('settings.limit_exc_title'), t('settings.limit_exc_desc', { limit }));
                return;
            }
            const newIds = [...activeItemIds, id];
            saveActiveIds(newIds);
        }
    };

    const activeItems = mergedButtons.filter(item => activeItemIds.includes(item.id)).sort((a, b) => activeItemIds.indexOf(a.id) - activeItemIds.indexOf(b.id));
    const otherItems = mergedButtons.filter(item => !activeItemIds.includes(item.id));

    return (
        <View style={styles.container}>
            {/* Üst Başlık */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 16 }]}>
                <Text style={styles.headerTitle}>{t('settings.title')}</Text>
            </View>
            
            <ScrollView 
                style={styles.content} 
                contentContainerStyle={[
                    styles.scrollContent, 
                    { paddingBottom: Math.max(insets.bottom, 16) + 100 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Bağlantı Ayarları */}
                <Text style={styles.sectionTitle}>{t('settings.conn_title')}</Text>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('settings.ip_label')}</Text>
                        <Text style={styles.descriptionText}>{t('settings.ip_desc')}</Text>
                        <TextInput 
                            style={styles.input} 
                            value={ipAddress} 
                            onChangeText={setIpAddress} 
                            placeholder={t('settings.ip_ph')} 
                            placeholderTextColor="#555966" 
                            keyboardType="numeric" 
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('settings.port_label')}</Text>
                        <TextInput 
                            style={styles.input} 
                            value={port} 
                            onChangeText={setPort} 
                            placeholder={t('settings.port_ph')} 
                            placeholderTextColor="#555966" 
                            keyboardType="numeric" 
                        />
                    </View>
                    <TouchableOpacity style={styles.saveButton} onPress={saveSettings} activeOpacity={0.8}>
                        <FontAwesome5 name="save" size={15} color="#080808" style={styles.saveIcon} />
                        <Text style={styles.saveButtonText}>{t('settings.save')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Dil Ayarı */}
                <Text style={styles.sectionTitle}>{t('settings.language').toUpperCase()}</Text>
                <View style={styles.card}>
                    <TouchableOpacity 
                        style={styles.langRow} 
                        onPress={() => setIsLangModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.langIconBox}>
                                <FontAwesome5 name="globe" size={16} color="#E2E8F0" />
                            </View>
                            <Text style={styles.langTitle}>{t('settings.language')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.langCurrent}>
                                {i18n.language === 'tr' ? t('settings.turkish') : t('settings.english')}
                            </Text>
                            <FontAwesome5 name="chevron-right" size={12} color="#555966" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Deck Görünüm Modu */}
                <Text style={styles.sectionTitle}>{t('settings.view_mode')}</Text>
                <View style={styles.card}>
                    <Text style={styles.descriptionText}>{t('settings.view_desc')}</Text>
                    <View style={styles.modeToggleRow}>
                        <TouchableOpacity 
                            style={[styles.modeButton, viewMode === '8' && styles.modeButtonActive]} 
                            onPress={() => handleViewModeToggle('8')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.modeButtonText, viewMode === '8' && styles.modeButtonTextActive]}>
                                {t('settings.btn_8')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.modeButton, viewMode === '12' && styles.modeButtonActive]} 
                            onPress={() => handleViewModeToggle('12')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.modeButtonText, viewMode === '12' && styles.modeButtonTextActive]}>
                                {t('settings.btn_12')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Deck Özelleştirme */}
                <Text style={styles.sectionTitle}>{t('settings.deck_custom')}</Text>
                <View style={styles.card}>
                    <Text style={styles.descriptionText}>{t('settings.deck_custom_desc')}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#27282F', flex: 1 }]} 
                            onPress={() => setIsEditModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="edit" size={13} color="#E2E8F0" style={styles.saveIcon} />
                            <Text style={[styles.actionBtnText, { color: '#E2E8F0' }]}>{t('settings.edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#FFFFFF', flex: 1.2 }]} 
                            onPress={() => setIsCreateModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="plus" size={13} color="#080808" style={styles.saveIcon} />
                            <Text style={[styles.actionBtnText, { color: '#080808' }]}>{t('settings.create_btn')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Özel Butonlarım */}
                {customButtons.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>{t('settings.my_customs')}</Text>
                        <View style={styles.card}>
                            {customButtons.map((btn) => (
                                <View key={btn.id} style={styles.customBtnItem}>
                                    <View style={[styles.customBtnIcon, { backgroundColor: btn.color }]}>
                                        {btn.imageUri ? (
                                            <Image 
                                                source={{ uri: btn.imageUri }} 
                                                style={{ width: 28, height: 28, borderRadius: 6 }} 
                                                resizeMode={btn.imageFit === 'cover' ? 'cover' : 'contain'}
                                            />
                                        ) : (
                                            <FontAwesome5 name={btn.icon} size={15} color="white" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={styles.customBtnTitle}>{btn.title || btn.action}</Text>
                                        <Text style={styles.customBtnSubtitle} numberOfLines={1}>{btn.action}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => deleteCustomButton(btn.id)} style={styles.deleteBtn} activeOpacity={0.7}>
                                        <FontAwesome5 name="trash-alt" size={15} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Deck Düzenleme Modalı */}
            <Modal animationType="slide" transparent={true} visible={isEditModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.edit_modal')}</Text>
                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.modalCloseButton} activeOpacity={0.7}>
                                <FontAwesome5 name="times" size={13} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Önizleme Konsolu */}
                            <View style={styles.previewContainerGrid}>
                                <View style={styles.deckDeviceOutline}>
                                    <View style={styles.deckScreenGrid}>
                                        {Array.from({ length: parseInt(viewMode) }).map((_, i) => {
                                            const item = activeItems[i];
                                            return (
                                                <View 
                                                    key={i} 
                                                    style={[styles.deckScreenBtn, viewMode === '12' && styles.deckScreenBtn12, item && { backgroundColor: '#27282F', overflow: 'hidden' }]}
                                                >
                                                    {item ? (
                                                        item.imageUri ? (
                                                            <Image 
                                                                source={{ uri: item.imageUri }} 
                                                                style={{ width: '100%', height: '100%', borderRadius: 4 }} 
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <FontAwesome5 name={item.icon} size={viewMode === '12' ? 12 : 16} color={item.color || '#E2E8F0'} />
                                                        )
                                                    ) : (
                                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#3A3D46' }} />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>

                            {/* Aktif Butonlar */}
                            <Text style={styles.modalSubTitle}>{t('settings.active_btns')} ({activeItems.length}/{viewMode})</Text>
                            <View style={styles.itemsGrid}>
                                {activeItems.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={styles.itemCard}
                                        onPress={() => toggleItem(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.iconContainer, { backgroundColor: '#27282F', overflow: 'hidden' }]}>
                                            {item.imageUri ? (
                                                <Image 
                                                    source={{ uri: item.imageUri }} 
                                                    style={{ width: 24, height: 24, borderRadius: 6 }} 
                                                    resizeMode={item.imageFit === 'cover' ? 'cover' : 'contain'}
                                                />
                                            ) : (
                                                <FontAwesome5 name={item.icon} size={18} color={item.color || '#E2E8F0'} />
                                            )}
                                        </View>
                                        <Text style={styles.itemName} numberOfLines={1}>{getDeckBtnTitle(item, t)}</Text>
                                        <View style={styles.removeBadge}>
                                            <FontAwesome5 name="minus" size={10} color="#FFF" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Boştaki Butonlar */}
                            <Text style={[styles.modalSubTitle, { marginTop: 24 }]}>{t('settings.other_btns')}</Text>
                            <View style={styles.itemsGrid}>
                                {otherItems.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={styles.itemCard}
                                        onPress={() => toggleItem(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.iconContainer, { backgroundColor: '#27282F', overflow: 'hidden' }]}>
                                            {item.imageUri ? (
                                                <Image 
                                                    source={{ uri: item.imageUri }} 
                                                    style={{ width: 24, height: 24, borderRadius: 6 }} 
                                                    resizeMode={item.imageFit === 'cover' ? 'cover' : 'contain'}
                                                />
                                            ) : (
                                                <FontAwesome5 name={item.icon} size={18} color={item.color || '#E2E8F0'} />
                                            )}
                                        </View>
                                        <Text style={styles.itemName} numberOfLines={1}>{getDeckBtnTitle(item, t)}</Text>
                                        <View style={styles.addBadge}>
                                            <FontAwesome5 name="plus" size={10} color="#FFF" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsEditModalVisible(false)} activeOpacity={0.8}>
                            <Text style={styles.closeModalButtonText}>{t('settings.done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Özel Buton Oluşturma Modalı */}
            <Modal animationType="slide" transparent={true} visible={isCreateModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.new_btn_title')}</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.modalCloseButton} activeOpacity={0.7}>
                                <FontAwesome5 name="times" size={13} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Buton İsmi */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>
                                    {newBtnImage ? t('settings.btn_name_optional') : t('settings.btn_name')}
                                </Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={newBtnTitle} 
                                    onChangeText={setNewBtnTitle} 
                                    placeholder={newBtnImage ? `${t('settings.name_ph')} (${t('settings.btn_name_optional')})` : t('settings.name_ph')} 
                                    placeholderTextColor="#555966" 
                                />
                            </View>

                            {/* İkon Seçimi */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('settings.select_icon')}</Text>
                                <View style={styles.matrixGrid}>
                                    {['rocket', 'play', 'pause', 'stop', 'volume-up', 'terminal', 'chrome', 'folder', 'code', 'gamepad', 'cog', 'lock'].map((ic) => (
                                        <TouchableOpacity 
                                            key={ic} 
                                            style={[styles.iconOption, newBtnIcon === ic && styles.optionActive]}
                                            onPress={() => setNewBtnIcon(ic)}
                                            activeOpacity={0.7}
                                        >
                                            <FontAwesome5 name={ic} size={16} color={newBtnIcon === ic ? '#FFFFFF' : '#8E95A2'} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Renk Seçimi */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('settings.select_color')}</Text>
                                <View style={styles.matrixGrid}>
                                    {['#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#161616'].map((clr) => (
                                        <TouchableOpacity 
                                            key={clr} 
                                            style={[styles.colorOption, { backgroundColor: clr }, newBtnColor === clr && styles.colorActive]}
                                            onPress={() => setNewBtnColor(clr)}
                                            activeOpacity={0.7}
                                        />
                                    ))}
                                </View>
                            </View>

                            {/* Resim Ekleme */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('settings.custom_img')}</Text>
                                {newBtnImage ? (
                                    <View style={styles.imageSelectedContainer}>
                                        <View style={[styles.imageSelectedPreview, { backgroundColor: newBtnColor }]}>
                                            <Image 
                                                source={{ uri: newBtnImage }} 
                                                style={newBtnImageFit === 'cover' ? styles.imagePreviewCover : styles.imagePreviewContain} 
                                                resizeMode={newBtnImageFit === 'cover' ? 'cover' : 'contain'}
                                            />
                                            {newBtnTitle ? (
                                                <Text style={styles.imagePreviewLabel} numberOfLines={1}>
                                                    {newBtnTitle}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.imageSelectedActions}>
                                            <TouchableOpacity style={styles.imageActionBtn} onPress={pickImage} activeOpacity={0.7}>
                                                <FontAwesome5 name="sync-alt" size={12} color="#FFFFFF" />
                                                <Text style={styles.imageActionBtnText}>{t('settings.change_img')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.imageActionBtn, styles.imageActionBtnDanger]} onPress={removeImage} activeOpacity={0.7}>
                                                <FontAwesome5 name="trash-alt" size={12} color="#EF4444" />
                                                <Text style={[styles.imageActionBtnText, { color: '#EF4444' }]}>{t('settings.rm_img')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage} activeOpacity={0.7}>
                                        <FontAwesome5 name="image" size={16} color="#A0A5AF" />
                                        <Text style={styles.imagePickerText}>
                                            {t('settings.pick_img')}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Resim Görünüm Modu (İkon veya Tam Kapla) */}
                                {newBtnImage ? (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={[styles.label, { fontSize: 12, marginBottom: 6 }]}>{t('settings.fit_mode')}</Text>
                                        <View style={styles.typeSelector}>
                                            <TouchableOpacity 
                                                style={[styles.typeTab, newBtnImageFit === 'contain' && styles.typeTabActive]}
                                                onPress={() => setNewBtnImageFit('contain')}
                                                activeOpacity={0.7}
                                            >
                                                <FontAwesome5 name="image" size={12} color={newBtnImageFit === 'contain' ? '#38BDF8' : '#A0A5AF'} style={{ marginRight: 6 }} />
                                                <Text style={[styles.typeTabText, newBtnImageFit === 'contain' && styles.typeTabTextActive]}>
                                                    {t('settings.fit_icon')}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.typeTab, newBtnImageFit === 'cover' && styles.typeTabActive]}
                                                onPress={() => setNewBtnImageFit('cover')}
                                                activeOpacity={0.7}
                                            >
                                                <FontAwesome5 name="expand" size={12} color={newBtnImageFit === 'cover' ? '#38BDF8' : '#A0A5AF'} style={{ marginRight: 6 }} />
                                                <Text style={[styles.typeTabText, newBtnImageFit === 'cover' && styles.typeTabTextActive]}>
                                                    {t('settings.fit_cover')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : null}
                            </View>

                            {/* Eylem Türü */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('settings.action_type')}</Text>
                                <View style={styles.typeSelector}>
                                    {[
                                        { id: 'path', label: t('settings.type_app') },
                                        { id: 'command', label: t('settings.type_cmd') },
                                        { id: 'keys', label: t('settings.type_keys') },
                                        { id: 'app', label: t('settings.type_windows') },
                                    ].map(tab => (
                                        <TouchableOpacity 
                                            key={tab.id} 
                                            style={[styles.typeTab, newBtnType === tab.id && styles.typeTabActive]}
                                            onPress={() => setNewBtnType(tab.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.typeTabText, newBtnType === tab.id && styles.typeTabTextActive]}>
                                                {tab.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Eylem Detayı */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('settings.action_detail')}</Text>
                                <Text style={styles.descriptionText}>
                                    {newBtnType === 'path' && t('settings.path_help')}
                                    {newBtnType === 'command' && t('settings.cmd_help')}
                                    {newBtnType === 'keys' && t('settings.keys_help')}
                                    {newBtnType === 'app' && t('settings.app_help')}
                                </Text>

                                {newBtnType === 'app' ? (
                                    <View>
                                        {newBtnTitle && newBtnAction.startsWith('shell:AppsFolder\\') ? (
                                            <View style={styles.selectedAppBox}>
                                                <Text style={styles.selectedAppText}>{t('settings.selected')}{newBtnTitle}</Text>
                                                <TouchableOpacity onPress={() => setIsAppModalVisible(true)}>
                                                    <FontAwesome5 name="edit" size={15} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                        
                                        <TouchableOpacity 
                                            style={styles.chooseAppButton}
                                            onPress={() => setIsAppModalVisible(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.chooseAppButtonText}>
                                                {isLoadingApps ? t('settings.loading_apps') : (newBtnTitle && newBtnAction.startsWith('shell:AppsFolder\\') ? t('settings.sel_another') : t('settings.sel_app'))}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        {newBtnType !== 'path' && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                                                {(newBtnType === 'keys' ? PRESET_KEYS : PRESET_COMMANDS).map((preset, idx) => (
                                                    <TouchableOpacity 
                                                        key={idx} 
                                                        style={styles.presetChip} 
                                                        onPress={() => addPresetToAction(preset.value)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={styles.presetChipText}>{newBtnType === 'keys' ? '+' : ''}{preset.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )}

                                        <TextInput 
                                            style={[styles.input, { marginTop: 10 }]} 
                                            value={newBtnAction} 
                                            onChangeText={setNewBtnAction} 
                                            placeholder={t('settings.action_ph')} 
                                            placeholderTextColor="#555966" 
                                            multiline 
                                        />
                                    </>
                                )}
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.createButton} onPress={addCustomButton} activeOpacity={0.8}>
                            <Text style={styles.createButtonText}>{t('settings.create')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Uygulama Seçme Modalı */}
            <Modal animationType="slide" transparent={true} visible={isAppModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.sel_app_title')}</Text>
                            <TouchableOpacity onPress={() => setIsAppModalVisible(false)} style={styles.modalCloseButton} activeOpacity={0.7}>
                                <FontAwesome5 name="times" size={13} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        
                        {isLoadingApps ? (
                            <Text style={{ color: '#A0A5AF', marginVertical: 30, textAlign: 'center', fontFamily: 'PlusJakartaSans_500Medium' }}>
                                {t('settings.loading_apps')}
                            </Text>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                                {installedApps.map((app, idx) => {
                                    const isSel = newBtnAction === `shell:AppsFolder\\${app.AppID}`;
                                    return (
                                        <TouchableOpacity 
                                            key={idx} 
                                            style={[styles.appListItem, isSel && styles.appListItemActive]}
                                            onPress={() => {
                                                setNewBtnAction(`shell:AppsFolder\\${app.AppID}`);
                                                setNewBtnTitle(app.Name);
                                                setIsAppModalVisible(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <FontAwesome5 
                                                    name="windows" 
                                                    size={16} 
                                                    color={isSel ? '#FFFFFF' : '#717684'} 
                                                    style={{ marginRight: 15 }} 
                                                />
                                                <Text style={[styles.appListText, isSel && styles.appListTextActive]}>
                                                    {app.Name}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Dil Seçme Modalı */}
            <Modal animationType="slide" transparent={true} visible={isLangModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', paddingBottom: Math.max(insets.bottom, 24) + 10, borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.select_language')}</Text>
                            <TouchableOpacity onPress={() => setIsLangModalVisible(false)} style={styles.modalCloseButton} activeOpacity={0.7}>
                                <FontAwesome5 name="times" size={13} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ gap: 10, marginTop: 5 }}>
                            <TouchableOpacity 
                                style={[styles.appListItem, i18n.language === 'tr' && styles.appListItemActive]} 
                                onPress={() => changeLanguage('tr')}
                                activeOpacity={0.7}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={[styles.appListText, i18n.language === 'tr' && styles.appListTextActive]}>
                                        {t('settings.turkish')}
                                    </Text>
                                    {i18n.language === 'tr' && <FontAwesome5 name="check" size={15} color="#22C55E" />}
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.appListItem, i18n.language === 'en' && styles.appListItemActive]} 
                                onPress={() => changeLanguage('en')}
                                activeOpacity={0.7}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={[styles.appListText, i18n.language === 'en' && styles.appListTextActive]}>
                                        {t('settings.english')}
                                    </Text>
                                    {i18n.language === 'en' && <FontAwesome5 name="check" size={15} color="#22C55E" />}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#080808' 
    },
    header: { 
        paddingHorizontal: 20, 
        paddingBottom: 14, 
        backgroundColor: '#080808' 
    },
    headerTitle: { 
        fontFamily: 'PlusJakartaSans_800ExtraBold', 
        fontSize: 24, 
        color: '#FFFFFF', 
        letterSpacing: -0.4 
    },
    content: { 
        flex: 1, 
        paddingHorizontal: 18 
    },
    scrollContent: { 
        paddingTop: 14 
    },
    sectionTitle: { 
        fontFamily: 'PlusJakartaSans_700Bold', 
        color: '#717684', 
        fontSize: 11, 
        letterSpacing: 1.2, 
        marginLeft: 2, 
        marginBottom: 10,
        textTransform: 'uppercase'
    },
    card: { 
        backgroundColor: '#1E1F24', // Grimsi kutu
        padding: 16, 
        borderRadius: 18, 
        marginBottom: 20 
    },
    label: { 
        fontFamily: 'PlusJakartaSans_600SemiBold', 
        color: '#FFFFFF', 
        fontSize: 14, 
        marginBottom: 8 
    },
    descriptionText: { 
        color: '#9CA0AC', 
        fontSize: 12, 
        fontFamily: 'PlusJakartaSans_400Regular', 
        marginBottom: 10,
        lineHeight: 16
    },
    inputGroup: { 
        marginBottom: 16 
    },
    input: { 
        backgroundColor: '#27282F', // İç input gri
        color: '#FFFFFF', 
        fontFamily: 'PlusJakartaSans_500Medium', 
        fontSize: 14, 
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12 
    },
    saveButton: { 
        backgroundColor: '#FFFFFF', 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 13, 
        borderRadius: 12,
        marginTop: 4
    },
    saveButtonText: { 
        fontFamily: 'PlusJakartaSans_700Bold', 
        color: '#080808', 
        fontSize: 14 
    },
    saveIcon: { 
        marginRight: 8 
    },
    langRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingVertical: 2 
    },
    langIconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#27282F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    langTitle: { 
        color: '#FFFFFF', 
        fontFamily: 'PlusJakartaSans_600SemiBold', 
        fontSize: 14 
    },
    langCurrent: { 
        color: '#9CA0AC', 
        fontFamily: 'PlusJakartaSans_500Medium', 
        fontSize: 13, 
        marginRight: 8 
    },
    modeToggleRow: {
        flexDirection: 'row',
        backgroundColor: '#27282F',
        borderRadius: 12,
        padding: 4,
        gap: 6
    },
    modeButton: { 
        flex: 1, 
        paddingVertical: 10, 
        borderRadius: 10, 
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    modeButtonActive: { 
        backgroundColor: '#383A44' 
    },
    modeButtonText: { 
        fontFamily: 'PlusJakartaSans_600SemiBold', 
        color: '#717684', 
        fontSize: 13 
    },
    modeButtonTextActive: { 
        color: '#FFFFFF', 
        fontFamily: 'PlusJakartaSans_700Bold' 
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12
    },
    actionBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13
    },
    customBtnItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 10,
        borderBottomWidth: 0
    },
    customBtnIcon: { 
        width: 38, 
        height: 38, 
        borderRadius: 11, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    customBtnTitle: { 
        color: '#FFFFFF', 
        fontFamily: 'PlusJakartaSans_600SemiBold', 
        fontSize: 14 
    },
    customBtnSubtitle: { 
        color: '#717684', 
        fontFamily: 'PlusJakartaSans_400Regular', 
        fontSize: 11,
        marginTop: 2 
    },
    deleteBtn: { 
        padding: 8 
    },

    // ── Modallar ──────────────────────────────────────────────────────────────
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0, 0, 0, 0.8)', 
        justifyContent: 'flex-end' 
    },
    modalContent: { 
        backgroundColor: '#1E1F24', 
        height: '92%', 
        borderTopLeftRadius: 28, 
        borderTopRightRadius: 28, 
        paddingHorizontal: 20, 
        paddingTop: 8 
    },
    sheetHandleWrap: {
        alignItems: 'center',
        paddingVertical: 8
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3E414D'
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        paddingTop: 4
    },
    modalTitle: { 
        fontFamily: 'PlusJakartaSans_700Bold', 
        color: '#FFFFFF', 
        fontSize: 18, 
        letterSpacing: -0.2 
    },
    modalCloseButton: { 
        width: 32, 
        height: 32, 
        borderRadius: 16, 
        backgroundColor: '#27282F', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    modalSubTitle: { 
        fontFamily: 'PlusJakartaSans_700Bold', 
        color: '#717684', 
        fontSize: 11, 
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 10
    },
    itemsGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 10 
    },
    itemCard: { 
        width: '31%', 
        backgroundColor: '#24252C', 
        borderRadius: 16, 
        padding: 12, 
        alignItems: 'center', 
        position: 'relative' 
    },
    iconContainer: { 
        width: 42, 
        height: 42, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 8 
    },
    itemName: { 
        color: '#E4E7EC', 
        fontFamily: 'PlusJakartaSans_600SemiBold', 
        fontSize: 11, 
        textAlign: 'center' 
    },
    removeBadge: { 
        position: 'absolute', 
        top: -4, 
        right: -4, 
        backgroundColor: '#EF4444', 
        width: 20, 
        height: 20, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    addBadge: { 
        position: 'absolute', 
        top: -4, 
        right: -4, 
        backgroundColor: '#22C55E', 
        width: 20, 
        height: 20, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    previewContainerGrid: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 20, 
        width: '100%' 
    },
    deckDeviceOutline: { 
        width: '100%', 
        backgroundColor: '#141518', 
        borderRadius: 18, 
        padding: 14, 
        paddingBottom: 6, 
        alignItems: 'center' 
    },
    deckScreenGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'flex-start', 
        width: '100%', 
        gap: 8 
    },
    deckScreenBtn: { 
        width: '22%', 
        aspectRatio: 1, 
        backgroundColor: '#24252C', 
        borderRadius: 10, 
        marginBottom: 8, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    deckScreenBtn12: { 
        width: '14.5%', 
        borderRadius: 8 
    },
    closeModalButton: { 
        backgroundColor: '#FFFFFF', 
        paddingVertical: 14, 
        borderRadius: 14, 
        alignItems: 'center', 
        marginTop: 14 
    },
    closeModalButtonText: { 
        fontFamily: 'PlusJakartaSans_700Bold', 
        color: '#080808', 
        fontSize: 14 
    },
    matrixGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: 8, 
        marginTop: 8 
    },
    iconOption: { 
        width: 42, 
        height: 42, 
        borderRadius: 11, 
        backgroundColor: '#27282F', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    colorOption: { 
        width: 34, 
        height: 34, 
        borderRadius: 9 
    },
    optionActive: { 
        backgroundColor: '#383A44' 
    },
    colorActive: { 
        transform: [{ scale: 1.15 }] 
    },
    typeSelector: { 
        flexDirection: 'row', 
        backgroundColor: '#27282F', 
        borderRadius: 12, 
        padding: 4, 
        marginTop: 6 
    },
    typeTab: { 
        flex: 1, 
        paddingVertical: 8, 
        alignItems: 'center', 
        borderRadius: 9 
    },
    typeTabActive: { 
        backgroundColor: '#383A44' 
    },
    typeTabText: { 
        color: '#717684', 
        fontFamily: 'PlusJakartaSans_600SemiBold', 
        fontSize: 11 
    },
    typeTabTextActive: { 
        color: '#FFFFFF', 
        fontFamily: 'PlusJakartaSans_700Bold' 
    },
    selectedAppBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: '#27282F', 
        padding: 12, 
        borderRadius: 12, 
        marginBottom: 10 
    },
    selectedAppText: { 
        color: '#FFFFFF', 
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13 
    },
    chooseAppButton: { 
        backgroundColor: '#27282F', 
        paddingVertical: 12, 
        borderRadius: 12, 
        alignItems: 'center' 
    },
    chooseAppButtonText: { 
        color: '#FFFFFF', 
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13 
    },
    createButton: { 
        backgroundColor: '#FFFFFF', 
        paddingVertical: 14, 
        alignItems: 'center', 
        borderRadius: 14, 
        marginTop: 10 
    },
    createButtonText: { 
        color: '#080808', 
        fontFamily: 'PlusJakartaSans_700Bold', 
        fontSize: 14 
    },
    imagePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27282F',
        padding: 12,
        borderRadius: 12,
        gap: 10,
    },
    imagePickerText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    pickedImage: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    imageSelectedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1F24',
        padding: 12,
        borderRadius: 14,
        gap: 14,
        borderWidth: 1,
        borderColor: '#2D3039',
    },
    imageSelectedPreview: {
        width: 66,
        height: 66,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    imagePreviewCover: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    imagePreviewContain: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    imagePreviewLabel: {
        position: 'absolute',
        bottom: 3,
        left: 2,
        right: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        color: '#FFFFFF',
        fontSize: 8.5,
        fontFamily: 'PlusJakartaSans_700Bold',
        textAlign: 'center',
        borderRadius: 4,
        paddingHorizontal: 2,
    },
    imageSelectedActions: {
        flex: 1,
        gap: 8,
    },
    imageActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27282F',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 8,
    },
    imageActionBtnDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    imageActionBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    presetsScroll: {
        marginTop: 8,
        marginBottom: 4,
    },
    presetChip: {
        backgroundColor: '#27282F',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 6,
    },
    presetChipText: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 10,
    },
    appListItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#27282F',
        borderRadius: 12,
        marginBottom: 8
    },
    appListItemActive: {
        backgroundColor: '#32343E'
    },
    appListText: {
        color: '#E4E7EC',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    appListTextActive: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_700Bold',
    }
});

export default SettingsScreen;
