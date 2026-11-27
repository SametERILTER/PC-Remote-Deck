import { useState, useEffect, useRef, useCallback } from 'react';
import { getStoredConnection, getAuthHeaders } from '../utils/api';

/**
 * Reads PC IP/Port/Token from AsyncStorage on mount and screen focus,
 * and polls /ping with auth headers to track real-time server connectivity.
 */
export function usePcConnection(navigation, pingIntervalMs = 5000) {
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('9090');
    const [token, setToken] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const timerRef = useRef(null);
    const mountedRef = useRef(true);

    const checkConnection = useCallback(async () => {
        try {
            const { ip, port: savedPort, token: savedToken, baseUrl: url } = await getStoredConnection();

            if (!mountedRef.current) return;

            if (!ip) {
                setIpAddress('');
                setPort(savedPort);
                setToken(savedToken);
                setBaseUrl('');
                setIsConnected(false);
                setIsLoaded(true);
                return;
            }

            setIpAddress(ip);
            setPort(savedPort);
            setToken(savedToken);
            setBaseUrl(url);
            setIsLoaded(true);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            try {
                const res = await fetch(`${url}/ping`, {
                    signal: controller.signal,
                    headers: getAuthHeaders(savedToken),
                });
                clearTimeout(timeoutId);
                if (mountedRef.current) {
                    setIsConnected(res.ok);
                }
            } catch {
                clearTimeout(timeoutId);
                if (mountedRef.current) {
                    setIsConnected(false);
                }
            }
        } catch {
            if (mountedRef.current) {
                setIsConnected(false);
                setIsLoaded(true);
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        checkConnection();

        const unsubFocus = navigation?.addListener?.('focus', () => {
            checkConnection();
            clearInterval(timerRef.current);
            timerRef.current = setInterval(checkConnection, pingIntervalMs);
        });

        const unsubBlur = navigation?.addListener?.('blur', () => {
            clearInterval(timerRef.current);
        });

        return () => {
            mountedRef.current = false;
            clearInterval(timerRef.current);
            unsubFocus?.();
            unsubBlur?.();
        };
    }, [navigation, checkConnection, pingIntervalMs]);

    return { ipAddress, port, token, baseUrl, isConnected, isLoaded, checkConnection };
}
