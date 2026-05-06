import * as Linking from 'expo-linking';

export const DestinationType = Object.freeze({
  HOME: 'home',
  COUNTRY: 'country',
  REGION: 'region',
  CATALOG: 'catalog',
  INVITE: 'invite',
  ACHIEVEMENTS: 'achievements',
  FRIENDS: 'friends',
  LIVE_FEED: 'live',
  PROFILE: 'profile',
});

export const Destination = {
  Home: () => ({ type: DestinationType.HOME }),
  Country: (id) => ({ type: DestinationType.COUNTRY, id }),
  Region: (countryId, name) => ({ type: DestinationType.REGION, countryId, name }),
  Catalog: (filter = null) => ({ type: DestinationType.CATALOG, filter }),
  Invite: (token) => ({ type: DestinationType.INVITE, token }),
  Achievements: () => ({ type: DestinationType.ACHIEVEMENTS }),
  Friends: () => ({ type: DestinationType.FRIENDS }),
  LiveFeed: () => ({ type: DestinationType.LIVE_FEED }),
  Profile: () => ({ type: DestinationType.PROFILE }),
};

export default class DeepLinkRouter {
  constructor(navigation = null) {
    this.navigation = navigation;
    this.currentDestination = null;
    this.pendingDestination = null;
    this.listeners = [];
  }

  setNavigation(navigation) {
    this.navigation = navigation;
    if (this.pendingDestination) {
      this.navigate(this.pendingDestination);
      this.pendingDestination = null;
    }
  }

  parseURL(url) {
    if (!url || typeof url !== 'string') return null;

    let parsed;
    try {
      parsed = Linking.parse(url);
    } catch (e) {
      console.warn('[DeepLinkRouter] Failed to parse URL:', url, e.message);
      return null;
    }

    const isHttps = parsed.scheme === 'https';
    let segments;

    if (isHttps) {
      const pathStr = parsed.path || '';
      segments = pathStr.split('/').filter(Boolean);
    } else {
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
      if (first === 'home') return Destination.Home();

      if (first === 'country' && second && segments.length === 2)
        return Destination.Country(second);

      if (first === 'country' && second && third === 'region' && fourth && segments.length === 4)
        return Destination.Region(second, decodeURIComponent(fourth));

      if (first === 'catalog' && segments.length === 1)
        return Destination.Catalog(queryParams.filter || null);

      if (first === 'invite' && second && segments.length === 2)
        return Destination.Invite(second);

      if (first === 'achievements' && segments.length === 1)
        return Destination.Achievements();

      if (first === 'friends' && segments.length === 1)
        return Destination.Friends();

      if (first === 'live' && segments.length === 1)
        return Destination.LiveFeed();

      if (first === 'profile' && segments.length === 1)
        return Destination.Profile();

      return null;
    } catch (e) {
      console.warn('[DeepLinkRouter] parseURL error:', e.message);
      return null;
    }
  }

  handle(url) {
    const destination = this.parseURL(url);
    if (!destination) {
      console.log('[DeepLinkRouter] Ignored invalid URL:', url);
      return false;
    }
    this.navigate(destination);
    return true;
  }

  navigate(destination) {
    if (!destination) return;

    this.currentDestination = destination;
    this._notifyListeners();

    if (!this.navigation) {
      this.pendingDestination = destination;
      return;
    }

    try {
      switch (destination.type) {
        case DestinationType.HOME:
          this.navigation.navigate('Main', { screen: 'Map' });
          break;

        case DestinationType.COUNTRY:
          this.navigation.navigate('Main', {
            screen: 'Map',
            params: {
              screen: 'CountryDetail',
              params: { countryId: destination.id, name: '' },
            },
          });
          break;

        case DestinationType.REGION:
          this.navigation.navigate('Main', {
            screen: 'Map',
            params: {
              screen: 'RegionDetail',
              params: { countryId: destination.countryId, regionName: destination.name },
            },
          });
          break;

        case DestinationType.CATALOG:
          this.navigation.navigate('Main', {
            screen: 'List',
            params: {
              screen: 'CountriesList',
              params: { initialFilter: destination.filter },
            },
          });
          break;

        case DestinationType.ACHIEVEMENTS:
          this.navigation.navigate('Main', { screen: 'Achievements' });
          break;

        case DestinationType.FRIENDS:
          this.navigation.navigate('Main', {
            screen: 'Friends',
            params: { screen: 'FriendsList' },
          });
          break;

        case DestinationType.LIVE_FEED:
          this.navigation.navigate('Main', {
            screen: 'Friends',
            params: { screen: 'LiveFeed' },
          });
          break;

        case DestinationType.PROFILE:
          this.navigation.navigate('Main', { screen: 'Profile' });
          break;

        case DestinationType.INVITE:
          this.navigation.navigate('Invite', { token: destination.token });
          break;

        default:
          console.warn('[DeepLinkRouter] Unknown destination type:', destination.type);
      }
    } catch (e) {
      console.warn('[DeepLinkRouter] navigate error:', e.message);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  _notifyListeners() {
    for (const l of this.listeners) {
      try { l(this.currentDestination); } catch {}
    }
  }

  static buildURL(destination, useHttps = false) {
    const base = useHttps ? 'https://travelmap.app' : 'travelmap:/';
    switch (destination.type) {
      case DestinationType.HOME:         return `${base}/home`;
      case DestinationType.COUNTRY:      return `${base}/country/${destination.id}`;
      case DestinationType.REGION:       return `${base}/country/${destination.countryId}/region/${encodeURIComponent(destination.name)}`;
      case DestinationType.CATALOG:      return destination.filter ? `${base}/catalog?filter=${destination.filter}` : `${base}/catalog`;
      case DestinationType.INVITE:       return `${base}/invite/${destination.token}`;
      case DestinationType.ACHIEVEMENTS: return `${base}/achievements`;
      case DestinationType.FRIENDS:      return `${base}/friends`;
      case DestinationType.LIVE_FEED:    return `${base}/live`;
      case DestinationType.PROFILE:      return `${base}/profile`;
      default: return null;
    }
  }
}

export class MockDeepLinkRouter {
  constructor(realRouter) {
    this.realRouter = realRouter;
    this.handledUrls = [];
  }
  handle(url) {
    this.handledUrls.push(url);
    return this.realRouter.handle(url);
  }
  reset() { this.handledUrls = []; }
}