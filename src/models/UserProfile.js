export default class UserProfile {
  /**
   * @param {string} name - ім'я користувача
   * @param {number} visitedCount - кількість відвіданих країн
   * @param {number} dreamCount - кількість країн у списку мрій
   * @param {number} worldPercent - відсоток світу, який користувач відвідав
   * @param {number} achievementsUnlocked - кількість отриманих досягнень
   * @param {boolean} notificationsEnabled - чи увімкнено сповіщення
   * @param {Date} joinedAt - дата першого запуску застосунку
   */
  constructor(
    name,
    visitedCount = 0,
    dreamCount = 0,
    worldPercent = 0,
    achievementsUnlocked = 0,
    notificationsEnabled = true,
    joinedAt = new Date()
  ) {
    this.name = name;                                 // string
    this.visitedCount = visitedCount;                 // number
    this.dreamCount = dreamCount;                     // number
    this.worldPercent = worldPercent;                 // number
    this.achievementsUnlocked = achievementsUnlocked; // number
    this.notificationsEnabled = notificationsEnabled; // boolean
    this.joinedAt = joinedAt;                         // Date
  }

  /**
   * Створює з plain-об'єкта.
   */
  static fromJSON(obj) {
    return new UserProfile(
      obj.name || 'Мандрівник',
      obj.visitedCount ?? 0,
      obj.dreamCount ?? 0,
      obj.worldPercent ?? 0,
      obj.achievementsUnlocked ?? 0,
      obj.notificationsEnabled ?? true,
      obj.joinedAt ? new Date(obj.joinedAt) : new Date()
    );
  }

  /**
   * Серіалізує для збереження.
   */
  toJSON() {
    return {
      name: this.name,
      visitedCount: this.visitedCount,
      dreamCount: this.dreamCount,
      worldPercent: this.worldPercent,
      achievementsUnlocked: this.achievementsUnlocked,
      notificationsEnabled: this.notificationsEnabled,
      joinedAt: this.joinedAt.toISOString(),
    };
  }

  /**
   * Ранг користувача залежно від кількості відвіданих країн.
   */
  getRank() {
    if (this.visitedCount >= 100) return '🏆 Легенда';
    if (this.visitedCount >= 50) return '🌍 Глобтротер';
    if (this.visitedCount >= 25) return '🗺️ Досвідчений';
    if (this.visitedCount >= 10) return '✈️ Мандрівник';
    if (this.visitedCount >= 1) return '🎒 Початківець';
    return '🧭 Новачок';
  }

  /**
   * Скільки днів користувач користується застосунком.
   */
  getDaysActive() {
    const diffMs = Date.now() - this.joinedAt.getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }
}
