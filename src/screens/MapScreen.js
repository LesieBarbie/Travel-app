import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';

import WorldMapSvg from '../components/WorldMapSvg';
import ProgressBar from '../components/ProgressBar';
import GlobeScreen from './GlobeScreen';

import { useTravel } from '../context/TravelContext';
import {
  TOTAL_COUNTRIES,
  CONTINENT_COUNTS,
  COUNTRIES_WITH_REGIONS,
  getCountryById,
} from '../data/countries';

export default function MapScreen({ navigation }) {
  const { visited, dream, toggleVisited, toggleDream } = useTravel();

  const [mode, setMode] = useState('visited');
  const [viewMode, setViewMode] = useState('map');

  const getFill = (id) => {
    if (visited.find((c) => c.id === id)) return '#69e36a';
    if (dream.find((c) => c.id === id)) return '#83cfff';
    return '#e0e0e0';
  };

  const handleCountryPress = (id, name) => {
    const hasRegions = !!COUNTRIES_WITH_REGIONS[id];
    const isVisited = visited.find((c) => c.id === id);

    if (hasRegions && isVisited) {
      navigation.navigate('CountryDetail', {
        countryId: id,
        name,
      });
      return;
    }

    if (mode === 'visited') toggleVisited(id, name);
    else toggleDream(id, name);
  };

  const handleMapPress = (id, name) => {
    const hasRegions = !!COUNTRIES_WITH_REGIONS[id];
    const isVisited = visited.find((c) => c.id === id);

    if (hasRegions && isVisited) {
      Alert.alert(
        name,
        'Що зробити?',
        [
          {
            text: 'Відкрити регіони',
            onPress: () =>
              navigation.navigate('CountryDetail', {
                countryId: id,
                name,
              }),
          },
          {
            text: mode === 'visited' ? 'Прибрати позначку' : 'У мрії',
            onPress: () =>
              mode === 'visited'
                ? toggleVisited(id, name)
                : toggleDream(id, name),
          },
          { text: 'Скасувати', style: 'cancel' },
        ]
      );
      return;
    }

    handleCountryPress(id, name);
  };

  const perContinent = {};
  for (const v of visited) {
    const c = getCountryById(v.id);
    if (c) {
      perContinent[c.continent] =
        (perContinent[c.continent] || 0) + 1;
    }
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* 🔁 ПЕРЕМИКАЧ */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'map' && styles.viewBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={styles.viewTxt}>🗺️ Карта</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'globe' && styles.viewBtnActive]}
          onPress={() => setViewMode('globe')}
        >
          <Text style={styles.viewTxt}>🌍 Глобус</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>🗺️ Моя мапа подорожей</Text>

      {/* режим */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'visited' && styles.modeBtnActive]}
          onPress={() => setMode('visited')}
        >
          <Text style={[styles.modeTxt, mode === 'visited' && styles.modeTxtActive]}>
            ✅ Відвідані
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, mode === 'dream' && styles.modeBtnActive]}
          onPress={() => setMode('dream')}
        >
          <Text style={[styles.modeTxt, mode === 'dream' && styles.modeTxtActive]}>
            💭 Мрії
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Торкнись країни, щоб позначити її
      </Text>

      <View style={styles.mapContainer}>
        {viewMode === 'map' ? (
          <WorldMapSvg
            getFill={getFill}
            onCountryPress={handleMapPress}
          />
        ) : (
          <GlobeScreen
            visited={visited}
            dream={dream}
            onCountryPress={handleMapPress}
          />
        )}
      </View>

      <ScrollView style={styles.progressScroll}>
        <View style={styles.progressSection}>
          <ProgressBar
            label="🌍 Весь світ"
            current={visited.length}
            total={TOTAL_COUNTRIES}
            color="#4caf50"
          />

          {Object.keys(CONTINENT_COUNTS).map((continent) => (
            <ProgressBar
              key={continent}
              label={continent}
              current={perContinent[continent] || 0}
              total={CONTINENT_COUNTS[continent]}
              color="#2196f3"
            />
          ))}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },

  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 10,
  },

  viewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eee',
  },

  viewBtnActive: { backgroundColor: '#333' },

  viewTxt: { color: '#000', fontWeight: '600' },

  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 10,
  },

  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eee',
  },

  modeBtnActive: { backgroundColor: '#333' },

  modeTxt: { color: '#333', fontWeight: '600' },

  modeTxtActive: { color: '#fff' },

  hint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },

  mapContainer: { height: 420 },

  progressScroll: { flex: 1 },

  progressSection: { padding: 16 },
});