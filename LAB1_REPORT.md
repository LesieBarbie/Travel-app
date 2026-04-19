# 📚 Лабораторна №1 — відповідність критеріям

Цей документ показує, як кожна вимога лаби реалізована в коді проекту.

---

## ✅ Моделі (2-3 сутності як класи з конструктором)

Реалізовано **3 моделі** у папці `src/models/`:

### 1. `src/models/Country.js` — Країна

Поля:
- `id: string` — ISO-код країни
- `name: string` — назва
- `continent: string` — континент
- `visited: boolean` — чи відвідана
- `isDream: boolean` — чи у мріях
- `dateVisited: Date | null` — дата відвідування
- `note: string` — нотатка

**7 полів, 4 різні типи** (string, boolean, Date, null). Є конструктор, методи `fromJSON`/`toJSON`, `getStatus()`, `getDaysSinceVisit()`.

### 2. `src/models/Achievement.js` — Досягнення

Поля:
- `id: string`
- `title: string`
- `description: string`
- `icon: string`
- `requiredCount: number`
- `unlocked: boolean`
- `unlockedAt: Date | null`

**7 полів, 4 типи** (string, number, boolean, Date). Конструктор, методи `unlock()`, `getProgress()`.

### 3. `src/models/UserProfile.js` — Профіль користувача

Поля:
- `name: string`
- `visitedCount: number`
- `dreamCount: number`
- `worldPercent: number`
- `achievementsUnlocked: number`
- `notificationsEnabled: boolean`
- `joinedAt: Date`

**7 полів, 4 типи** (string, number, boolean, Date). Конструктор, методи `getRank()`, `getDaysActive()`.

Кожен файл моделі починається з JSDoc-коментаря, що ця сутність представляє.

---

## ✅ Екрани (3-5 екранів + навігація)

Реалізовано **5 екранів** у `src/screens/`:

1. **MapScreen.js** — головний екран з інтерактивною картою світу
2. **CountriesListScreen.js** — **екран списку** через `FlatList`
3. **CountryDetailScreen.js** — **екран деталі** однієї країни
4. **AchievementsScreen.js** — список досягнень
5. **ProfileScreen.js** — профіль користувача

### Навігація

Реалізована в `App.js`:
- **Нижня панель вкладок** (`createBottomTabNavigator`) з 4 розділами: Мапа / Список / Досягнення / Профіль
- **Stack-навігатор** для переходу Список → Деталь і Мапа → Деталь (`createNativeStackNavigator`)
- **Повернення назад** — автоматично через header кнопку stack-навігатора
- **Перехід список → деталь** — у `CountriesListScreen.js`, функція `openDetail()` викликає `navigation.navigate('CountryDetail', { countryId, name })`

---

## ✅ Зв'язок моделей з UI

### `CountriesListScreen.js` (екран списку)

```javascript
const countries = useMemo(() => {
  return COUNTRIES.map((c) => {
    // ...
    return new Country(c.id, c.name, c.continent, !!v, !!d, ...);
  });
}, [visited, dream]);

// Рендер елемента:
const renderItem = ({ item }) => (
  <TouchableOpacity onPress={() => openDetail(item)}>
    <Text>{item.name}</Text>
    <Text>{item.continent}</Text>
    <Text>{item.getStatus()}</Text>
    {item.dateVisited && <Text>{item.dateVisited.toLocaleDateString('uk-UA')}</Text>}
  </TouchableOpacity>
);
```

Дані у UI беруться з **полів і методів** екземпляра моделі `Country`.

### `ProfileScreen.js`

```javascript
const profile = useMemo(() => {
  return new UserProfile('Мандрівник', visited.length, dream.length, ...);
}, [...]);

// У UI:
<Text>{profile.name}</Text>
<Text>{profile.getRank()}</Text>
<Text>{profile.visitedCount} країн • {profile.worldPercent}% світу</Text>
```

### `AchievementsScreen.js`

```javascript
const items = useMemo(() => {
  return ACHIEVEMENTS.map((a) => new Achievement(a.id, a.title, ...));
}, [...]);

items.map((a) => (
  <View>
    <Text>{a.icon}</Text>
    <Text>{a.title}</Text>
    <Text>{a.description}</Text>
  </View>
));
```

---

## 📂 Структура файлів проекту

```
travel-app/
├── App.js                          ← точка входу, навігація
├── src/
│   ├── models/                     ← МОДЕЛІ (нові для лаби)
│   │   ├── Country.js
│   │   ├── Achievement.js
│   │   └── UserProfile.js
│   ├── screens/                    ← ЕКРАНИ
│   │   ├── MapScreen.js
│   │   ├── CountriesListScreen.js  ← список через FlatList
│   │   ├── CountryDetailScreen.js  ← деталі
│   │   ├── AchievementsScreen.js
│   │   └── ProfileScreen.js
│   ├── components/                 ← переспользовані компоненти
│   ├── context/                    ← глобальний state
│   ├── data/                       ← статичні дані
│   └── utils/                      ← утиліти
```

---

## 🎯 Перевірка критеріїв

| Вимога | Файл | Статус |
|---|---|---|
| 2-3 моделі | `src/models/*.js` | ✅ 3 моделі |
| ≥4 полів різних типів | Country, Achievement, UserProfile | ✅ 7 полів, 4 типи |
| Конструктор | Кожна модель | ✅ |
| Коментар про сутність | JSDoc у кожному файлі | ✅ |
| 3-5 екранів | `src/screens/*.js` | ✅ 5 екранів |
| Екран списку (FlatList) | `CountriesListScreen.js` | ✅ |
| Екран деталі | `CountryDetailScreen.js` | ✅ |
| Додатковий екран | Achievements + Profile | ✅ |
| Перехід список → деталь | `navigation.navigate('CountryDetail')` | ✅ |
| Повернення назад | Stack header back button | ✅ |
| Нижні вкладки | `createBottomTabNavigator` | ✅ |
| Дані з моделей у UI | List/Profile/Achievements screens | ✅ |
