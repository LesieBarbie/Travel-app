import Country from '../models/Country';
import * as storage from '../utils/storage';
import * as countriesApi from '../api/countriesApi';

/**
 * ============================================================
 * CountryRepository (Offline-first з реальним Supabase API)
 * ============================================================
 *
 * Реалізує патерн Repository: єдина точка доступу до даних про країни.
 * Приховує від бізнес-логіки те, звідки саме беруться дані — локальне
 * сховище чи сервер.
 *
 * СТРАТЕГІЯ: Offline-first
 * ------------------------
 * - UI завжди читає з локального сховища → миттєва відповідь, працює без інтернету.
 * - Зміни спочатку зберігаються локально з syncStatus='pending'.
 * - Паралельно запускаються фонові запити до Supabase.
 * - При успіху сервера — оновлюємо локальний запис з syncStatus='synced'.
 * - При помилці — syncStatus='error', запис залишається у черзі на пізніше.
 *
 * Залежності:
 *  - storage: утиліти з 4 CRUD операціями (getList, getItem, saveItem, deleteItem)
 *  - api:     модуль мережевих викликів (countriesApi → Supabase)
 */
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

  /** Прочитати список усіх позначених країн (відвідані + мрії). */
  async getAll() {
    const raw = await this.storage.getList(this.collection);
    return (Array.isArray(raw) ? raw : [])
      .filter(obj => obj && obj.id)
      .map((obj) => Country.fromJSON(obj));
  }

  /** Прочитати одну країну за id. */
  async getById(id) {
    const obj = await this.storage.getItem(this.collection, id);
    return obj ? Country.fromJSON(obj) : null;
  }

  /** Зберегти одну країну (create або update). */
  async save(country) {
    if (!(country instanceof Country)) {
      country = Country.fromJSON(country);
    }
    // Спочатку зберігаємо локально (offline-first)
    country.syncStatus = 'pending';
    await this.storage.saveItem(this.collection, country.toJSON());

    // Відразу запускаємо синхронізацію (не блокуємо UI)
    this.syncCountry(country).catch((e) =>
      console.warn('Background sync failed', country.id, e.message)
    );
    return country;
  }

  /** Видалити країну за id. */
  async delete(id) {
    const existed = await this.storage.deleteItem(this.collection, id);
    if (existed) {
      // Асинхронно повідомляємо сервер
      this.api.deleteVisitedCountry(id).catch((e) =>
        console.warn('Failed to delete on server', id, e.message)
      );
    }
    return existed;
  }

  // ==========================================================
  // СИНХРОНІЗАЦІЯ З SUPABASE
  // ==========================================================

  /**
   * Синхронізувати один запис з сервером.
   * Викликається автоматично при save().
   */
  async syncCountry(country) {
    try {
      // Синхронізуємо тільки visited або dream записи
      if (!country.visited && !country.isDream) return;

      // Нормалізуємо перед відправкою — захист від undefined полів
      const safeCountry = {
        ...country,
        note: country.note || '',
        photos: Array.isArray(country.photos) ? country.photos : [],
        dateVisited: country.dateVisited instanceof Date ? country.dateVisited : null,
      };
      const response = await this.api.upsertCountry(safeCountry);

      // Сервер підтвердив → оновлюємо syncStatus локально
      const updated = await this.getById(country.id);
      if (updated) {
        updated.markSynced();
        await this.storage.saveItem(this.collection, updated.toJSON());
        // Повідомляємо UI що синхронізація завершена
        this.onSyncComplete?.();
      }
      return response;
    } catch (e) {
      // Помилка мережі → позначаємо як error, спробуємо пізніше
      try {
        const failed = await this.getById(country.id);
        if (failed) {
          failed.markError();
          await this.storage.saveItem(this.collection, failed.toJSON());
        }
      } catch (_) {}
      // не кидаємо далі — фонова помилка не повинна ламати UI
    }
  }

  /**
   * Pull-синхронізація: тягне всі країни з Supabase і кладе у локалку.
   * Викликається після логіну з нового пристрою.
   */
  async pullFromServer() {
    try {
      const remote = await this.api.fetchVisitedCountries();
      if (!Array.isArray(remote)) return { synced: 0 };

      let count = 0;
      for (const remoteItem of remote) {
        if (!remoteItem || !remoteItem.id) continue;

        // Зберігаємо в локалку як synced
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
      throw e;
    }
  }

  /**
   * Старий метод getAllWithBackgroundSync — залишений для сумісності.
   * Тепер просто читає локалку і викликає pullFromServer у фоні.
   */
  async getAllWithBackgroundSync(onRemoteUpdate) {
    // 1. Одразу повертаємо локальне
    const local = await this.getAll();

    // 2. У фоні тягнемо з сервера
    this.pullFromServer()
      .then(async () => {
        const updated = await this.getAll();
        onRemoteUpdate?.(updated);
      })
      .catch((e) => {
        console.warn('Background fetch failed:', e.message);
        // Нічого не робимо - працюємо з локальних даних
      });

    return local;
  }

  /**
   * Синхронізувати всі 'pending' / 'error' записи з сервером.
   * Викликається при появі мережі або з кнопки "Синхронізувати зараз".
   */
  async syncPending() {
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
  }
}