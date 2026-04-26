# 🌍 Wish2Go — Карта мрій і подорожей

> Мобільний застосунок для відмічання відвіданих країн і країн мрії. Працює на iOS та Android через **Expo**.

---

## ✨ Можливості

- 🗺️ **Інтерактивна карта світу** — тапни на країну, щоб позначити її як відвідану або країну мрії
- 📋 **Список країн** — зручний перегляд і пошук усіх країн
- 📊 **Прогрес-бар** — скільки % світу ти вже об'їздив, розбивка по континентах
- 👤 **Профіль** зі статистикою та можливістю скинути дані
- 🏆 **Досягнення** — отримуй нагороди за нові рекорди (10 країн, 25 країн, уся Європа тощо)
- 🔔 **Сповіщення** — системні push та красивий Toast-попап при отриманні ачівки
- 🏙️ **Детальні карти регіонів**:
  - 🇩🇪 Німеччина · 🇨🇭 Швейцарія · 🇺🇸 США
  - 🇺🇦 Україна · 🇫🇷 Франція · 🇮🇹 Італія
  - 🇪🇸 Іспанія · 🇬🇧 Велика Британія · 🇵🇱 Польща
  - та інші
- 💾 **Локальне збереження** — усі дані зберігаються прямо на телефоні (AsyncStorage)

---

## 🛠️ Технологічний стек

| Технологія | Призначення |
|---|---|
| [React Native](https://reactnative.dev/) | Основний фреймворк |
| [Expo](https://expo.dev/) | Середовище розробки та збірки |
| [React Navigation](https://reactnavigation.org/) | Навігація між екранами |
| [react-native-svg](https://github.com/software-mansion/react-native-svg) | Відображення SVG-карти |
| [d3-geo](https://github.com/d3/d3-geo) + [topojson-client](https://github.com/topojson/topojson-client) | Проєкції та геодані карти |
| [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage) | Локальне зберігання даних |
| [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) | Push-сповіщення |

---

## 🚀 Встановлення та запуск

### Крок 1. Вимоги

Переконайся, що встановлено:

- **Node.js** (LTS) — завантажити на [nodejs.org](https://nodejs.org)
- **VS Code** — завантажити на [code.visualstudio.com](https://code.visualstudio.com)
- **Expo Go** на телефоні:
  - iPhone → [App Store](https://apps.apple.com/app/expo-go/id982107779)
  - Android → [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

Перевір встановлення:

```bash
node --version
npm --version
```

### Крок 2. Клонування репозиторію

```bash
git clone https://github.com/LesieBarbie/Wish2Go.git
cd Wish2Go
```

### Крок 3. Встановлення залежностей

```bash
npm install
```

### Крок 4. Запуск

```bash
npx expo start
```

У терміналі з'явиться QR-код.

- **iPhone**: відкрий камеру → наведи на QR → відкриється в Expo Go
- **Android**: відкрий Expo Go → «Scan QR Code» → наведи

> ⚠️ **Важливо:** телефон і комп'ютер мають бути в одній Wi-Fi мережі.

---

## 📁 Структура проєкту

```
Wish2Go/
├── App.js                          # Головний файл, навігація
├── app.json                        # Конфігурація Expo
├── index.js                        # Точка входу
├── assets/                         # Іконки та зображення
└── src/
    ├── api/                        # Запити до зовнішніх API
    │   ├── achievementsApi.js
    │   ├── client.js
    │   ├── countriesApi.js
    │   └── profileApi.js
    ├── components/                 # UI-компоненти
    │   ├── AchievementToast.js     # Toast-попап для ачівок
    │   ├── CountryRegionMap.js     # Детальна карта регіонів
    │   ├── ProgressBar.js          # Прогрес-бар
    │   └── WorldMapSvg.js          # SVG-карта світу
    ├── context/
    │   └── TravelContext.js        # Глобальний стан (відвідані / мрії)
    ├── data/
    │   ├── achievements.js         # Список досягнень
    │   └── countries.js            # Дані по країнах і регіонах
    ├── models/                     # Моделі даних
    │   ├── Achievement.js
    │   ├── Country.js
    │   └── UserProfile.js
    ├── repositories/               # Шар роботи зі сховищем
    │   ├── AchievementRepository.js
    │   ├── CountryRepository.js
    │   └── UserProfileRepository.js
    ├── screens/                    # Екрани застосунку
    │   ├── AchievementsScreen.js   # 🏆 Досягнення
    │   ├── CountriesListScreen.js  # 📋 Список країн
    │   ├── CountryDetailScreen.js  # Деталі країни
    │   ├── GlobeScreen.js          # Глобус
    │   ├── MapScreen.js            # 🗺️ Карта
    │   └── ProfileScreen.js        # 👤 Профіль
    └── utils/
        ├── notifications.js        # Логіка сповіщень
        └── storage.js              # Робота з AsyncStorage
```

---

## 🗺️ Навігація

Застосунок побудований на **bottom-tab навігації** з чотирма вкладками:

| Вкладка | Опис |
|---|---|
| 🗺️ Мапа | Інтерактивна карта світу для позначення країн |
| 📋 Список | Список усіх країн з фільтрацією |
| 🏆 Досягнення | Зароблені та доступні ачівки |
| 👤 Профіль | Статистика та налаштування |

---

## 🏆 Система досягнень

Ачівки видаються автоматично при досягненні певних цілей — наприклад:

- 🌱 **Перший крок** — відмітити першу країну
- 🗺️ **Десятка** — 10 відвіданих країн
- 🌍 **Мандрівник** — 25 країн
- 🇪🇺 **Вся Європа** — відвідати всі країни Європи
- …та інші

При отриманні ачівки з'являється **Toast-попап** і надсилається **push-сповіщення**.

---

## 🔔 Push-сповіщення

При першому запуску застосунок попросить дозвіл на сповіщення — натисни **«Дозволити»**.

Якщо сповіщення не приходять:
1. Перейди до **Налаштування → Сповіщення → Expo Go**
2. Переконайся, що сповіщення увімкнені
3. Повністю закрий та знову відкрий застосунок

---

## 🐛 Налагодження

- **Застосунок не запускається?** Перевір, чи телефон і ноутбук у одній Wi-Fi мережі. Або спробуй `npx expo start --tunnel`
- **Бачиш червоний екран?** Скопіюй текст помилки — він вкаже на конкретний рядок коду
- **Хочеш логувати дані?** Використовуй `console.log()` — виводи з'являться прямо в терміналі де запущено `expo start`
- **Скинути кеш:** `npx expo start --clear`

---

## 📚 Корисні посилання

- [Документація React Native](https://reactnative.dev/docs/getting-started)
- [Офіційний туторіал Expo](https://docs.expo.dev/tutorial/introduction/)
- [React Navigation — початок роботи](https://reactnavigation.org/docs/getting-started)

---

## 📄 Ліцензія

Проєкт створено в навчальних цілях. Вільно до використання та модифікації.
