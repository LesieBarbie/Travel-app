import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  AppState, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../api/supabaseClient';
import { getFriends } from '../api/friendsApi';
import { ACHIEVEMENTS } from '../data/achievements';

const MAX_EVENTS = 50;

// Словник іконок по id ачивки з локального списку
const ACH_ICON_MAP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a.icon || '🏆']));

function formatVisitEvent(row, username) {
  const ts = new Date(row.updated_at || row.created_at || Date.now());
  return {
    id: `visit-${row.id}`,
    type: 'visit',
    icon: '✈️',
    text: `${username} відвідав(ла) ${row.name || row.country_code || '—'}`,
    timestamp: ts.getTime(),
    time: ts.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
    color: '#e8f5e9',
    borderColor: '#a5d6a7',
  };
}

function formatAchievementEvent(row, username) {
  const ts = new Date(row.created_at || Date.now());
  const icon = ACH_ICON_MAP[row.achievement_id] || '🏆';
  const title = row.achievement_title || row.achievement_id || 'Досягнення';
  return {
    id: `ach-${row.id}`,
    type: 'achievement',
    icon,
    text: `${username} отримав(ла) «${title}»`,
    timestamp: ts.getTime(),
    time: ts.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
    color: '#fff8e1',
    borderColor: '#ffe082',
  };
}

// Злиття двох списків без дублів + сортування новіші-вгорі
function mergeEvents(existing, incoming) {
  const map = new Map(existing.map(e => [e.id, e]));
  for (const e of incoming) map.set(e.id, e);
  return Array.from(map.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_EVENTS);
}

export default function LiveFeedScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState([]);

  const channelVisitsRef = useRef(null);
  const channelAchRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setup();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        channelVisitsRef.current?.unsubscribe();
        channelAchRef.current?.unsubscribe();
        setConnected(false);
      }
      if (next === 'active' && appState.current === 'background') {
        setup();
      }
      appState.current = next;
    });

    return () => {
      mountedRef.current = false;
      appSub.remove();
      channelVisitsRef.current?.unsubscribe();
      channelAchRef.current?.unsubscribe();
    };
  }, []);

  async function setup() {
    try {
      const friends = await getFriends();
      if (!mountedRef.current) return;

      const ids = friends.map(f => f.id);
      const map = Object.fromEntries(friends.map(f => [f.id, f.username]));
      setFriendIds(ids);

      if (ids.length > 0) {
        // Останні відвідані країни
        const { data: visits } = await supabase
          .from('countries')
          .select('*')
          .in('user_id', ids)
          .eq('visited', true)
          .order('updated_at', { ascending: false })
          .limit(20);

        // Ачивки ТІЛЬКИ з achievement_unlocks
        const { data: achievements } = await supabase
          .from('achievement_unlocks')
          .select('*')
          .in('user_id', ids)
          .order('created_at', { ascending: false })
          .limit(20);

        if (mountedRef.current) {
          const visitEvents = (visits || []).map(v =>
            formatVisitEvent(v, map[v.user_id] || 'Друг')
          );
          const achEvents = (achievements || []).map(a =>
            formatAchievementEvent(a, map[a.user_id] || 'Друг')
          );

          // mergeEvents дедублікує та сортує за timestamp
          setEvents(mergeEvents(visitEvents, achEvents));
        }
      }

      subscribeRealtime(ids, map);
    } catch (e) {
      console.warn('[LiveFeed] setup error:', e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  function subscribeRealtime(ids, map) {
    if (ids.length === 0) return;

    channelVisitsRef.current?.unsubscribe();
    channelAchRef.current?.unsubscribe();

    // Канал: країни
    const visitChannel = supabase
      .channel('friends-countries')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'countries' }, (payload) => {
        const row = payload.new;
        if (!ids.includes(row.user_id) || !row.visited) return;
        const event = formatVisitEvent(row, map[row.user_id] || 'Друг');
        setEvents(prev => mergeEvents(prev, [event]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'countries' }, (payload) => {
        const row = payload.new;
        if (!ids.includes(row.user_id) || !row.visited) return;
        if (payload.old?.visited === true) return; // вже відвідана — не дублюємо
        const event = formatVisitEvent(row, map[row.user_id] || 'Друг');
        setEvents(prev => mergeEvents(prev, [event]));
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    // Канал: ачивки з achievement_unlocks
    const achChannel = supabase
      .channel('friends-achievement-unlocks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'achievement_unlocks' }, (payload) => {
        const row = payload.new;
        if (!ids.includes(row.user_id)) return;
        const event = formatAchievementEvent(row, map[row.user_id] || 'Друг');
        setEvents(prev => mergeEvents(prev, [event]));
      })
      .subscribe();

    channelVisitsRef.current = visitChannel;
    channelAchRef.current = achChannel;
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Завантажуємо стрічку...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>📡 Стрічка друзів</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? '#2e7d32' : '#bbb' }]} />
          <Text style={[styles.statusText, { color: connected ? '#2e7d32' : '#bbb' }]}>
            {connected ? 'Онлайн' : 'Відключено'}
          </Text>
        </View>
      </View>

      {events.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>✈️</Text>
            <Text style={styles.legendText}>Візит</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>🏆</Text>
            <Text style={styles.legendText}>Досягнення</Text>
          </View>
        </View>
      )}

      {friendIds.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>Немає друзів</Text>
          <Text style={styles.emptyText}>
            Додай друзів у розділі «Друзі» щоб бачити їх активність тут
          </Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌍</Text>
          <Text style={styles.emptyTitle}>Поки тихо</Text>
          <Text style={styles.emptyText}>
            Нові події з'являться коли твої друзі відвідають країну або отримають досягнення
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 24 }}>
          {events.map(e => (
            <View key={e.id} style={[styles.card, { backgroundColor: e.color, borderLeftColor: e.borderColor }]}>
              <Text style={styles.cardIcon}>{e.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardText}>{e.text}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardType}>{e.type === 'visit' ? 'Візит' : 'Досягнення'}</Text>
                  <Text style={styles.cardTime}>{e.time}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#999', fontSize: 14 },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1b5e20' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: '500' },
  legend: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    gap: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendIcon: { fontSize: 14 },
  legendText: { fontSize: 12, color: '#888' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptyText: {
    fontSize: 14, color: '#999', marginTop: 6,
    textAlign: 'center', paddingHorizontal: 40, lineHeight: 20,
  },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardIcon: { fontSize: 24, marginRight: 12 },
  cardText: { fontSize: 15, color: '#222', flexShrink: 1, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  cardType: { fontSize: 11, color: '#aaa', fontWeight: '500' },
  cardTime: { fontSize: 12, color: '#aaa' },
});