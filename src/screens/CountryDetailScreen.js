import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import CountryRegionMap from '../components/CountryRegionMap';
import { useTravel } from '../context/TravelContext';
import { COUNTRIES_WITH_REGIONS, getCountryById } from '../data/countries';
import Country from '../models/Country';

/**
 * Екран ДЕТАЛІ обраної країни.
 * Дані беруться з екземпляру моделі Country: відображаються поля
 * name, continent, visited, isDream, dateVisited, note, а також
 * методи getStatus() та getDaysSinceVisit().
 */
export default function CountryDetailScreen({ route }) {
  const { countryId, name } = route.params;
  const config = COUNTRIES_WITH_REGIONS[countryId];
  const { regions, toggleRegion, visited, dream, updateNote } = useTravel();

  // Створюємо екземпляр Country з актуальних даних.
  // UI нижче працює напряму з полями/методами цього об'єкта.
  const country = useMemo(() => {
    const meta = getCountryById(countryId);
    const v = visited.find((c) => c.id === countryId);
    const d = dream.find((c) => c.id === countryId);
    return new Country(
      countryId,
      name,
      meta?.continent || '',
      !!v,
      !!d,
      v?.date ? new Date(v.date) : null,
      v?.note || d?.note || ''
    );
  }, [countryId, name, visited, dream]);

  const visitedRegions = regions[countryId] || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Основна інформація — поля моделі Country */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{country.name}</Text>
        <Text style={styles.continent}>🌍 {country.continent}</Text>
        <Text style={styles.status}>{country.getStatus()}</Text>
        {country.dateVisited && (
          <Text style={styles.date}>
            📅 Відвідано: {country.dateVisited.toLocaleDateString('uk-UA')}
            {country.getDaysSinceVisit() !== null &&
              ` (${country.getDaysSinceVisit()} дн. тому)`}
          </Text>
        )}
      </View>

      {/* Мапа регіонів (якщо є) */}
      {config && (
        <>
          <Text style={styles.hint}>
            Торкнись регіону, щоб позначити його як відвіданий.
          </Text>
          <CountryRegionMap
            config={config}
            countryId={countryId}
            visitedRegions={visitedRegions}
            onRegionPress={(regionName) => toggleRegion(countryId, regionName)}
          />
          <View style={styles.stats}>
            <Text style={styles.statsTxt}>
              Відвідано регіонів: {visitedRegions.length}
            </Text>
          </View>
        </>
      )}

      {!config && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTxt}>
            Для цієї країни поки немає детальної карти регіонів.
          </Text>
        </View>
      )}

      {visitedRegions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Відвідані регіони</Text>
          {visitedRegions.map((r) => (
            <Text key={r} style={styles.regionItem}>• {r}</Text>
          ))}
        </View>
      )}

      {/* Нотатка — редагуємо поле country.note */}
      {(country.visited || country.isDream) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Нотатка</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Твої враження або плани..."
            multiline
            value={country.note}
            onChangeText={(text) =>
              updateNote(country.visited ? 'visited' : 'dream', countryId, text)
            }
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerCard: {
    padding: 20,
    backgroundColor: '#f5f7fa',
    margin: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  continent: { fontSize: 14, color: '#666', marginTop: 6 },
  status: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  date: { fontSize: 13, color: '#2e7d32', marginTop: 6 },
  hint: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  stats: { padding: 16, alignItems: 'center' },
  statsTxt: { fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#f7f7f7',
    margin: 12,
    padding: 14,
    borderRadius: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  regionItem: { fontSize: 14, paddingVertical: 2 },
  noteInput: {
    minHeight: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  infoCard: {
    margin: 12,
    padding: 14,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
  },
  infoTxt: { color: '#666', textAlign: 'center' },
});