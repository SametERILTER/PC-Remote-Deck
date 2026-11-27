import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Reads PC IP/Port from AsyncStorage on mount and screen focus,
 * and polls /ping to track real-time server connectivity.
 */
export function usePcConnection(navigation, pingIntervalMs = 5000) {
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('9090');
    const [baseUrl, setBaseUrl] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const timerRef = useRef(null);
    const mountedRef = useRef(true);

    const checkConnection = useCallback(async () => {
        try {
            const savedIP = (await AsyncStorage.getItem('@pc_ip_address'))?.trim() || '';
            const savedPort = (await AsyncStorage.getItem('@pc_port'))?.trim() || '9090';

            if (!mountedRef.current) return;

            if (!savedIP) {
                setIpAddress('');
                setPort(savedPort);
                setBaseUrl('');
                setIsConnected(false);
                setIsLoaded(true);
                return;
            }

            const url = `http://${savedIP}:${savedPort}`;
            setIpAddress(savedIP);
            setPort(savedPort);
            setBaseUrl(url);
            setIsLoaded(true);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            try {
                const res = await fetch(`${url}/ping`, { signal: controller.signal });
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

    return { ipAddress, port, baseUrl, isConnected, isLoaded, checkConnection };
}
