import { apiClient } from './client';
import { ACHIEVEMENTS } from '../data/achievements';
export async function fetchAllAchievements() {
  return apiClient.get('/achievements', () => {
    return ACHIEVEMENTS.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
    }));
  });
}

export async function fetchUnlockedAchievements() {
  return apiClient.get('/users/me/achievements', () => []);
}

export async function postUnlockedAchievement(achievement) {
  return apiClient.post('/users/me/achievements', {
    achievementId: achievement.id,
    unlockedAt: achievement.unlockedAt?.toISOString?.() || new Date().toISOString(),
  }, (body) => ({
    id: body.achievementId,
    unlockedAt: body.unlockedAt,
    syncStatus: 'synced',
  }));
}
