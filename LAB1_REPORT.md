<<<<<<< HEAD
# 🗺️ Travel Wish Map

Мобільний застосунок для мандрівників: познач країни, де вже був, додавай країни-мрії, відстежуй прогрес по світу та отримуй досягнення.

> **Лабораторна робота №1** — закладення технічної основи застосунку: моделі даних та навігація.
=======
# 📚 Лабораторна №1 
>>>>>>> f7f73f4405352c4a3dd711dc8baa54ac912b3b04

---

## 📋 Зміст

- [Про застосунок](#про-застосунок)
- [Стек технологій](#стек-технологій)
- [Структура проекту](#структура-проекту)
- [Екрани](#екрани)
- [Моделі даних](#моделі-даних)
- [Навігація](#навігація)
- [Встановлення та запуск](#встановлення-та-запуск)
- [Виконання вимог лабораторної](#виконання-вимог-лабораторної)

---

## Про застосунок

**Travel Wish Map** — це інтерактивна мапа світу, на якій користувач позначає країни у двох категоріях:
- ✅ **Відвідані** — де вже був
- 💭 **Мрії** — куди хоче поїхати

Застосунок автоматично рахує відсоток пройденого світу, видає досягнення за етапи (перша країна, 10 країн, уся Європа тощо) та надсилає локальні push-сповіщення про нові ачівки. Для дев'яти країн (🇩🇪 Німеччина, 🇨🇭 Швейцарія, 🇺🇸 США, 🇺🇦 Україна, 🇫🇷 Франція, 🇮🇹 Італія, 🇪🇸 Іспанія, 🇬🇧 Велика Британія, 🇵🇱 Польща) доступна детальна карта з регіонами.

---

## Стек технологій

| Категорія | Технологія |
|---|---|
| Фреймворк | React Native + Expo SDK 54 |
| Мова | JavaScript (ES6+) |
| Навігація | React Navigation (Bottom Tabs + Native Stack) |
| Карти | `react-native-svg` + `d3-geo` + `topojson-client` |
| Жести | `react-native-gesture-handler` |
| Сховище | `@react-native-async-storage/async-storage` |
| Сповіщення | `expo-notifications` |
| Стан | React Context API |

---

## Структура проекту

```
Travel-app/
├── App.js                              ← точка входу, навігація, провайдери
├── package.json
├── LAB1_REPORT.md                      ← звіт по лабі 1
├── README.md                           ← цей файл
└── src/
    ├── models/                         ← моделі даних (класи)
    │   ├── Country.js                  ← модель Країна
    │   ├── Achievement.js              ← модель Досягнення
    │   └── UserProfile.js              ← модель Профіль користувача
    ├── screens/                        ← екрани застосунку
    │   ├── MapScreen.js                ← інтерактивна мапа світу
    │   ├── CountriesListScreen.js      ← список країн (FlatList)
    │   ├── CountryDetailScreen.js      ← деталі обраної країни
    │   ├── AchievementsScreen.js       ← список досягнень
    │   └── ProfileScreen.js            ← профіль зі статистикою
    ├── components/                     ← багаторазові UI-компоненти
    │   ├── WorldMapSvg.js              ← SVG-мапа світу з pan/zoom
    │   ├── CountryRegionMap.js         ← SVG-мапа регіонів країни
    │   ├── AchievementToast.js         ← toast-сповіщення про ачівку
    │   └── ProgressBar.js              ← прогрес-бар
    ├── context/
    │   └── TravelContext.js            ← глобальний стан, відстеження ачівок
    ├── data/                           ← статичні дані
    │   ├── countries.js                ← список країн, континенти, URL регіонів
    │   └── achievements.js             ← список умов для досягнень
    └── utils/
        ├── storage.js                  ← обгортка над AsyncStorage
        └── notifications.js            ← локальні push-сповіщення
```

---

## Екрани

### 🗺️ Мапа (`MapScreen.js`)
Головний екран із SVG-мапою світу. Підтримує pan одним пальцем, pinch-to-zoom двома, тап по країні додає/видаляє позначку. Внизу — прогрес-бари по світу та континентах. Перемикач режимів «Відвідані / Мрії».

### 📋 Список (`CountriesListScreen.js`) — **екран списку**
`FlatList` з усіма країнами. Має:
- **Пошук** за назвою або континентом
- **Фільтри**: Усі / Відвідані / Мрії
- Сортування: відвідані зверху, далі мрії, далі інші
- Тап на елемент → перехід на екран деталі

Кожен елемент списку — це екземпляр моделі `Country`, рендер використовує її поля (`name`, `continent`, `dateVisited`) та методи (`getStatus()`, `getDaysSinceVisit()`).

### 📍 Деталі країни (`CountryDetailScreen.js`) — **екран деталі**
Детальний перегляд обраної країни. Показує:
- Назву, континент, статус (відвідана / мрія / не позначено)
- Дату відвідування та скільки днів тому
- Детальну мапу регіонів (якщо є для цієї країни)
- Поле для особистої нотатки
- Список відвіданих регіонів

Дані беруться з екземпляру моделі `Country`, який створюється через конструктор `new Country(...)`.

### 🏆 Досягнення (`AchievementsScreen.js`)
Список із 14 досягнень. Отримані підсвічені, невідкриті — сірі з іконкою 🔒. Кожен елемент — екземпляр моделі `Achievement`, у UI використовуються поля `title`, `description`, `icon`, `unlocked`.

### 👤 Профіль (`ProfileScreen.js`)
Профіль користувача зі статистикою: кількість відвіданих країн, відсоток світу, ранг, розподіл по континентах. Створюється екземпляр моделі `UserProfile`, через неї виводиться `name`, `getRank()`, `worldPercent` тощо.

---

## Моделі даних

Усі моделі реалізовані як ES6-класи у папці `src/models/`. Кожна має конструктор, 7 полів різних типів (`string`, `number`, `boolean`, `Date`, `null`), методи для серіалізації (`toJSON`/`fromJSON`) та допоміжні методи.

### `Country` — Країна

Представляє одну країну у застосунку: як відвідану, так і країну-мрію або ще не позначену.

| Поле | Тип | Опис |
|---|---|---|
| `id` | string | ISO 3166-1 числовий код (наприклад `"276"` — Німеччина) |
| `name` | string | Назва українською |
| `continent` | string | Континент |
| `visited` | boolean | Чи відвідана |
| `isDream` | boolean | Чи додана до мрій |
| `dateVisited` | Date \| null | Дата відвідування |
| `note` | string | Особиста нотатка |

Методи: `getStatus()`, `getDaysSinceVisit()`, `toJSON()`, `fromJSON()`.

### `Achievement` — Досягнення

Представляє одне досягнення, яке користувач отримує за певні дії.

| Поле | Тип | Опис |
|---|---|---|
| `id` | string | Унікальний ID |
| `title` | string | Назва |
| `description` | string | Умова отримання |
| `icon` | string | Емодзі |
| `requiredCount` | number | Необхідна кількість |
| `unlocked` | boolean | Чи розблоковано |
| `unlockedAt` | Date \| null | Коли отримано |

Методи: `unlock()`, `getProgress(currentCount)`, `toJSON()`, `fromJSON()`.

### `UserProfile` — Профіль користувача

Представляє статистику мандрівника: прогрес, ранг, дату реєстрації.

| Поле | Тип | Опис |
|---|---|---|
| `name` | string | Ім'я |
| `visitedCount` | number | Кількість відвіданих країн |
| `dreamCount` | number | Кількість країн-мрій |
| `worldPercent` | number | Відсоток світу |
| `achievementsUnlocked` | number | Отримано ачівок |
| `notificationsEnabled` | boolean | Чи увімкнено сповіщення |
| `joinedAt` | Date | Дата першого запуску |

Методи: `getRank()`, `getDaysActive()`, `toJSON()`, `fromJSON()`.

---

## Навігація

Реалізована у `App.js` через два рівні:

**1. Нижні вкладки** (`createBottomTabNavigator`)
```
🗺️ Мапа  |  📋 Список  |  🏆 Досягнення  |  👤 Профіль
```

**2. Stack-навігатор** (`createNativeStackNavigator`)

Усередині вкладок «Мапа» та «Список» лежать стеки з переходом на екран деталі:

```
MapScreen        → CountryDetailScreen
CountriesListScreen → CountryDetailScreen
```

Повернення назад реалізовано через стандартну кнопку header'а stack-навігатора (`headerBackTitle: 'Назад'`).

---

## Встановлення та запуск

### Вимоги

- Node.js LTS (18+)
- Застосунок **Expo Go** на телефоні (App Store / Google Play)
- Телефон і комп'ютер в одній Wi-Fi мережі (або використовуй tunnel-режим)

### Встановлення

```bash
# Клонувати репозиторій
git clone https://github.com/LesieBarbie/Travel-app.git
cd Travel-app

# Встановити залежності
npm install
```

### Запуск

```bash
# Стандартний режим (LAN)
npx expo start

# Режим tunnel (через інтернет, якщо Wi-Fi блокує)
npx expo start --tunnel
```

Сканувати QR-код у терміналі:
- **iPhone** — додатком Камера
- **Android** — у Expo Go натиснути "Scan QR code"

При першому запуску застосунок запросить дозвіл на сповіщення — натиснути **«Дозволити»**.

---

## Виконання вимог лабораторної

### ✅ Моделі даних

| Вимога | Реалізація |
|---|---|
| 2-3 моделі як класи з конструктором | 3 моделі: `Country`, `Achievement`, `UserProfile` |
| ≥ 4 поля різних типів | По 7 полів у кожній моделі; типи: `string`, `number`, `boolean`, `Date`, `null` |
| Коментар про сутність | JSDoc-блок на початку кожного файлу моделі |

### ✅ Екрани (5 шт)

| Екран | Файл | Тип |
|---|---|---|
| Мапа | `MapScreen.js` | головний |
| Список країн | `CountriesListScreen.js` | **екран списку (FlatList)** |
| Деталі країни | `CountryDetailScreen.js` | **екран деталі** |
| Досягнення | `AchievementsScreen.js` | додатковий |
| Профіль | `ProfileScreen.js` | додатковий |

### ✅ Навігація

| Вимога | Реалізація |
|---|---|
| Перехід список → деталь | `navigation.navigate('CountryDetail', { countryId, name })` у `CountriesListScreen.js` |
| Повернення назад | Stack-навігатор автоматично додає кнопку back у header |
| Нижні вкладки | `createBottomTabNavigator` з 4 вкладками |

### ✅ Зв'язок моделей з UI

- **`CountriesListScreen.js`** — колекція країн створюється як `COUNTRIES.map(c => new Country(...))`, у `renderItem` виводяться поля моделі (`item.name`, `item.continent`, `item.dateVisited.toLocaleDateString('uk-UA')`) та методи (`item.getStatus()`, `item.getDaysSinceVisit()`).
- **`CountryDetailScreen.js`** — через `useMemo` створюється `new Country(...)`, UI рендерить `country.name`, `country.continent`, `country.getStatus()`, `country.dateVisited`, `country.note`.
- **`AchievementsScreen.js`** — `ACHIEVEMENTS.map(a => new Achievement(...))`, рендер через поля моделі.
- **`ProfileScreen.js`** — `new UserProfile(...)`, виводиться `profile.name`, `profile.getRank()`, `profile.worldPercent`.
---
