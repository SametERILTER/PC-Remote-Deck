export const ALL_DECK_BUTTONS = [
    { id: '1', title: 'Ses +', icon: 'volume-up', library: 'FontAwesome5', color: '#2C3E50', endpoint: '/vol-up' },
    { id: '2', title: 'Ses -', icon: 'volume-down', library: 'FontAwesome5', color: '#34495E', endpoint: '/vol-down' },
    { id: '3', title: 'Sessiz', icon: 'volume-mute', library: 'FontAwesome5', color: '#C0392B', endpoint: '/mute' },
    { id: '4', title: 'Oynat/Dur', icon: 'play-pause', library: 'MaterialCommunityIcons', color: '#27AE60', endpoint: '/play-pause' },
    { id: '5', title: 'Sonraki', icon: 'step-forward', library: 'FontAwesome5', color: '#2980B9', endpoint: '/next' },
    { id: '6', title: 'Hesap Mak.', icon: 'calculator', library: 'FontAwesome5', color: '#E67E22', endpoint: '/open-calc' },
    { id: '7', title: 'Google', icon: 'google', library: 'FontAwesome5', color: '#8E44AD', endpoint: '/open-browser' },
    { id: '8', title: 'YouTube', icon: 'youtube', library: 'FontAwesome5', color: '#FF0000', endpoint: '/open-youtube' },
    { id: '9', title: 'Spotify', icon: 'spotify', library: 'FontAwesome5', color: '#1DB954', endpoint: '/open-spotify' },
    { id: '10', title: 'Pencere Kapat', icon: 'times-circle', library: 'FontAwesome5', color: '#444444', endpoint: '/close-window' },
    { id: '11', title: 'Chrome', icon: 'chrome', library: 'FontAwesome5', color: '#4285F4', endpoint: '/open-chrome' },
    { id: '13', title: 'Not Defteri', icon: 'sticky-note', library: 'FontAwesome5', color: '#F1C40F', endpoint: '/open-notepad' },
    { id: '14', title: 'PC Kilitle', icon: 'lock', library: 'FontAwesome5', color: '#E74C3C', endpoint: '/lock-pc' },
    { id: '15', title: 'Pencere Değiştir', icon: 'exchange-alt', library: 'FontAwesome5', color: '#16A085', endpoint: '/alt-tab' },
    { id: '16', title: 'Masaüstü', icon: 'desktop', library: 'FontAwesome5', color: '#8E44AD', endpoint: '/show-desktop' },
    { id: '17', title: 'Görev Yön.', icon: 'tasks', library: 'FontAwesome5', color: '#34495E', endpoint: '/task-manager' },
    { id: '18', title: 'Mikrofon', icon: 'microphone-slash', library: 'FontAwesome5', color: '#D35400', endpoint: '/toggle-mic' },
    { id: '19', title: 'Hava Durumu', icon: 'cloud-sun', library: 'FontAwesome5', color: '#3498DB', endpoint: '/weather' },
    { id: '20', title: 'Pencereleri Gör', icon: 'th-large', library: 'FontAwesome5', color: '#9B59B6', endpoint: '/windows-tab' },

    // Chrome Özel Butonlar
    { id: 'c1', title: 'Yeni Sekme', icon: 'plus-circle', library: 'FontAwesome5', color: '#EA4335', endpoint: '/chrome-new-tab' },
    { id: 'c2', title: 'Sekme Kapat', icon: 'minus-circle', library: 'FontAwesome5', color: '#EA4335', endpoint: '/chrome-close-tab' },
    { id: 'c3', title: 'Yenile', icon: 'redo', library: 'FontAwesome5', color: '#EA4335', endpoint: '/chrome-refresh' },
    { id: 'c4', title: 'Sekme Değiştir', icon: 'clone', library: 'FontAwesome5', color: '#EA4335', endpoint: '/chrome-next-tab' },
    { id: 'c5', title: 'Geri Git', icon: 'arrow-left', library: 'FontAwesome5', color: '#EA4335', endpoint: '/chrome-back' },

    // Spotify Özel Butonlar
    { id: 's1', title: 'Önceki', icon: 'step-backward', library: 'FontAwesome5', color: '#1DB954', endpoint: '/prev' },
    { id: 's2', title: 'Oynat/Dur', icon: 'play-pause', library: 'MaterialCommunityIcons', color: '#1DB954', endpoint: '/play-pause' },
    { id: 's3', title: 'Sonraki', icon: 'step-forward', library: 'FontAwesome5', color: '#1DB954', endpoint: '/next' },
    { id: 's4', title: 'Spotify Ara', icon: 'search', library: 'FontAwesome5', color: '#1DB954', endpoint: '/spotify-search' },

    // Antigravity (Coding) Özel Butonlar
    { id: 'a1', title: 'Terminal', icon: 'terminal', library: 'FontAwesome5', color: '#333333', endpoint: '/code-terminal' },
    { id: 'a2', title: 'Kaydet', icon: 'save', library: 'FontAwesome5', color: '#333333', endpoint: '/code-save-all' },
    { id: 'a3', title: 'Format', icon: 'align-left', library: 'FontAwesome5', color: '#333333', endpoint: '/code-format' },
    { id: 'a4', title: 'Dosya Git', icon: 'file-import', library: 'FontAwesome5', color: '#333333', endpoint: '/code-find-file' },
    { id: 'a5', title: 'Çalıştır', icon: 'play', library: 'FontAwesome5', color: '#333333', endpoint: '/code-run' },
];

export const DEFAULT_DECK_IDS = ['1', '2', '3', '15', '10', '4', '5', '6', '7', '8', '9', '11', '13', '14', '16', '17', '18', '20'];
export const CHROME_DECK_IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
export const SPOTIFY_DECK_IDS = ['s1', 's2', 's3', 's4', '9'];
export const ANTIGRAVITY_DECK_IDS = ['a1', 'a2', 'a3', 'a4', 'a5'];

export const getDeckBtnTitle = (item, t) => {
    if (!item) return '';
    if (t) {
        const key = `deck_btn.${item.id}`;
        const translated = t(key);
        if (translated && translated !== key) {
            return translated;
        }
    }
    return item.title || '';
};
