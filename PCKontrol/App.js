import React, { useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

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
import VolumeScreen from './assets/screens/VolumeScreen';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 56,
          marginRight: 50,
          marginLeft: 50,
          backgroundColor: '#1a1a1af9',
          borderRadius: 32,
          height: 70,
          borderTopWidth: 0,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00E5FF',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 12,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }

          return <FontAwesome5 name={iconName} size={18} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Ana Sayfa' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Ayarlar' }}
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
          name="Statistics"
          component={StatisticsScreen}
        />
        <Stack.Screen
          name="QrScanner"
          component={QrScannerScreen}
        />
        <Stack.Screen
          name="Volume"
          component={VolumeScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
