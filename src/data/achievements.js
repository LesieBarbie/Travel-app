import { COUNTRIES } from './countries';

const countInContinent = (visited, continent) =>
  visited.filter((v) => {
    const country = COUNTRIES.find((c) => c.id === v.id);
    return country?.continent === continent;
  }).length;

export const ACHIEVEMENTS = [
  // Milestones
  {
    id: 'first_step',
    title: 'Перший крок',
    description: 'Відвідай свою першу країну',
    icon: '👣',
    check: (visited) => visited.length >= 1,
  },
  {
    id: 'traveler_5',
    title: 'Початківець',
    description: 'Відвідай 5 країн',
    icon: '🎒',
    check: (visited) => visited.length >= 5,
  },
  {
    id: 'traveler_10',
    title: 'Мандрівник',
    description: 'Відвідай 10 країн',
    icon: '✈️',
    check: (visited) => visited.length >= 10,
  },
  {
    id: 'traveler_25',
    title: 'Досвідчений мандрівник',
    description: 'Відвідай 25 країн',
    icon: '🗺️',
    check: (visited) => visited.length >= 25,
  },
  {
    id: 'traveler_50',
    title: 'Глобтротер',
    description: 'Відвідай 50 країн',
    icon: '🌍',
    check: (visited) => visited.length >= 50,
  },
  {
    id: 'traveler_100',
    title: 'Легенда',
    description: 'Відвідай 100 країн',
    icon: '🏆',
    check: (visited) => visited.length >= 100,
  },

  // Continents
  {
    id: 'europe_10',
    title: 'Європеєць',
    description: 'Відвідай 10 країн Європи',
    icon: '🇪🇺',
    check: (visited) => countInContinent(visited, 'Європа') >= 10,
  },
  {
    id: 'europe_all',
    title: 'Вся Європа',
    description: 'Відвідай усі країни Європи',
    icon: '🏰',
    check: (visited) =>
      countInContinent(visited, 'Європа') >=
      COUNTRIES.filter((c) => c.continent === 'Європа').length,
  },
  {
    id: 'asia_5',
    title: 'Азіат',
    description: 'Відвідай 5 країн Азії',
    icon: '🏯',
    check: (visited) => countInContinent(visited, 'Азія') >= 5,
  },
  {
    id: 'americas',
    title: 'Обидві Америки',
    description: 'Відвідай хоча б одну країну в обох Америках',
    icon: '🗽',
    check: (visited) =>
      countInContinent(visited, 'Північна Америка') >= 1 &&
      countInContinent(visited, 'Південна Америка') >= 1,
  },
  {
    id: 'africa_first',
    title: 'Сафарі',
    description: 'Відвідай першу країну Африки',
    icon: '🦁',
    check: (visited) => countInContinent(visited, 'Африка') >= 1,
  },
  {
    id: 'oceania_first',
    title: 'Острови',
    description: 'Відвідай першу країну Океанії',
    icon: '🏝️',
    check: (visited) => countInContinent(visited, 'Океанія') >= 1,
  },
  {
    id: 'all_continents',
    title: 'Усі континенти',
    description: 'Відвідай країну на кожному з 6 континентів',
    icon: '🌐',
    check: (visited) => {
      const continents = [
        'Європа',
        'Азія',
        'Африка',
        'Північна Америка',
        'Південна Америка',
        'Океанія',
      ];
      return continents.every((c) => countInContinent(visited, c) >= 1);
    },
  },

  // Fun
  {
    id: 'dreamer',
    title: 'Мрійник',
    description: 'Додай 10 країн у список мрій',
    icon: '💭',
    check: (visited, dream) => dream.length >= 10,
  },
];

export function getUnlockedAchievements(visited, dream) {
  return ACHIEVEMENTS.filter((a) => a.check(visited, dream));
}
