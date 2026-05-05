import * as Linking from 'expo-linking';

/**
 * ============================================================
 * DeepLinkRouter
 * ============================================================
 *
 * Розбирає вхідні URL і виконує навігацію застосунку.
 *
 * Підтримує дві схеми:
 *   - travelmap://...           (кастомна URI-схема)
 *   - https://travelmap.app/... (Universal Links / App Links)
 *
 * Маршрути (Destinations):
 *   - Home                          - головна
 *   - Country(id)                   - деталі країни
 *   - Region(countryId, name)       - деталі регіону
 *   - Catalog(filter)               - список з фільтром (all/visited/dream)
 *   - Invite(token)                 - запрошення друга
 *   - Achievements                  - досягнення
 *
 * Невідомі URL не кидають exception — повертають null.
 */

// ============================================================
// Типи маршрутів
// ============================================================

export const DestinationType = Object.freeze({
  HOME: 'home',
  COUNTRY: 'country',
  REGION: 'region',
  CATALOG: 'catalog',
  INVITE: 'invite',
  ACHIEVEMENTS: 'achievements',
});

/**
 * Створення типізованих маршрутів. Замість sealed class / enum
 * використовуємо звичайні об'єкти з полем `type`.
 */
export const Destination = {
  Home: () => ({ type: DestinationType.HOME }),
  Country: (id) => ({ type: DestinationType.COUNTRY, id }),
  Region: (countryId, name) => ({ type: DestinationType.REGION, countryId, name }),
  Catalog: (filter = null) => ({ type: DestinationType.CATALOG, filter }),
  Invite: (token) => ({ type: DestinationType.INVITE, token }),
  Achievements: () => ({ type: DestinationType.ACHIEVEMENTS }),
};

// ============================================================
// DeepLinkRouter
// ============================================================

export default class DeepLinkRouter {
  /**
   * @param {object} navigation - об'єкт NavigationContainer (передається з App)
   */
  constructor(navigation = null) {
    this.navigation = navigation;
    this.currentDestination = null;
    this.pendingDestination = null; // якщо navigation ще не готова
    this.listeners = []; // підписники на зміни currentDestination
  }

  /**
   * Прив'язати об'єкт навігації пізніше (коли NavigationContainer готовий).
   */
  setNavigation(navigation) {
    this.navigation = navigation;
    if (this.pendingDestination) {
      this.navigate(this.pendingDestination);
      this.pendingDestination = null;
    }
  }

  /**
   * Парсить URL у типізований маршрут.
   *
   * Правила:
   *  - travelmap://... та https://travelmap.app/... обробляються однаково
   *  - travelmap://home → Home
   *  - travelmap://country/276 → Country("276")
   *  - travelmap://country/276/region/Bayern → Region("276", "Bayern")
   *  - travelmap://catalog?filter=visited → Catalog("visited")
   *  - travelmap://catalog → Catalog(null)
   *  - travelmap://invite/ABC123 → Invite("ABC123")
   *  - travelmap://achievements → Achievements
   *  - все інше → null
   *
   * @param {string} url
   * @returns {object|null}
   */
  parseURL(url) {
    if (!url || typeof url !== 'string') return null;

    let parsed;
    try {
      parsed = Linking.parse(url);
    } catch (e) {
      console.warn('[DeepLinkRouter] Failed to parse URL:', url, e.message);
      return null;
    }

    // expo-linking повертає { scheme, hostname, path, queryParams }
    // Але для travelmap://country/276:
    //   scheme=travelmap, hostname=country, path=276
    // Для https://travelmap.app/country/276:
    //   scheme=https, hostname=travelmap.app, path=country/276
    //
    // Об'єднуємо hostname та path, щоб отримати єдиний шлях,
    // не залежний від схеми.

    const isHttps = parsed.scheme === 'https';
    let segments;

    if (isHttps) {
      // https://travelmap.app/country/276 → ['country', '276']
      const pathStr = parsed.path || '';
      segments = pathStr.split('/').filter(Boolean);
    } else {
      // travelmap://country/276 → hostname='country', path='276'
      // Об'єднуємо: ['country', '276']
      segments = [];
      if (parsed.hostname) segments.push(parsed.hostname);
      if (parsed.path) {
        const extra = parsed.path.split('/').filter(Boolean);
        segments.push(...extra);
      }
    }

    if (segments.length === 0) return null;

    const queryParams = parsed.queryParams || {};
    const [first, second, third, fourth] = segments;

    try {
      // home
      if (first === 'home') {
        return Destination.Home();
      }

      // country/:id
      if (first === 'country' && second && segments.length === 2) {
        return Destination.Country(second);
      }

      // country/:id/region/:name
      if (
        first === 'country' &&
        second &&
        third === 'region' &&
        fourth &&
        segments.length === 4
      ) {
        return Destination.Region(second, decodeURIComponent(fourth));
      }

      // catalog?filter=...
      if (first === 'catalog' && segments.length === 1) {
        const filter = queryParams.filter || null;
        return Destination.Catalog(filter);
      }

      // invite/:token
      if (first === 'invite' && second && segments.length === 2) {
        return Destination.Invite(second);
      }

      // achievements
      if (first === 'achievements' && segments.length === 1) {
        return Destination.Achievements();
      }

      // Невідомий маршрут
      return null;
    } catch (e) {
      console.warn('[DeepLinkRouter] parseURL error:', e.message);
      return null;
    }
  }

  /**
   * Точка входу: парсить URL і виконує навігацію.
   *
   * @param {string} url
   * @returns {boolean} true якщо вдалось обробити, false якщо URL невалідний
   */
  handle(url) {
    const destination = this.parseURL(url);
    if (!destination) {
      console.log('[DeepLinkRouter] Ignored invalid URL:', url);
      return false;
    }
    this.navigate(destination);
    return true;
  }

  /**
   * Виконує навігацію за типізованим маршрутом.
   * Якщо NavigationContainer ще не готова — зберігає у pendingDestination.
   */
  navigate(destination) {
    if (!destination) return;

    // Зберігаємо поточний стан (для тестів і UI)
    this.currentDestination = destination;
    this._notifyListeners();

    // Якщо ще немає об'єкта навігації — відкладемо
    if (!this.navigation) {
      this.pendingDestination = destination;
      return;
    }

    // Виконуємо реальну навігацію
    try {
      switch (destination.type) {
        case DestinationType.HOME:
          this.navigation.navigate('Map');
          break;

        case DestinationType.COUNTRY:
          this.navigation.navigate('Map', {
            screen: 'CountryDetail',
            params: { countryId: destination.id, name: '' },
          });
          break;

        case DestinationType.REGION:
          this.navigation.navigate('Map', {
            screen: 'RegionDetail',
            params: { countryId: destination.countryId, regionName: destination.name },
          });
          break;

        case DestinationType.CATALOG:
          this.navigation.navigate('List', {
            screen: 'CountriesList',
            params: { initialFilter: destination.filter },
          });
          break;

        case DestinationType.INVITE:
          // InviteScreen — це окремий стек, додамо у App.js
          this.navigation.navigate('Invite', { token: destination.token });
          break;

        case DestinationType.ACHIEVEMENTS:
          this.navigation.navigate('Achievements');
          break;

        default:
          console.warn('[DeepLinkRouter] Unknown destination type:', destination.type);
      }
    } catch (e) {
      console.warn('[DeepLinkRouter] navigate error:', e.message);
    }
  }

  /**
   * Підписка на зміни поточного маршруту.
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  _notifyListeners() {
    for (const l of this.listeners) {
      try {
        l(this.currentDestination);
      } catch {}
    }
  }

  /**
   * Створити URL для шерингу — обернений процес parseURL.
   */
  static buildURL(destination, useHttps = false) {
    const base = useHttps ? 'https://travelmap.app' : 'travelmap:/';

    switch (destination.type) {
      case DestinationType.HOME:
        return `${base}/home`;
      case DestinationType.COUNTRY:
        return `${base}/country/${destination.id}`;
      case DestinationType.REGION:
        return `${base}/country/${destination.countryId}/region/${encodeURIComponent(destination.name)}`;
      case DestinationType.CATALOG:
        return destination.filter
          ? `${base}/catalog?filter=${destination.filter}`
          : `${base}/catalog`;
      case DestinationType.INVITE:
        return `${base}/invite/${destination.token}`;
      case DestinationType.ACHIEVEMENTS:
        return `${base}/achievements`;
      default:
        return null;
    }
  }
}

// ============================================================
// Mock-версія для DebugScreen
// ============================================================

/**
 * MockDeepLinkRouter — для тестування через DebugScreen.
 * Делегує реальному роутеру, але дає змогу простіше підмінити поведінку у тестах.
 */
export class MockDeepLinkRouter {
  constructor(realRouter) {
    this.realRouter = realRouter;
    this.handledUrls = [];
  }

  handle(url) {
    this.handledUrls.push(url);
    return this.realRouter.handle(url);
  }

  reset() {
    this.handledUrls = [];
  }
}