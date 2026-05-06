import Country from '../models/Country';
import * as storage from '../utils/storage';
import * as countriesApi from '../api/countriesApi';
import NetInfo from '@react-native-community/netinfo';

export default class CountryRepository {
  constructor(storageModule = storage, apiModule = countriesApi) {
    this.storage = storageModule;
    this.api = apiModule;
    this.collection = storage.COLLECTIONS.COUNTRIES;
    this.onSyncComplete = null;
  }

  // ==========================================================
  // ЛОКАЛЬНІ 4 CRUD ОПЕРАЦІЇ (викликаються UI)
  // ==========================================================

  async getAll() {
    const raw = await this.storage.getList(this.collection);
    return (Array.isArray(raw) ? raw : [])
      .filter(obj => obj && obj.id)
      .map((obj) => Country.fromJSON(obj));
  }

  async getById(id) {
    const obj = await this.storage.getItem(this.collection, id);
    return obj ? Country.fromJSON(obj) : null;
  }

  async save(country) {
    if (!(country instanceof Country)) {
      country = Country.fromJSON(country);
    }
    // Спочатку зберігаємо локально (offline-first)
    country.syncStatus = 'pending';
    await this.storage.saveItem(this.collection, country.toJSON());

    // Тепер пробуємо синхронізувати — але БЕЗ помилок якщо нема мережі
    this._safeSyncCountry(country);
    return country;
  }

  async delete(id) {
    const existed = await this.storage.deleteItem(this.collection, id);
    if (existed) {
      this._safeDeleteOnServer(id);
    }
    return existed;
  }


  async _safeSyncCountry(country) {
    try {
      // 1. Перевіряємо мережу ДО запиту
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;

      if (!isOnline) {
        // Тихо виходимо — запис лишається 'pending', потім автосинхронізація допоможе
        return;
      }

      // 2. Тільки якщо мережа є — пробуємо синхронізувати
      await this.syncCountry(country);
    } catch (e) {
      // На всякий випадок проковтуємо помилки — фон не повинен ламати UI
      console.warn('[Repo] safe sync failed:', e.message);
    }
  }

  async _safeDeleteOnServer(id) {
    try {
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) return;

      await this.api.deleteVisitedCountry(id);
    } catch (e) {
      console.warn('[Repo] safe delete failed:', e.message);
    }
  }

  /**
   * Синхронізувати один запис з сервером.
   * Викликається з _safeSyncCountry або з syncPending.
   */
  async syncCountry(country) {
    try {
      if (!country.visited && !country.isDream) return;

      const safeCountry = {
        ...country,
        note: country.note || '',
        photos: Array.isArray(country.photos) ? country.photos : [],
        dateVisited: country.dateVisited instanceof Date ? country.dateVisited : null,
      };
      const response = await this.api.upsertCountry(safeCountry);

      const updated = await this.getById(country.id);
      if (updated) {
        updated.markSynced();
        await this.storage.saveItem(this.collection, updated.toJSON());
        this.onSyncComplete?.();
      }
      return response;
    } catch (e) {
      try {
        const failed = await this.getById(country.id);
        if (failed) {
          failed.markError();
          await this.storage.saveItem(this.collection, failed.toJSON());
        }
      } catch (_) {}
      throw e;
    }
  }

  /**
   * Pull-синхронізація: тягне всі країни з Supabase і кладе у локалку.
   */
  async pullFromServer() {
    try {
      // Перевіряємо мережу
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) return { synced: 0 };

      const remote = await this.api.fetchVisitedCountries();
      if (!Array.isArray(remote)) return { synced: 0 };

      let count = 0;
      for (const remoteItem of remote) {
        if (!remoteItem || !remoteItem.id) continue;

        const existing = await this.storage.getItem(this.collection, remoteItem.id);
        const merged = {
          ...(existing || {}),
          ...remoteItem,
          // Зберігаємо локальні фото — вони не йдуть на сервер у цій версії
          photos: existing?.photos || remoteItem.photos || [],
          syncStatus: 'synced',
        };
        await this.storage.saveItem(this.collection, merged);
        count++;
      }
      this.onSyncComplete?.();
      return { synced: count };
    } catch (e) {
      console.warn('pullFromServer failed:', e.message);
      return { synced: 0 };
    }
  }

  /**
   * Старий метод getAllWithBackgroundSync — залишений для сумісності.
   */
  async getAllWithBackgroundSync(onRemoteUpdate) {
    const local = await this.getAll();
    this.pullFromServer()
      .then(async () => {
        const updated = await this.getAll();
        onRemoteUpdate?.(updated);
      })
      .catch((e) => {
        console.warn('Background fetch failed:', e.message);
      });
    return local;
  }

  /**
   * Синхронізувати всі 'pending' / 'error' записи з сервером.
   * Викликається при появі мережі (через NetInfo listener у TravelContext).
   */
  async syncPending() {
    try {
      // Перевіряємо мережу — нема сенсу пробувати без інтернету
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) return { synced: 0, failed: 0 };

      const all = await this.getAll();
      if (!Array.isArray(all)) return { synced: 0, failed: 0 };

      const pending = all.filter((c) => c && typeof c.needsSync === 'function' && c.needsSync());

      const results = { synced: 0, failed: 0 };
      for (const c of pending) {
        try {
          await this.syncCountry(c);
          results.synced++;
        } catch {
          results.failed++;
        }
      }
      return results;
    } catch (e) {
      console.warn('syncPending failed:', e.message);
      return { synced: 0, failed: 0 };
    }
  }
}