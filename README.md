# 🌍 Wish2Go Map

> Мобільний застосунок для відстеження подорожей — React Native · Expo · Supabase

---

## Ідея

**Wish2Go Map** — мобільний застосунок для iOS та Android, який дозволяє мандрівникам:

- Відмічати відвідані країни на інтерактивній SVG-карті світу
- Вести список країн-мрій
- Відстежувати прогрес всередині країн (регіони, нотатки, фото)
- Збирати досягнення за подорожі
- Бачити активність друзів у реальному часі

**Ключова ідея: Offline-First** — додаток повністю функціонує без інтернету. Відмічати країни, писати нотатки, отримувати ачивки — все це працює в авіарежимі. Синхронізація з хмарою відбувається автоматично при появі мережі.

---

## Функціональні можливості

### 🗺️ Карта світу

- Інтерактивна SVG-карта (195 країн, компонент `WorldMapSvg`)
- Кольорова схема: зелений — відвідана, блакитний — мрія, сірий — не позначена
- Два режими: «Відвідав» та «Мрія» — перемикаються кнопками
- Переключення між плоскою картою та 3D-глобусом (`GlobeScreen`)

### 📋 Список країн

- 195 країн згруповані за континентами
- Фільтрація: всі / відвідані / мрії
- Пошук за назвою
- Прогрес-бар відвідування регіонів у кожній країні

### 🏙️ Деталі країни

- SVG-карта регіонів конкретної країни (`CountryRegionMap`)
- Відмітка регіонів всередині країни
- Особиста нотатка з автозбереженням через debounce (600мс)
- Фотогалерея: додавання з камери або галереї (`expo-image-picker`), збереження у файловій системі (`expo-file-system`), fullscreen-перегляд
- Кнопка «Поділитись» — генерує картку з прогресом

### 🏆 Досягнення

Система 20+ ачивок. Кожна реалізована як об'єкт із функцією `check()`:

```js
{
  id: 'first_step',
  title: 'Перший крок',
  icon: '👣',
  check: (visited) => visited.length >= 1,
}
```

| ID | Назва | Умова |
|---|---|---|
| `first_step` | 👣 Перший крок | 1 країна |
| `traveler_5` | 🎒 Початківець | 5 країн |
| `traveler_10` | ✈️ Мандрівник | 10 країн |
| `traveler_25` | 🗺️ Досвідчений | 25 країн |
| `traveler_50` | 🌍 Глобтротер | 50 країн |
| `traveler_100` | 🏆 Легенда | 100 країн |
| `europe_10` | 🇪🇺 Європеєць | 10 країн Європи |
| `europe_all` | 🏰 Вся Європа | Всі країни Європи |
| `asia_5` | 🏯 Азіат | 5 країн Азії |
| `americas` | 🗽 Обидві Америки | По 1 країні в обох Америках |
| `africa_first` | 🦁 Сафарі | 1 країна Африки |
| `oceania_first` | 🏝️ Острови | 1 країна Океанії |
| `all_continents` | 🌐 Всі континенти | По 1 на 6 континентах |
| `dreamer` | 💭 Мрійник | 10 країн у списку мрій |

При розблокуванні ачивки одночасно:
1. Показується `AchievementToast` — анімований попап поверх екрану
2. Надсилається локальне push-сповіщення системи телефону
3. Запис зберігається у Supabase (таблиця `achievement_unlocks`) — щоб друзі бачили в стрічці

### 👥 Друзі

- Генерація токену запрошення (10 символів, `nanoid`) → Share API
- Прийняття токену або посилання `travelmap://invite/TOKEN`
- Список друзів: тап → профіль, кнопка ✕ → видалити
- Запити в друзі — окрема секція зверху списку
- **Профіль друга**: відвідані країни по континентах + ачивки сіткою

### 📡 Стрічка друзів (Live Feed)

- Активність друзів у реальному часі через **Supabase Realtime**
- Показує: нові відвідані країни ✈️ та нові ачивки 🏆
- Індикатор 🟢 Онлайн / ⚫ Відключено (стан WebSocket)
- Сортування за часом (нові вгорі)
- При переході у фон — відписка; при поверненні — відновлення

### 👤 Профіль

- Редагування імені (тап → TextInput → Supabase)
- Ранг: Новачок → Початківець → Мандрівник → Досвідчений → Глобтротер → Легенда
- Відсоток охопленого світу
- Статистика по континентах
- Перемикач біометричного входу
- Форма додавання друга за токеном
- Тестер диплінків

### 🔒 Біометрія

- Face ID та Touch ID / Fingerprint через `expo-local-authentication`
- При переході у фон > 30 секунд — блокує додаток
- Fallback на системний пароль
- Налаштування зберігається в AsyncStorage

### 🌐 Демо-офлайн режим

Спеціальна функція для демонстрації роботи без мережі. В `supabaseClient.js` підміняється глобальний `fetch`:

```js
const offlineAwareFetch = (url, options) => {
  if (demoOffline) {
    return Promise.reject(new Error('Demo offline mode'));
  }
  return fetch(url, options);
};

export const supabase = createClient(URL, KEY, {
  global: { fetch: offlineAwareFetch },
});
```

Увімкнення `demoOffline = true` — всі запити до Supabase «падають», демонструючи офлайн-режим без авіарежиму.

---

## Технологічний стек

### Frontend / Mobile

| Технологія | Версія | Призначення |
|---|---|---|
| React Native | 0.76 | Основний фреймворк |
| Expo SDK | 53 | Платформа збірки, нативні модулі |
| React Navigation | 7 | Stack + BottomTabs навігація |
| AsyncStorage | — | Локальне сховище на пристрої |
| expo-local-authentication | — | Біометрія (Face ID / Touch ID) |
| expo-notifications | — | Локальні push-сповіщення |
| expo-image-picker | — | Вибір фото з камери/галереї |
| expo-file-system | — | Збереження файлів |
| expo-linking | — | Обробка диплінків |
| react-native-svg | — | SVG-карта світу та регіонів |
| @react-native-community/netinfo | — | Моніторинг стану мережі |
| nanoid | — | Генерація токенів запрошень |

### Backend (BaaS — Supabase)

| Сервіс | Що надає |
|---|---|
| PostgreSQL | Реляційна БД |
| PostgREST | Автоматичний REST API до таблиць |
| Auth | JWT, управління сесіями, refresh tokens |
| Realtime | WebSocket-підписки на зміни в таблицях |
| Row Level Security | Кожен бачить тільки свої дані |

### Тестування

| Інструмент | Використання |
|---|---|
| Jest | Unit-тести |
| MockWebSocket | Мок нативного WebSocket |
| MockDeepLinkRouter | Запис оброблених URL |
| jest.mock() | Мокування expo-modules та AsyncStorage |

---

### Патерн Repository

`CountryRepository` — єдина точка доступу до даних про країни. Приховує від UI звідки беруться дані.

```js
async save(country) {
  country.syncStatus = 'pending';
  await this.storage.saveItem(this.collection, country.toJSON()); // 1. Одразу в AsyncStorage
  this._safeSyncCountry(country);  // 2. Фоново до Supabase (не блокує UI)
  return country;
}

async _safeSyncCountry(country) {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;  // нема мережі — мовчимо
  await this.syncCountry(country);    // є мережа — upsert до Supabase
}
```

### Модель Country — syncStatus

| Значення | Опис |
|---|---|
| `'pending'` | Збережено локально, ще не відправлено на сервер |
| `'synced'` | Повністю синхронізовано з Supabase |
| `'error'` | Синхронізація не вдалася, потрібно повторити |

### TravelContext

Центральне сховище стану. Три `useEffect` при завантаженні:

1. **Ініціалізація** — читає AsyncStorage, відновлює `visited`, `dream`, `regions`
2. **Pull при логіні** — `pullFromServer()` після появи `user` в AuthContext
3. **NetInfo listener** — при появі мережі запускає `syncPending()`

### AuthContext

Слухає `supabase.auth.onAuthStateChange()` — автоматично оновлює `user` при логіні/логауті/refresh. JWT зберігається в AsyncStorage, автоматично оновлюється (`autoRefreshToken: true`).

---

## Структура файлів

```
Wish2Go/
├── App.js                          # Кореневий компонент, навігація, стеки
├── app.json                        # Конфігурація Expo (scheme, bundleId)
├── index.js                        # Точка входу
├── package.json
├── jest.config.js
│
└── src/
    ├── api/
    │   ├── supabaseClient.js       # Supabase клієнт + demo-offline режим
    │   ├── client.js               # Мок HTTP-клієнт (legacy, залишений для сумісності)
    │   ├── countriesApi.js         # CRUD країн через Supabase REST
    │   ├── friendsApi.js           # Друзі, запрошення, профілі, removeFriend
    │   └── achievementsApi.js      # Ачивки API
    │
    ├── context/
    │   ├── TravelContext.js        # Стан мандрівок + синхронізація + NetInfo
    │   └── AuthContext.js          # Стан авторизації (Supabase Auth)
    │
    ├── repositories/
    │   ├── CountryRepository.js    # Offline-first CRUD + syncPending + pullFromServer
    │   ├── AchievementRepository.js # Ачивки: AsyncStorage + Supabase sync
    │   └── UserProfileRepository.js # Профіль користувача
    │
    ├── models/
    │   ├── Country.js              # Модель країни (syncStatus, toJSON, needsSync)
    │   ├── Achievement.js          # Модель ачивки (unlocked, unlockedAt)
    │   └── UserProfile.js          # Профіль (getRank, getDaysActive)
    │
    ├── screens/
    │   ├── MapScreen.js            # Інтерактивна SVG-карта світу
    │   ├── CountryDetailScreen.js  # Деталі країни + регіони + нотатки + фото
    │   ├── CountriesListScreen.js  # Список і фільтрація країн
    │   ├── RegionDetailScreen.js   # Деталі регіону
    │   ├── AchievementsScreen.js   # Список ачивок з прогресом
    │   ├── FriendsScreen.js        # Список друзів + запити + запросити
    │   ├── FriendProfileScreen.js  # Профіль друга (країни + ачивки)
    │   ├── LiveFeedScreen.js       # Стрічка активності друзів (Realtime)
    │   ├── ProfileScreen.js        # Профіль + статистика + тестер диплінків
    │   ├── AuthScreen.js           # Логін / реєстрація
    │   ├── LockScreen.js           # Екран біометричного входу
    │   ├── InviteScreen.js         # Прийняття запрошення по токену
    │   ├── GlobeScreen.js          # 3D-глобус
    │   ├── SecuritySettingsScreen.js
    │   └── DebugScreen.js          # Тестер диплінків (legacy)
    │
    ├── components/
    │   ├── WorldMapSvg.js          # SVG-карта 195 країн
    │   ├── CountryRegionMap.js     # SVG-карта регіонів країни
    │   ├── AchievementToast.js     # Анімований popup нової ачивки
    │   └── ProgressBar.js         # Прогрес-бар
    │
    ├── navigation/
    │   ├── DeepLinkRouter.js       # Парсер та роутер диплінків
    │   └── linkingConfig.js        # Декларативна конфігурація для React Navigation
    │
    ├── data/
    │   ├── countries.js            # 195 країн з континентами, кодами, регіонами
    │   └── achievements.js         # 20+ ачивок з функціями check()
    │
    └── utils/
        ├── storage.js              # CRUD-обгортка над AsyncStorage (4 колекції)
        ├── SocketManager.js        # WebSocket-менеджер з автоперепідключенням
        ├── MockSocketManager.js    # Мок-сокет для демо (5 подій кожні 4с)
        ├── BiometricManager.js     # Face ID / Touch ID
        ├── notifications.js        # Локальні push-сповіщення
        └── __tests__/
            ├── SocketManager.test.js     # 17 тестів
            ├── BiometricManager.test.js  # 15 тестів
            └── DeepLinkRouter.test.js    # 15 тестів
```

---

## База даних

PostgreSQL на Supabase. URL проекту: `vhnqxulobzyaawqsjoqf.supabase.co`

### Таблиці

#### `countries`
| Колонка | Тип | Опис |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `country_code` | text | Числовий ISO код (276 = Німеччина) |
| `name` | text | Назва країни |
| `visited` | boolean | Чи відвідана |
| `is_dream` | boolean | Чи є у списку мрій |
| `note` | text | Особиста нотатка |
| `photos` | text[] | URI фотографій |
| `sync_status` | text | pending / synced / error |
| `updated_at` | timestamptz | Час останньої зміни |

#### `achievement_unlocks`
| Колонка | Тип | Опис |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `achievement_id` | text | ID ачивки (first_step, traveler_10...) |
| `achievement_title` | text | Назва для стрічки |
| `created_at` | timestamptz | Час отримання |

> UNIQUE constraint: `(user_id, achievement_id)` — неможливо отримати ачивку двічі.

#### `friendships`
| Колонка | Тип | Опис |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Хто відправив запит |
| `friend_id` | uuid | Кому відправили |
| `status` | text | pending / accepted |

#### `invite_tokens`
| Колонка | Тип | Опис |
|---|---|---|
| `token` | text | 10-символьний токен (nanoid, UPPER CASE) |
| `created_by` | uuid | Хто створив |
| `used_by` | uuid | Хто використав |
| `expires_at` | timestamptz | Термін дії |

#### `profiles`
| Колонка | Тип | Опис |
|---|---|---|
| `id` | uuid | FK до auth.users |
| `username` | text | Ім'я користувача |
| `updated_at` | timestamptz | Час оновлення |

### Row Level Security (RLS)

Кожна таблиця має RLS-правила. Приклад для `countries`:

```sql
-- Кожен бачить тільки свої країни
CREATE POLICY "Users see own countries"
  ON countries FOR SELECT
  USING (user_id = auth.uid());

-- Запис тільки у свої дані
CREATE POLICY "Users insert own countries"
  ON countries FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

### Realtime Publications

Таблиці включені у publication `supabase_realtime`:
- `countries` — для стрічки відвіданих країн
- `achievement_unlocks` — для стрічки ачивок
- `friendships` — для запитів у друзі

---

## Офлайн-синхронізація

### Стратегія Offline-First

UI завжди читає з **AsyncStorage** → відповідь миттєва, працює без мережі.

### Автосинхронізація при появі мережі

```js
// TravelContext.js
NetInfo.addEventListener((state) => {
  const isConnected = state.isConnected && state.isInternetReachable !== false;

  if (isConnected && !lastConnected) {
    // Мережа щойно з'явилась — відправляємо всі pending записи
    countryRepo.syncPending();
  }

  lastConnected = isConnected;
});
```

### syncPending

Знаходить всі записи з `syncStatus = 'pending'` або `'error'` і відправляє їх на сервер. Якщо успішно — `'synced'`. Якщо провалився — лишається `'error'`, буде повтор при наступному підключенні.

### Pull при логіні

Коли `user` з'являється в `AuthContext` — виконується `pullFromServer()`. Гарантує актуальність при першому запуску на новому пристрої. При мержі: локальні фото зберігаються (вони не йдуть на сервер).

### AsyncStorage — формат зберігання

```js
// Ключ:  'collection:countries'
// Значення: JSON-масив
[
  { id: '276', name: 'Німеччина', visited: true, syncStatus: 'synced', ... },
  { id: '804', name: 'Україна', visited: true, syncStatus: 'pending', ... },
]
```

Є 4 колекції: `countries`, `achievements`, `profile`, `regions`.

---


### Вкладки нижнього меню

| Іконка | Назва | Вміст |
|---|---|---|
| 🗺️ | Мапа | Карта + деталі країни + регіону |
| 📋 | Список | Список країн + деталі |
| 🏆 | Досягнення | Список ачивок |
| 👥 | Друзі | Список + стрічка + профіль друга |
| 👤 | Профіль | Профіль, статистика, налаштування |

---

## Deep Links

### Підтримувані схеми

| Схема | Де використовується |
|---|---|
| `travelmap://` | Production build (iOS + Android) |
| `https://travelmap.app/` | Universal Links (iOS) / App Links (Android) |
| `exp://owsxozu-lesiebarbie-8081.exp.direct/--/` | Expo Go (автоматично через `Linking.createURL()`) |

### Таблиця маршрутів

| URL | Що відкриває |
|---|---|
| `travelmap://home` | Головний екран карти |
| `travelmap://country/276` | Деталі Німеччини (числовий ISO код) |
| `travelmap://country/276/region/Bayern` | Деталі регіону |
| `travelmap://catalog` | Список всіх країн |
| `travelmap://catalog?filter=visited` | Список відвіданих |
| `travelmap://catalog?filter=dream` | Список мрій |
| `travelmap://achievements` | Екран досягнень |
| `travelmap://friends` | Список друзів |
| `travelmap://live` | Стрічка активності друзів |
| `travelmap://profile` | Профіль |
| `travelmap://invite/TOKEN` | Прийняття запрошення |

### DeepLinkRouter

Клас `DeepLinkRouter` — власний парсер та роутер, незалежний від React Navigation.

```js
// parseURL — повертає типізований об'єкт Destination
router.parseURL('travelmap://country/276')
// → { type: 'country', id: '276' }

router.parseURL('travelmap://catalog?filter=visited')
// → { type: 'catalog', filter: 'visited' }

router.parseURL('https://travelmap.app/invite/ABC123')
// → { type: 'invite', token: 'ABC123' }

router.parseURL('travelmap://unknown/xyz')
// → null

// handle — парсить і одразу навігує
router.handle('travelmap://achievements')

// buildURL — зворотній процес
DeepLinkRouter.buildURL({ type: 'country', id: '276' })
// → 'travelmap://country/276'
```

**`pendingDestination`** — якщо диплінк прийшов до ініціалізації `NavigationContainer`, він зберігається і виконується після `setNavigation()`.

### linkingConfig

Паралельно існує декларативна конфігурація `linkingConfig.js` для React Navigation — обробляє диплінки при холодному старті, передає параметри через `route.params`.

---

## WebSocket та Realtime

### SocketManager — власна реалізація

`src/utils/SocketManager.js` — WebSocket-менеджер написаний з нуля.


```

**Особливості:**
- Автоматичне перепідключення: `onclose → _scheduleReconnect() → setTimeout(connect, 3000)`
- Максимум 5 спроб (`maxRetries`), після цього → `DISCONNECTED`
- При успішному підключенні `retryCount` скидається до 0
- `disconnect()` встановлює `shouldReconnect = false`
- `send()` перевіряє стан, повертає `false` якщо не підключений
- `onMessage()` та `onStateChange()` повертають функцію відписки
- Автоматичний `JSON.parse` при отриманні та `JSON.stringify` при відправці

```js
const manager = new SocketManager();

manager.onStateChange(state => console.log('State:', state));
manager.onMessage(data => console.log('Received:', data));

manager.connect('ws://example.com');
manager.send({ type: 'ping' });
manager.disconnect();
```

### MockSocketManager — демо-сокет

Імітує WebSocket без реального сервера. Кожні 4 секунди надсилає тестові події по черзі:

```js
const MOCK_EVENTS = [
  { type: 'friend_visited', countryId: '276', friendName: 'Олена' },
  { type: 'friend_visited', countryId: '250', friendName: 'Максим' },
  { type: 'country_tip', countryId: '380', tip: 'Спробуй борщ у Львові!' },
  { type: 'friend_visited', countryId: '392', friendName: 'Аня' },
  { type: 'country_tip', countryId: '724', tip: 'Найкращий час — квітень-травень' },
];
```

### Supabase Realtime — продакшн

`LiveFeedScreen` використовує Supabase Realtime замість кастомного SocketManager. Це теж WebSocket, але керований SDK через логічну реплікацію PostgreSQL:

```js
// Два незалежних канали
const visitChannel = supabase
  .channel('friends-countries')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'countries',
  }, (payload) => {
    if (!ids.includes(payload.new.user_id)) return; // фільтр по друзях
    if (!payload.new.visited) return;
    setEvents(prev => [formatVisitEvent(payload.new), ...prev]);
  })
  .on('postgres_changes', { event: 'UPDATE', ... }, (payload) => {
    // UPDATE: показуємо тільки якщо visited щойно змінилось false → true
    if (payload.old?.visited === true) return;
    ...
  })
  .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

const achChannel = supabase
  .channel('friends-achievement-unlocks')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'achievement_unlocks',
  }, (payload) => {
    if (!ids.includes(payload.new.user_id)) return;
    setEvents(prev => [formatAchievementEvent(payload.new), ...prev]);
  })
  .subscribe();
```

---

## Push-сповіщення

Використовуються виключно **локальні** push-сповіщення через `expo-notifications` — без FCM/APNs серверів.

```js
// Надсилається миттєво при отриманні ачивки
await Notifications.scheduleNotificationAsync({
  content: {
    title: '🏆 Нове досягнення!',
    body: '👣 Перший крок — Відвідай свою першу країну',
    data: { achievementId: 'first_step' },
    sound: true,
  },
  trigger: null, // миттєво
});
```

**Ініціалізація:**
- При старті — `requestNotificationPermissions()` запитує дозвіл
- На Android — створюється канал `achievements` (HIGH importance, вібрація)
- `setNotificationHandler` — `shouldShowAlert: true`, `shouldPlaySound: true`

**Коли надсилаються:** тільки при розблокуванні нової ачивки. ID ачивки записується у `notifiedAchievements` (AsyncStorage) — повторне сповіщення неможливе.

---

## Тестування

Запуск тестів: `npx jest`

### SocketManager — 17 тестів

| # | Що перевіряє |
|---|---|
| 1 | Початковий стан `DISCONNECTED` |
| 2 | `connect()` → `CONNECTING` → `CONNECTED` |
| 3 | `disconnect()` → `DISCONNECTED` |
| 4 | `disconnect()` блокує reconnect (`shouldReconnect = false`) |
| 5 | `send()` повертає `false` без з'єднання |
| 6 | `send()` відправляє JSON та повертає `true` |
| 7 | `onMessage` отримує розпарсений об'єкт |
| 8 | Відписка від `onMessage` видаляє handler |
| 9 | Невалідний JSON не крашить (try/catch) |
| 10 | `onStateChange` отримує всі переходи стану |
| 11 | Відписка від `onStateChange` видаляє handler |
| 12 | `onclose` → перехід у `RECONNECTING` |
| 13 | `retryCount` збільшується при кожній спробі |
| 14 | Зупиняється після `maxRetries` |
| 15 | Кілька `onMessage` handlers отримують подію одночасно |
| 16 | `retryCount` скидається до 0 при успішному підключенні |
| 17 | URL зберігається після `connect()` |

### BiometricManager — 15 тестів

Покриває: відсутність hardware, незареєстровану біометрію, Face ID vs Touch ID, успішну та невдалу автентифікацію, відміну користувачем, збереження налаштувань (`isEnabled`, `setEnabled`), стан `UNAVAILABLE`.

### DeepLinkRouter — 15 тестів

Покриває: всі маршрути для `travelmap://` та `https://` схем, порожні та `null` URL → `null` без виключень, невідомі маршрути → `null`, регіони (4-сегментний маршрут), query-параметри (`?filter=visited`), `MockDeepLinkRouter` записує всі оброблені URL.

---

## Запуск

### Вимоги

- Node.js 18+
- `npm install -g expo-cli`
- Expo Go на телефоні (для розробки)

### Команди

```bash
# Встановити залежності
npm install

# Запустити dev-сервер
npx expo start

# Запустити всі тести
npx jest

# Тест конкретного модуля
npx jest SocketManager
npx jest BiometricManager
npx jest DeepLinkRouter
```

### Тестування диплінків

У Expo Go кастомна схема `travelmap://` не підтримується — використовується `exp://` URL:

```bash
# iOS симулятор
npx uri-scheme open "travelmap://home" --ios
npx uri-scheme open "travelmap://achievements" --ios

# Через Expo Go (замінити на свій tunnel URL)
exp://owsxozu-lesiebarbie-8081.exp.direct/--/home
exp://owsxozu-lesiebarbie-8081.exp.direct/--/country/276
exp://owsxozu-lesiebarbie-8081.exp.direct/--/invite/ABC123

# Або через тестер в ProfileScreen → 🔗 Тестер діплинків
```

### Конфігурація app.json

```json
{
  "expo": {
    "name": "Wish2Go",
    "slug": "wish2go",
    "scheme": "travelmap",
    "ios": {
      "bundleIdentifier": "com.travelapp.lesie",
      "associatedDomains": ["applinks:travelmap.app"]
    },
    "android": {
      "package": "com.travelapp.lesie",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "travelmap" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

*Wish2Go Map · React Native + Expo + Supabase · 2026*