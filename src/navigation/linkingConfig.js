import * as Linking from 'expo-linking';

/**
 * Конфігурація `linking` для React Navigation.
 *
 * Використовується у <NavigationContainer linking={linkingConfig}>.
 * React Navigation сама обробляє холодний/теплий старт через `expo-linking`,
 * парсить URL за `prefixes` і вивідить параметри через `config`.
 *
 * Працює паралельно з нашим DeepLinkRouter:
 *  - DeepLinkRouter — наш кастомний шар (для тестів і явного API)
 *  - linkingConfig — налаштування React Navigation (для автоматичного підхоплення URL)
 */
export const linkingConfig = {
  prefixes: [
    Linking.createURL('/'),       // travelmap:// (від схеми у app.json)
    'travelmap://',
    'https://travelmap.app',
  ],
  config: {
    screens: {
      Map: {
        screens: {
          MapMain: 'home',
          CountryDetail: 'country/:countryId',
          RegionDetail: 'country/:countryId/region/:regionName',
        },
      },
      List: {
        screens: {
          CountriesList: 'catalog',
        },
      },
      Achievements: 'achievements',
      Profile: 'profile',
      Security: 'security',
      Live: 'live',
      Invite: 'invite/:token',
      Debug: 'debug',
    },
  },
};