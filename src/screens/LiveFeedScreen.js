/**
 * src/screens/LiveFeedScreen.js  ← ЗАМЕНИТЬ существующий файл
 *
 * Стрічка активності друзів через Supabase Realtime.
 * Слухає таблицю country_visits і показує події в реальному часі.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  AppState, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../api/supabaseClient';
import { getFriends } from '../api/friendsApi';

const MAX_EVENTS = 30;

// Конвертуємо запис БД в подію для відображення
function formatVisitEvent(visit, friendUsername) {
  return {
    id: visit.id || `${Date.now()}-${Math.random()}`,
    icon: '✈️',
    text: `${friendUsername} відвідав(ла) ${visit.country_name || visit.country_id}`,
    time: new Date(visit.created_at || Date.now()).toLocaleTimeString('uk-UA', {
      hour: '2-digit', minute: '2-digit',
    }),
    raw: visit,
  };
}

export default function LiveFeedScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState([]);
  const [friendMap, setFriendMap] = useState({}); // id → username
  const channelRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Завантажити друзів і підписатись на Realtime
  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const friends = await getFriends();
        if (!mounted) return;

        const ids = friends.map(f => f.id);
        const map = Object.fromEntries(friends.map(f => [f.id, f.username]));
        setFriendIds(ids);
        setFriendMap(map);

        // Завантажити останні 20 візитів друзів
        if (ids.length > 0) {
          const { data } = await supabase
            .from('country_visits')
            .select('*')
            .in('user_id', ids)
            .order('created_at', { ascending: false })
            .limit(20);

          if (mounted && data) {
            const formatted = data.map(v => formatVisitEvent(v, map[v.user_id] || 'Друг'));
            setEvents(formatted);
          }
        }

        // Підписка на нові візити
        subscribeRealtime(ids, map);
      } catch (e) {
        console.warn('[LiveFeed] setup error:', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setup();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        channelRef.current?.unsubscribe();
        setConnected(false);
      }
      if (next === 'active' && appState.current === 'background') {
        setup();
      }
      appState.current = next;
    });

    return () => {
      mounted = false;
      appSub.remove();
      channelRef.current?.unsubscribe();
    };
  }, []);

  function subscribeRealtime(ids, map) {
    if (ids.length === 0) return;

    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel('friends-visits')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'country_visits',
          // Фільтр: тільки візити наших друзів
          filter: `user_id=in.(${ids.join(',')})`,
        },
        (payload) => {
          const visit = payload.new;
          const username = map[visit.user_id] || 'Друг';
          const event = formatVisitEvent(visit, username);
          setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS));
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
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
      {/* Хедер */}
      <View style={styles.header}>
        <Text style={styles.title}>📡 Стрічка друзів</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? '#2e7d32' : '#999' }]} />
          <Text style={[styles.statusText, { color: connected ? '#2e7d32' : '#999' }]}>
            {connected ? 'Онлайн' : 'Відключено'}
          </Text>
        </View>
      </View>

      {/* Немає друзів */}
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
            Нові події з'являться коли твої друзі відвідають країну
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20 }}>
          {events.map(e => (
            <View key={e.id} style={styles.card}>
              <Text style={styles.cardIcon}>{e.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardText}>{e.text}</Text>
                <Text style={styles.cardTime}>{e.time}</Text>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptyText: {
    fontSize: 14, color: '#999', marginTop: 6,
    textAlign: 'center', paddingHorizontal: 40, lineHeight: 20,
  },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardIcon: { fontSize: 24, marginRight: 12 },
  cardText: { fontSize: 15, color: '#222', flexShrink: 1 },
  cardTime: { fontSize: 12, color: '#999', marginTop: 4 },
});
