import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TravelProvider, useTravel } from './src/context/TravelContext';

import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import CountryDetailScreen from './src/screens/CountryDetailScreen';
import CountriesListScreen from './src/screens/CountriesListScreen';
import RegionDetailScreen from './src/screens/RegionDetailScreen'; // 🔥 ДОДАНО

import AchievementToast from './src/components/AchievementToast';
import { requestNotificationPermissions } from './src/utils/notifications';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Each child in a list should have a unique "key" prop',
]);

const Tab = createBottomTabNavigator();
const MapStackNav = createNativeStackNavigator();
const ListStackNav = createNativeStackNavigator();

// =========================
// 🔥 MAP STACK
// =========================
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

      {/* 🔥 НОВИЙ ЕКРАН */}
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

// =========================
// 🔥 LIST STACK
// =========================
function ListStack() {
  return (
    <ListStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ListStackNav.Screen
        name="CountriesList"
        component={CountriesListScreen}
      />

      <ListStackNav.Screen
        name="CountryDetail"
        component={CountryDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.name || 'Країна',
          headerBackTitle: 'Назад',
        })}
      />

      {/* 🔥 ТУТ ТЕЖ ДОДАЄМО */}
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

// =========================
// 🔥 TAB ICON
// =========================
function tabIcon(emoji) {
  return () => <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

// =========================
// 🔥 APP CONTENT
// =========================
function AppContent() {
  const { pendingToast, hideToast } = useTravel();

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
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
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Профіль', tabBarIcon: tabIcon('👤') }}
          />
        </Tab.Navigator>
      </NavigationContainer>

      <AchievementToast achievement={pendingToast} onHide={hideToast} />
      <StatusBar style="auto" />
    </View>
  );
}

// =========================
// 🔥 ROOT
// =========================
export default function App() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TravelProvider>
        <AppContent />
      </TravelProvider>
    </GestureHandlerRootView>
  );
}