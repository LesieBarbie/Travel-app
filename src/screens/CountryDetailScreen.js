import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Share,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system/next';

import CountryRegionMap from '../components/CountryRegionMap';
import { useTravel } from '../context/TravelContext';
import { COUNTRIES_WITH_REGIONS, getCountryById } from '../data/countries';
import Country from '../models/Country';

export default function CountryDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { countryId, name } = route.params;

  const config = COUNTRIES_WITH_REGIONS[countryId];

  const {
    regions,
    toggleRegion,
    visited,
    dream,
    updateNote,
    addCountryPhoto,
    removeCountryPhoto,
  } = useTravel();

  // =========================
  // 📸 FULLSCREEN VIEW
  // =========================
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // =========================
  // COUNTRY MODEL
  // =========================
  const country = useMemo(() => {
    const meta = getCountryById(countryId);
    const v = visited.find((c) => c.id === countryId);
    const d = dream.find((c) => c.id === countryId);

    return new Country(
      countryId,
      name,
      meta?.continent || '',
      !!v,
      !!d,
      v?.date ? new Date(v.date) : null,
      v?.note || d?.note || '',
      v?.photos || d?.photos || []
    );
  }, [countryId, name, visited, dream]);

  const visitedRegions = regions[countryId] || [];
  const photos = Array.isArray(country.photos) ? country.photos : [];

  // =========================
  // 📝 NOTE WITH DEBOUNCE
  // =========================
  const [localNote, setLocalNote] = useState(country.note || '');
  const debounceTimer = useRef(null);

  const handleNoteChange = useCallback(
    (text) => {
      setLocalNote(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        updateNote(country.visited ? 'visited' : 'dream', countryId, text);
      }, 600);
    },
    [country.visited, countryId, updateNote]
  );

  // =========================
  // 📸 PICK IMAGE
  // =========================
  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Немає доступу');
        return;
      }

      if (!country.visited && !country.isDream) {
        Alert.alert('Спочатку додай країну');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const originalUri = result.assets[0].uri;

        const dir = new Directory(Paths.document, 'photos');
        if (!dir.exists) {
          dir.create();
        }

        const dest = new File(dir, Date.now() + '.jpg');
        const src = new File(originalUri);
        src.copy(dest);

        addCountryPhoto(countryId, dest.uri);
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Помилка', 'Не вдалося обрати фото');
    }
  };

  const handleDelete = (uri) => {
    Alert.alert('Видалити фото?', 'Цю дію не можна скасувати', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => removeCountryPhoto(countryId, uri),
      },
    ]);
  };

  // =========================
  // 📤 SHARE COUNTRY (Deep Link)
  // =========================
  const handleShare = async () => {
    try {
      const url = `travelmap://country/${countryId}`;
      await Share.share({
        message: `${country.name} — поглянь у Travel Wish Map: ${url}`,
        url,
      });
    } catch (e) {
      Alert.alert('Помилка', e.message);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}
      >
        {/* HEADER */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>{country.name}</Text>
          <Text style={styles.continent}>🌍 {country.continent}</Text>
          <Text style={styles.status}>{country.getStatus()}</Text>

          {country.dateVisited && (
            <Text style={styles.date}>
              📅 Відвідано: {country.dateVisited.toLocaleDateString('uk-UA')}
            </Text>
          )}
        </View>

        {/* SHARE BUTTON */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareTxt}>📤 Поділитись країною</Text>
        </TouchableOpacity>

        {/* MAP */}
        {config && (
          <>
            <Text style={styles.hint}>
              Торкнись регіону, щоб позначити або відкрити його
            </Text>

            <CountryRegionMap
              config={config}
              countryId={countryId}
              visitedRegions={visitedRegions}
              onRegionPress={(regionName) => {
                const exists = visitedRegions.find(
                  (r) => r.name === regionName
                );

                if (exists) {
                  navigation.navigate('RegionDetail', {
                    countryId,
                    regionName,
                  });
                } else {
                  toggleRegion(countryId, regionName);
                }
              }}
            />

            <View style={styles.stats}>
              <Text style={styles.statsTxt}>
                Відвідано регіонів: {visitedRegions.length}
              </Text>
            </View>
          </>
        )}

        {/* REGIONS */}
        {visitedRegions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Відвідані регіони</Text>

            {visitedRegions.map((r, index) => (
              <TouchableOpacity
                key={`${r.name}-${index}`}
                onPress={() =>
                  navigation.navigate('RegionDetail', {
                    countryId,
                    regionName: r.name,
                  })
                }
              >
                <Text style={styles.regionItem}>• {r.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* NOTE */}
        {(country.visited || country.isDream) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Нотатка</Text>

            <TextInput
              style={styles.noteInput}
              placeholder="Твої враження або плани..."
              multiline
              value={localNote}
              onChangeText={handleNoteChange}
            />
          </View>
        )}

        {/* PHOTOS */}
        {(country.visited || country.isDream) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Фото</Text>

            {photos.length === 0 && (
              <Text style={styles.empty}>Поки що немає фото</Text>
            )}

            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                <TouchableOpacity onPress={() => setSelectedPhoto(uri)}>
                  <Image source={{ uri }} style={styles.photo} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(uri)}
                >
                  <Text style={styles.deleteTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
              <Text style={styles.addTxt}>➕ Додати фото</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* =========================
          FULLSCREEN MODAL
      ========================= */}
      <Modal visible={!!selectedPhoto} transparent>
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>

          <Image source={{ uri: selectedPhoto }} style={styles.fullImage} />
        </View>
      </Modal>
    </>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  headerCard: {
    padding: 20,
    backgroundColor: '#f5f7fa',
    margin: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  title: { fontSize: 24, fontWeight: '700' },
  continent: { fontSize: 14, color: '#666', marginTop: 6 },
  status: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  date: { fontSize: 13, color: '#2e7d32', marginTop: 6 },

  hint: { textAlign: 'center', marginVertical: 8 },
  stats: { padding: 16, alignItems: 'center' },
  statsTxt: { fontSize: 16, fontWeight: '600' },

  card: {
    backgroundColor: '#f7f7f7',
    margin: 12,
    padding: 14,
    borderRadius: 10,
  },

  cardTitle: { fontWeight: '700', marginBottom: 8 },

  regionItem: { paddingVertical: 4 },

  noteInput: {
    minHeight: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },

  empty: { color: '#999' },

  photoWrapper: {
    marginBottom: 12,
    position: 'relative',
  },

  photo: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },

  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 8,
  },

  deleteTxt: { color: '#fff' },

  addBtn: {
    marginTop: 10,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },

  addTxt: { fontWeight: '600' },

  modal: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },

  fullImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },

  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },

  // === Deep Link Share ===
  shareBtn: {
    alignSelf: 'center',
    backgroundColor: '#5f5df8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },

  shareTxt: { color: '#fff', fontWeight: '700' },
});