import React, { useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5, Octicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import './i18n'; // i18n configuration

import { createStackNavigator } from '@react-navigation/stack';

// Screens
import HomeScreen from './assets/screens/HomeScreen';
import SettingsScreen from './assets/screens/SettingsScreen';
import DeckScreen from './assets/screens/DeckScreen';
import SendCommandScreen from './assets/screens/SendCommandScreen';
import ScreenShotScreen from './assets/screens/ScreenShotScreen';
import WindowManagerScreen from './assets/screens/WindowManagerScreen';
import KeyboardScreen from './assets/screens/KeyboardScreen';
import ModesScreen from './assets/screens/ModesScreen';
import MouseScreen from './assets/screens/MouseScreen';
import FileTransferScreen from './assets/screens/FileTransferScreen';
import StatisticsScreen from './assets/screens/StatisticsScreen';
import QrScannerScreen from './assets/screens/QrScannerScreen';
import SpeakScreen from './assets/screens/SpeakScreen';
import PowerScreen from './assets/screens/PowerScreen';
import FileExplorerScreen from './assets/screens/FileExplorerScreen';
import ClipboardScreen from './assets/screens/ClipboardScreen';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#080808',
          borderTopWidth: 0,
          height: 70 + Math.max(insets.bottom, 16),
          paddingBottom: Math.max(insets.bottom, 16) + 6,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#717684',
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 11,
          marginTop: 4,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home-fill';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }

          return iconName === "home-fill" ? (
            <Octicons name={iconName} size={20} color={color} />
          ) : (
            <FontAwesome5 name={iconName} size={18} color={color} />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('tabs.home') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tabs.settings') }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer onReady={onLayoutRootView}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="Deck"
            component={DeckScreen}
            options={{
              gestureEnabled: false,
              animationEnabled: false
            }}
          />
          <Stack.Screen
            name="SendCommand"
            component={SendCommandScreen}
          />
          <Stack.Screen
            name="ScreenShot"
            component={ScreenShotScreen}
          />
          <Stack.Screen
            name="WindowManager"
            component={WindowManagerScreen}
          />
          <Stack.Screen
            name="Keyboard"
            component={KeyboardScreen}
          />
          <Stack.Screen
            name="Modes"
            component={ModesScreen}
          />
          <Stack.Screen
            name="Mouse"
            component={MouseScreen}
          />
          <Stack.Screen
            name="FileTransfer"
            component={FileTransferScreen}
          />
          <Stack.Screen
            name="FileExplorer"
            component={FileExplorerScreen}
          />
          <Stack.Screen
            name="Statistics"
            component={StatisticsScreen}
          />
          <Stack.Screen
            name="QrScanner"
            component={QrScannerScreen}
          />
          <Stack.Screen
            name="Speak"
            component={SpeakScreen}
          />
          <Stack.Screen
            name="Clipboard"
            component={ClipboardScreen}
          />
          <Stack.Screen
            name="Power"
            component={PowerScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
