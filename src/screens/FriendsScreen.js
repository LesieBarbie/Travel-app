/**
 * src/screens/FriendsScreen.js  ← ЗАМЕНИТЬ
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Share, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  createInviteToken,
} from '../api/friendsApi';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('friends');
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [f, p] = await Promise.all([getFriends(), getPendingRequests()]);
      setFriends(f);
      setPending(p);
    } catch (e) {
      Alert.alert('Помилка завантаження', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const handleAccept = async (friendshipId) => {
    try {
      await acceptFriendRequest(friendshipId);
      load(true);
    } catch (e) {
      Alert.alert('Помилка', e.message);
    }
  };

  const handleDecline = async (friendshipId) => {
    try {
      await declineFriendRequest(friendshipId);
      load(true);
    } catch (e) {
      Alert.alert('Помилка', e.message);
    }
  };

  const handleInvite = async () => {
    setGeneratingInvite(true);
    try {
      const { token, link } = await createInviteToken();

      // Посилання для Expo Go (exp://...)
      const expoLink = link;
      // Посилання для production build (travelmap://...)
      const productionLink = `travelmap://invite/${token}`;

      await Share.share({
        message:
          `Привіт! Долучайся до Travel Wish Map 🌍\n\n` +
          `📱 Expo Go — відкрий посилання:\n${expoLink}\n\n` +
          `🔗 Production build:\n${productionLink}\n\n` +
          `🔑 Або введи токен вручну в розділі «Друзі»:\n${token}`,
        title: 'Запрошення до Travel Wish Map',
      });
    } catch (e) {
      if (e.message !== 'User did not share') {
        Alert.alert('Помилка', e.message);
      }
    } finally {
      setGeneratingInvite(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Хедер */}
      <View style={styles.header}>
        <Text style={styles.title}>👥 Друзі</Text>
        <TouchableOpacity
          style={[styles.inviteBtn, generatingInvite && styles.inviteBtnDisabled]}
          onPress={handleInvite}
          disabled={generatingInvite}
        >
          {generatingInvite
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.inviteBtnText}>+ Запросити</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Таби */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'friends' && styles.tabActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            Друзі {friends.length > 0 ? `(${friends.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'requests' && styles.tabActive]}
          onPress={() => setTab('requests')}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            Запити {pending.length > 0 ? `(${pending.length})` : ''}
          </Text>
          {pending.length > 0 && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      {/* Список друзів */}
      {tab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={friends.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌍</Text>
              <Text style={styles.emptyTitle}>Ще немає друзів</Text>
              <Text style={styles.emptyText}>
                Натисни «+ Запросити» щоб поділитися посиланням
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.username || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.username}</Text>
                <Text style={styles.cardSub}>Друг</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Список запитів */}
      {tab === 'requests' && (
        <FlatList
          data={pending}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={pending.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📬</Text>
              <Text style={styles.emptyTitle}>Немає запитів</Text>
              <Text style={styles.emptyText}>Нові запити з'являться тут</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.sender?.username || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.sender?.username}</Text>
                <Text style={styles.cardSub}>Хоче додати тебе в друзі</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(item.id)}
                >
                  <Text style={styles.acceptText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => handleDecline(item.id)}
                >
                  <Text style={styles.declineText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1b5e20' },
  inviteBtn: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 110,
    alignItems: 'center',
  },
  inviteBtnDisabled: { opacity: 0.6 },
  inviteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1, paddingVertical: 12,
    alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2e7d32' },
  tabText: { fontSize: 14, color: '#999', fontWeight: '500' },
  tabTextActive: { color: '#2e7d32', fontWeight: '700' },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e53935', marginLeft: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 10,
    padding: 14, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#c8e6c9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#2e7d32' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#222' },
  cardSub: { fontSize: 13, color: '#999', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center', alignItems: 'center',
  },
  acceptText: { color: '#2e7d32', fontSize: 16, fontWeight: '700' },
  declineBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fce4ec',
    justifyContent: 'center', alignItems: 'center',
  },
  declineText: { color: '#e53935', fontSize: 14, fontWeight: '700' },

  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});