import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTravel } from '../context/TravelContext';
import { COUNTRIES, COUNTRIES_WITH_REGIONS } from '../data/countries';
import Country from '../models/Country';

/**
 * Екран СПИСКУ всіх країн (за вимогою лаби - екран, що
 * відображає колекцію об'єктів через FlatList).
 *
 * Тап на елемент списку відкриває екран деталі країни.
 * Є пошук та фільтри (Усі / Відвідані / Мрії).
 */
export default function CountriesListScreen({ navigation }) {
  const { visited, dream } = useTravel();
  const [filter, setFilter] = useState('all'); // all | visited | dream
  const [search, setSearch] = useState('');

  // Будуємо колекцію екземплярів моделі Country.
  // Для кожної країни з бази визначаємо її поточний стан (visited / dream).
  const countries = useMemo(() => {
    return COUNTRIES.map((c) => {
      const v = visited.find((x) => x.id === c.id);
      const d = dream.find((x) => x.id === c.id);
      return new Country(
        c.id,
        c.name,
        c.continent,
        !!v,
        !!d,
        v?.date ? new Date(v.date) : null,
        v?.note || d?.note || ''
      );
    });
  }, [visited, dream]);

  // Фільтрація + пошук
  const filtered = useMemo(() => {
    let list = countries;
    if (filter === 'visited') list = list.filter((c) => c.visited);
    else if (filter === 'dream') list = list.filter((c) => c.isDream);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.continent.toLowerCase().includes(q)
      );
    }
    // Сортуємо: відвідані → мрії → інші, в межах групи за алфавітом
    return list.sort((a, b) => {
      const aScore = a.visited ? 0 : a.isDream ? 1 : 2;
      const bScore = b.visited ? 0 : b.isDream ? 1 : 2;
      if (aScore !== bScore) return aScore - bScore;
      return a.name.localeCompare(b.name);
    });
  }, [countries, filter, search]);

  const openDetail = (country) => {
    // Перехід на екран деталі (вимога навігації лаби)
    navigation.navigate('CountryDetail', {
      countryId: country.id,
      name: country.name,
    });
  };

  // Рендер одного елемента списку. Поля беруться з екземпляру моделі Country.
  const renderItem = ({ item }) => {
    const hasRegions = !!COUNTRIES_WITH_REGIONS[item.id];
    return (
      <TouchableOpacity style={styles.item} onPress={() => openDetail(item)}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemContinent}>{item.continent}</Text>
          {item.dateVisited && (
            <Text style={styles.itemDate}>
              Відвідано: {item.dateVisited.toLocaleDateString('uk-UA')}
              {item.getDaysSinceVisit() !== null &&
                ` (${item.getDaysSinceVisit()} дн. тому)`}
            </Text>
          )}
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.status}>{item.getStatus()}</Text>
          {hasRegions && <Text style={styles.hint}>→ регіони</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Список країн</Text>

      <TextInput
        style={styles.search}
        placeholder="Пошук за назвою або континентом..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        <FilterButton
          label={`Усі (${countries.length})`}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterButton
          label={`✅ Відвідані (${countries.filter((c) => c.visited).length})`}
          active={filter === 'visited'}
          onPress={() => setFilter('visited')}
        />
        <FilterButton
          label={`💭 Мрії (${countries.filter((c) => c.isDream).length})`}
          active={filter === 'dream'}
          onPress={() => setFilter('dream')}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={filtered.length === 0 && styles.emptyBox}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'Нічого не знайдено' : 'Немає країн у цій категорії'}
          </Text>
        }
      />
    </View>
  );
}

function FilterButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterBtn, active && styles.filterBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  search: {
    marginHorizontal: 12,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 10,
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eee',
    borderRadius: 16,
  },
  filterBtnActive: { backgroundColor: '#2e7d32' },
  filterTxt: { color: '#333', fontSize: 12, fontWeight: '600' },
  filterTxtActive: { color: '#fff' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
  },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#111' },
  itemContinent: { fontSize: 13, color: '#666', marginTop: 2 },
  itemDate: { fontSize: 11, color: '#999', marginTop: 4 },
  itemRight: { alignItems: 'flex-end' },
  status: { fontSize: 13, fontWeight: '500' },
  hint: { fontSize: 11, color: '#2196f3', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 14 },
  empty: { textAlign: 'center', color: '#999', padding: 40 },
  emptyBox: { flexGrow: 1, justifyContent: 'center' },
});
