import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { useTravel } from '../context/TravelContext';
import { Modal } from 'react-native';
import * as FileSystem from 'expo-file-system';


export default function RegionDetailScreen({ route }) {
  const { countryId, regionName } = route.params;
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const {
    regions,
    updateRegionNote,
    addRegionPhoto,
    removeRegionPhoto,
  } = useTravel();

  // =========================
  // 🔥 REGION SAFE ACCESS
  // =========================
  const region = useMemo(() => {
    const list = regions?.[countryId] || [];

    const found = list.find((r) => r.name === regionName);

    return (
      found || {
        name: regionName,
        note: '',
        photos: [],
      }
    );
  }, [regions, countryId, regionName]);

  const photos = Array.isArray(region.photos) ? region.photos : [];

  // =========================
  // 📸 PICK IMAGE
  // =========================
  const pickImage = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Немає доступу');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const originalUri = result.assets[0].uri;

      const newPath =
        FileSystem.documentDirectory +
        'photos/' +
        Date.now() +
        '.jpg';

      const dir = FileSystem.documentDirectory + 'photos/';

const dirInfo = await FileSystem.getInfoAsync(dir);

if (!dirInfo.exists) {
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

      await FileSystem.copyAsync({
        from: originalUri,
        to: newPath,
      });

      addRegionPhoto(countryId, regionName, newPath);
    }
  } catch (e) {
    console.log(e);
    Alert.alert('Помилка', 'Не вдалося обрати фото');
  }
};
  // =========================
  // DELETE
  // =========================
  const handleDelete = (uri) => {
    Alert.alert('Видалити фото?', 'Цю дію не можна скасувати', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => removeRegionPhoto(countryId, regionName, uri),
      },
    ]);
  };

  return (
  <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* HEADER */}
      <Text style={styles.title}>{region.name}</Text>

      {/* NOTE */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Нотатка</Text>

        <TextInput
          style={styles.input}
          placeholder="Напиши свої враження..."
          multiline
          value={region.note || ''}
          onChangeText={(text) =>
            updateRegionNote(countryId, regionName, text)
          }
        />
      </View>

{/* PHOTOS */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>📸 Фото</Text>

  {(!photos || photos.length === 0) && (
    <Text style={styles.empty}>Поки що немає фото</Text>
  )}

  {Array.isArray(photos) &&
    photos.map((uri, index) => {
      if (!uri) return null;

      return (
        <View key={`photo-${index}`} style={styles.photoWrapper}>
          
          {/* 🔥 КЛИК ПО ФОТО */}
          <TouchableOpacity onPress={() => setSelectedPhoto(uri)}>
            <Image source={{ uri }} style={styles.photo} />
          </TouchableOpacity>

          {/* 🔥 УДАЛЕНИЕ */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(uri)}
          >
            <Text style={styles.deleteTxt}>✕</Text>
          </TouchableOpacity>

        </View>
      );
    })}

  {/* КНОПКА ДОБАВЛЕНИЯ */}
  <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
    <Text style={styles.addTxt}>➕ Додати фото</Text>
  </TouchableOpacity>
</View>
    </ScrollView>

    {/* =========================
        🔥 FULLSCREEN MODAL
    ========================= */}
    <Modal visible={!!selectedPhoto} transparent>
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center' }}>
        
        <TouchableOpacity
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
          onPress={() => setSelectedPhoto(null)}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
        </TouchableOpacity>

        <Image
          source={{ uri: selectedPhoto }}
          style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
        />
      </View>
    </Modal>
  </>
);
}

// =========================
// 🎨 STYLES
// =========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },

  card: {
    backgroundColor: '#f7f7f7',
    margin: 12,
    padding: 14,
    borderRadius: 10,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },

  input: {
    minHeight: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },

  empty: {
    color: '#999',
    marginBottom: 10,
  },

  photoWrapper: {
    marginBottom: 12,
    position: 'relative',
  },

photo: {
  width: '100%',
  height: 200,
  borderRadius: 10,
  resizeMode: 'contain', // 🔥 ВАЖНО
},

  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  deleteTxt: {
    color: '#fff',
    fontSize: 16,
  },

  addBtn: {
    marginTop: 10,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },

  addTxt: {
    fontWeight: '600',
  },
});