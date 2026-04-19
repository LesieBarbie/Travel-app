/**
 * Модель Achievement (Досягнення).
 *
 * Сутність представляє одне досягнення ("ачівку"), яке користувач
 * може отримати за певні дії у застосунку - наприклад, відвідати
 * першу країну, 10 країн, усю Європу тощо.
 */
export default class Achievement {
  /**
   * @param {string} id - унікальний ідентифікатор досягнення
   * @param {string} title - назва досягнення
   * @param {string} description - опис умови отримання
   * @param {string} icon - емодзі-іконка
   * @param {number} requiredCount - потрібна кількість (країн, континентів тощо)
   * @param {boolean} unlocked - чи розблоковано досягнення
   * @param {Date|null} unlockedAt - дата отримання (null якщо не отримано)
   */
  constructor(id, title, description, icon, requiredCount, unlocked = false, unlockedAt = null) {
    this.id = id;                     // string
    this.title = title;               // string
    this.description = description;   // string
    this.icon = icon;                 // string
    this.requiredCount = requiredCount; // number
    this.unlocked = unlocked;         // boolean
    this.unlockedAt = unlockedAt;     // Date | null
  }

  /**
   * Створює екземпляр з plain-об'єкта.
   */
  static fromJSON(obj) {
    return new Achievement(
      obj.id,
      obj.title,
      obj.description,
      obj.icon,
      obj.requiredCount ?? 0,
      obj.unlocked ?? false,
      obj.unlockedAt ? new Date(obj.unlockedAt) : null
    );
  }

  /**
   * Серіалізує для збереження.
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      icon: this.icon,
      requiredCount: this.requiredCount,
      unlocked: this.unlocked,
      unlockedAt: this.unlockedAt ? this.unlockedAt.toISOString() : null,
    };
  }

  /**
   * Позначити як розблоковане прямо зараз.
   */
  unlock() {
    this.unlocked = true;
    this.unlockedAt = new Date();
  }

  /**
   * Прогрес до розблокування (у відсотках).
   */
  getProgress(currentCount) {
    if (this.requiredCount === 0) return this.unlocked ? 100 : 0;
    return Math.min(100, (currentCount / this.requiredCount) * 100);
  }
}
