import * as Linking from 'expo-linking';

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
      Friends: 'friends',
      Invite: 'invite/:token',
      Debug: 'debug',
    },
  },
};