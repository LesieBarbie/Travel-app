import Achievement from '../models/Achievement';
import * as storage from '../utils/storage';
import { supabase } from '../api/supabaseClient';
import { ACHIEVEMENTS } from '../data/achievements';

export default class AchievementRepository {
  constructor(storageModule = storage) {
    this.storage = storageModule;
    this.collection = storage.COLLECTIONS.ACHIEVEMENTS;
  }

  async getAll() {
    const raw = await this.storage.getList(this.collection);
    return raw.map((obj) => Achievement.fromJSON(obj));
  }

  async getById(id) {
    const obj = await this.storage.getItem(this.collection, id);
    return obj ? Achievement.fromJSON(obj) : null;
  }

  async save(achievement) {
    if (!(achievement instanceof Achievement)) {
      achievement = Achievement.fromJSON(achievement);
    }
    // 1. Локально
    await this.storage.saveItem(this.collection, achievement.toJSON());

    // 2. Supabase — щоб друзі бачили в стрічці
    this._syncToSupabase(achievement).catch((e) =>
      console.warn('[AchievementRepo] sync failed:', achievement.id, e.message)
    );

    return achievement;
  }

  async delete(id) {
    return this.storage.deleteItem(this.collection, id);
  }

  async _syncToSupabase(achievement) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const meta = ACHIEVEMENTS.find(a => a.id === achievement.id);
      const title = meta?.title || achievement.title || achievement.id;

      const { error } = await supabase
        .from('achievement_unlocks')
        .upsert(
          {
            user_id: user.id,
            achievement_id: achievement.id,
            achievement_title: title,
            created_at: achievement.unlockedAt instanceof Date
              ? achievement.unlockedAt.toISOString()
              : (achievement.unlockedAt || new Date().toISOString()),
          },
          { onConflict: 'user_id,achievement_id' }
        );

      if (error) {
        console.warn('[AchievementRepo] upsert error:', error.message);
      } else {
        console.log('[AchievementRepo] synced to Supabase:', achievement.id);
      }
    } catch (e) {
      console.warn('[AchievementRepo] _syncToSupabase error:', e.message);
    }
  }
}