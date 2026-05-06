import UserProfile from '../models/UserProfile';
import * as storage from '../utils/storage';
import * as profileApi from '../api/profileApi';

export default class UserProfileRepository {
  constructor(storageModule = storage, apiModule = profileApi) {
    this.storage = storageModule;
    this.api = apiModule;
    this.collection = storage.COLLECTIONS.PROFILE;
    this.profileId = 'me';
  }

  async get() {
    const obj = await this.storage.getItem(this.collection, this.profileId);
    return obj ? UserProfile.fromJSON(obj) : null;
  }

  async save(profile) {
    const obj = { ...profile.toJSON(), id: this.profileId };
    await this.storage.saveItem(this.collection, obj);
    // Фонова синхронізація
    this.api.putProfile(profile).catch((e) =>
      console.warn('Profile sync failed:', e.message)
    );
    return profile;
  }

  async delete() {
    return this.storage.deleteItem(this.collection, this.profileId);
  }

  /**
   * Offline-first сценарій: читаємо локальне, паралельно тягнемо з сервера,
   * якщо сервер повернув свіжіші дані — оновлюємо.
   */
  async getWithSync(onRemoteUpdate) {
    const local = await this.get();

    this.api.fetchProfile()
      .then(async (remote) => {
        if (remote && local) {
          // Тут у реальному додатку було б порівняння updatedAt
          // Для простоти вважаємо що сервер завжди має рацію щодо name/settings
          const merged = new UserProfile(
            remote.name || local.name,
            local.visitedCount,
            local.dreamCount,
            local.worldPercent,
            local.achievementsUnlocked,
            remote.notificationsEnabled ?? local.notificationsEnabled,
            remote.joinedAt ? new Date(remote.joinedAt) : local.joinedAt
          );
          await this.save(merged);
          onRemoteUpdate?.(merged);
        }
      })
      .catch((e) => console.warn('Profile fetch failed:', e.message));

    return local;
  }
}
