import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Text,
  View,
  LogBox,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TravelProvider, useTravel } from './src/context/TravelContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';

import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import CountryDetailScreen from './src/screens/CountryDetailScreen';
import CountriesListScreen from './src/screens/CountriesListScreen';
import RegionDetailScreen from './src/screens/RegionDetailScreen';
import LockScreen from './src/screens/LockScreen';
import LiveFeedScreen from './src/screens/LiveFeedScreen';
import InviteScreen from './src/screens/InviteScreen';
import DebugScreen from './src/screens/DebugScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendProfileScreen from './src/screens/FriendProfileScreen';

import AchievementToast from './src/components/AchievementToast';
import { requestNotificationPermissions } from './src/utils/notifications';
import { biometricManager } from './src/utils/BiometricManager';

import { linkingConfig } from './src/navigation/linkingConfig';
import DeepLinkRouter from './src/navigation/DeepLinkRouter';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Each child in a list should have a unique "key" prop',
]);

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const MapStackNav = createNativeStackNavigator();
const ListStackNav = createNativeStackNavigator();
const FriendsStackNav = createNativeStackNavigator();

export const deepLinkRouter = new DeepLinkRouter();

function MapStack() {
  return (
    <MapStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MapStackNav.Screen name="MapMain" component={MapScreen} />
      <MapStackNav.Screen
        name="CountryDetail"
        component={CountryDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.name || 'Країна',
          headerBackTitle: 'Назад',
        })}
      />
      <MapStackNav.Screen
        name="RegionDetail"
        component={RegionDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.regionName || 'Регіон',
          headerBackTitle: 'Назад',
        })}
      />
    </MapStackNav.Navigator>
  );
}

function ListStack() {
  return (
    <ListStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ListStackNav.Screen name="CountriesList" component={CountriesListScreen} />
      <ListStackNav.Screen
        name="CountryDetail"
        component={CountryDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.name || 'Країна',
          headerBackTitle: 'Назад',
        })}
      />
      <ListStackNav.Screen
        name="RegionDetail"
        component={RegionDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.regionName || 'Регіон',
          headerBackTitle: 'Назад',
        })}
      />
    </ListStackNav.Navigator>
  );
}

// Стек для вкладки Друзі: список → стрічка → профіль друга
function FriendsStack() {
  return (
    <FriendsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <FriendsStackNav.Screen name="FriendsList" component={FriendsScreen} />
      <FriendsStackNav.Screen
        name="LiveFeed"
        component={LiveFeedScreen}
        options={{ headerShown: true, title: 'Стрічка друзів', headerBackTitle: 'Назад' }}
      />
      <FriendsStackNav.Screen
        name="FriendProfile"
        component={FriendProfileScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.username || 'Профіль',
          headerBackTitle: 'Назад',
        })}
      />
    </FriendsStackNav.Navigator>
  );
}

function tabIcon(emoji) {
  return () => <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2e7d32',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapStack}
        options={{ title: 'Мапа', tabBarIcon: tabIcon('🗺️') }}
      />
      <Tab.Screen
        name="List"
        component={ListStack}
        options={{ title: 'Список', tabBarIcon: tabIcon('📋') }}
      />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: 'Досягнення', tabBarIcon: tabIcon('🏆') }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsStack}
        options={{ title: 'Друзі', tabBarIcon: tabIcon('👥') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профіль', tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { pendingToast, hideToast } = useTravel();
  const { user, loading: authLoading } = useAuth();
  const [locked, setLocked] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const appState = useRef(AppState.currentState);
  const bgTimer = useRef(null);
  const navigationRef = useRef(null);

  useEffect(() => {
    (async () => {
      const enabled = await biometricManager.isEnabledByUser();
      setBiometricEnabled(enabled);
      if (!enabled) setLocked(false);
    })();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        bgTimer.current = Date.now();
      }
      if (next === 'active' && bgTimer.current) {
        const secs = (Date.now() - bgTimer.current) / 1000;
        if (secs > 30) {
          biometricManager.isEnabledByUser().then((en) => {
            if (en) setLocked(true);
          });
        }
        bgTimer.current = null;
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, []);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5f5df8" />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  if (locked && biometricEnabled) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linkingConfig}
        onReady={() => {
          deepLinkRouter.setNavigation(navigationRef.current);
        }}
      >
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Main" component={MainTabs} />
          <RootStack.Screen
            name="Invite"
            component={InviteScreen}
            options={{ headerShown: true, title: 'Запрошення' }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
      <AchievementToast achievement={pendingToast} onHide={hideToast} />
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <TravelProvider>
            <AppContent />
          </TravelProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}