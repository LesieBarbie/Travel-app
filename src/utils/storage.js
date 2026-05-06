import AsyncStorage from '@react-native-async-storage/async-storage';

export const COLLECTIONS = {
  COUNTRIES: 'countries',         // відвідані + мрії
  ACHIEVEMENTS: 'achievements',   // отримані ачівки
  PROFILE: 'profile',             // одиничний об'єкт UserProfile
  REGIONS: 'regions',             // {countryId: [regionName, ...]}
};

// Ключі для метаданих (сингл-значень, а не колекцій)
export const META_KEYS = {
  NOTIFIED_ACHIEVEMENTS: 'notified_achievements',
  LAST_SYNC: 'last_sync',
};

const collectionKey = (name) => `collection:${name}`;

/**
 * CRUD-1: Зберегти один об'єкт у колекції (create або update).
 * Якщо об'єкт з таким id вже існує — замінюється; інакше додається.
 */
export async function saveItem(collectionName, item) {
  if (!item?.id && item?.id !== 0) {
    throw new Error('saveItem: object must have an "id" field');
  }
  try {
    const list = await getList(collectionName);
    const idx = list.findIndex((x) => String(x.id) === String(item.id));
    const updatedList = idx >= 0
      ? [...list.slice(0, idx), item, ...list.slice(idx + 1)]
      : [...list, item];
    await AsyncStorage.setItem(collectionKey(collectionName), JSON.stringify(updatedList));
    return item;
  } catch (e) {
    console.warn('saveItem error', collectionName, e);
    throw e;
  }
}

/**
 * CRUD-2: Прочитати весь список (колекцію).
 */
export async function getList(collectionName) {
  try {
    const raw = await AsyncStorage.getItem(collectionKey(collectionName));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('getList error', collectionName, e);
    return [];
  }
}

/**
 * CRUD-3: Прочитати один об'єкт за id.
 * Повертає null, якщо не знайдено.
 */
export async function getItem(collectionName, id) {
  try {
    const list = await getList(collectionName);
    return list.find((x) => String(x.id) === String(id)) || null;
  } catch (e) {
    console.warn('getItem error', collectionName, id, e);
    return null;
  }
}

/**
 * CRUD-4: Видалити один об'єкт за id.
 * Повертає true якщо видалено, false якщо не було знайдено.
 */
export async function deleteItem(collectionName, id) {
  try {
    const list = await getList(collectionName);
    const filtered = list.filter((x) => String(x.id) !== String(id));
    if (filtered.length === list.length) return false;
    await AsyncStorage.setItem(collectionKey(collectionName), JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.warn('deleteItem error', collectionName, id, e);
    return false;
  }
}

/**
 * Замінити всю колекцію одним викликом (використовується при синхронізації з сервером).
 */
export async function replaceList(collectionName, list) {
  try {
    await AsyncStorage.setItem(collectionKey(collectionName), JSON.stringify(list));
  } catch (e) {
    console.warn('replaceList error', collectionName, e);
  }
}

/**
 * Видалити всю колекцію.
 */
export async function clearCollection(collectionName) {
  try {
    await AsyncStorage.removeItem(collectionKey(collectionName));
  } catch (e) {
    console.warn('clearCollection error', collectionName, e);
  }
}

// --- Метадані (сингл-значення) ---

export async function loadMeta(key, defaultValue = null) {
  try {
    const raw = await AsyncStorage.getItem(`meta:${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('loadMeta error', key, e);
    return defaultValue;
  }
}

export async function saveMeta(key, value) {
  try {
    await AsyncStorage.setItem(`meta:${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('saveMeta error', key, e);
  }
}


const LEGACY_KEYS = {
  VISITED: 'visited_countries',
  DREAM: 'dream_countries',
  REGIONS: 'visited_regions',
  PROFILE: 'user_profile',
};

export async function loadData(key, defaultValue) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('loadData error', key, e);
    return defaultValue;
  }
}

export async function saveData(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('saveData error', key, e);
  }
}

export { LEGACY_KEYS as KEYS };
