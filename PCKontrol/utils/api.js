import AsyncStorage from '@react-native-async-storage/async-storage';
import { hmacSha256Hex } from './crypto';

function generateNonce() {
    return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function getStoredConnection() {
    const [rawIp, rawPort, rawToken] = await Promise.all([
        AsyncStorage.getItem('@pc_ip_address'),
        AsyncStorage.getItem('@pc_port'),
        AsyncStorage.getItem('@pc_token'),
    ]);

    const ip = rawIp?.trim() || '';
    const port = rawPort?.trim() || '9090';
    const token = rawToken?.trim() || '';
    const baseUrl = ip ? `http://${ip}:${port}` : '';

    return { ip, port, token, baseUrl };
}

export function getAuthHeaders(token, extraHeaders = {}) {
    if (!token) return { ...extraHeaders };
    const ts = String(Date.now());
    const nonce = generateNonce();
    const sig = hmacSha256Hex(token, `${ts}:${nonce}`);
    return {
        ...extraHeaders,
        'X-Auth-Timestamp': ts,
        'X-Auth-Nonce': nonce,
        'X-Auth-Signature': sig,
    };
}

export function getWsAuthQuery(token) {
    if (!token) return '';
    const ts = String(Date.now());
    const nonce = generateNonce();
    const sig = hmacSha256Hex(token, `${ts}:${nonce}`);
    return `?ts=${encodeURIComponent(ts)}&nonce=${encodeURIComponent(nonce)}&sig=${encodeURIComponent(sig)}`;
}

export async function authFetch(url, options = {}, tokenOverride = null) {
    const token = tokenOverride !== null
        ? tokenOverride
        : ((await AsyncStorage.getItem('@pc_token'))?.trim() || '');

    const headers = getAuthHeaders(token, options.headers || {});
    return fetch(url, { ...options, headers });
}

export function parseQrConnectionData(raw) {
    const trimmed = (raw || '').trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('pckontrol://')) {
        try {
            const withoutScheme = trimmed.slice('pckontrol://'.length);
            const [hostPort, queryStr = ''] = withoutScheme.split('?');
            const parts = hostPort.split(':');
            if (parts.length !== 2 || !parts[0].includes('.')) return null;

            const params = new URLSearchParams(queryStr);
            return {
                ip: parts[0].trim(),
                port: parts[1].trim(),
                token: (params.get('token') || '').trim(),
            };
        } catch {
            return null;
        }
    }

    const parts = trimmed.split(':');
    if (parts.length === 2 && parts[0].includes('.')) {
        return {
            ip: parts[0].trim(),
            port: parts[1].trim(),
            token: '',
        };
    }

    return null;
}
