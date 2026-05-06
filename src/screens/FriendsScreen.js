/**
 * src/screens/FriendsScreen.js
 *
 * — Кнопка 📡 відкриває стрічку (LiveFeedScreen) у тому ж стеку
 * — Тап по другу → FriendProfileScreen
 * — Кнопка ✕ → видалити друга
 * — Запити вгорі як секція (без окремого табу)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SectionList, ActivityIndicator, Alert, Share, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  createInviteToken,
} from '../api/friendsApi';

export default function FriendsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [friends, setFriends]   = useState([]);
  const [pending, setPending]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleAccept = async (friendshipId) => {
    try { await acceptFriendRequest(friendshipId); load(true); }
    catch (e) { Alert.alert('Помилка', e.message); }
  };

  const handleDecline = async (friendshipId) => {
    try { await declineFriendRequest(friendshipId); load(true); }
    catch (e) { Alert.alert('Помилка', e.message); }
  };

  const handleRemove = (friend) => {
    Alert.alert(
      'Видалити друга?',
      `${friend.username} буде видалений зі списку друзів.`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try { await removeFriend(friend.friendshipId); load(true); }
            catch (e) { Alert.alert('Помилка', e.message); }
          },
        },
      ]
    );
  };

  const handleInvite = async () => {
    setGeneratingInvite(true);
    try {
      const { token, link } = await createInviteToken();
      const productionLink = `travelmap://invite/${token}`;
      await Share.share({
        message:
          `Привіт! Долучайся до Wish2Go Map 🌍\n\n` +
          `📱 Expo Go — відкрий посилання:\n${link}\n\n` +
          `🔑 Або введи посилання вручну в застосунку:\n${productionLink}`,
        title: 'Запрошення до Wish2Go Map',
      });
    } catch (e) {
      if (e.message !== 'User did not share') Alert.alert('Помилка', e.message);
    } finally {
      setGeneratingInvite(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2e7d32" /></View>;
  }

  const sections = [];
  if (pending.length > 0) {
    sections.push({ title: `Запити (${pending.length})`, type: 'requests', data: pending });
  }
  sections.push({
    title: friends.length > 0 ? `Друзі (${friends.length})` : 'Друзі',
    type: 'friends',
    data: friends.length > 0 ? friends : [{ _empty: true, id: '__empty__' }],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 Друзі</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.feedBtn}
            onPress={() => navigation.navigate('LiveFeed')}
          >
            <Text style={styles.feedBtnText}>📡</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inviteBtn, generatingInvite && styles.btnDisabled]}
            onPress={handleInvite}
            disabled={generatingInvite}
          >
            {generatingInvite
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.inviteBtnText}>+ Запросити</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id || '__empty__'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            {section.type === 'requests' && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
              </View>
            )}
            <Text style={[styles.sectionTitle, section.type === 'requests' && styles.sectionTitleRequest]}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item, section }) => {
          if (item._empty) {
            return (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🌍</Text>
                <Text style={styles.emptyTitle}>Ще немає друзів</Text>
                <Text style={styles.emptyText}>Натисни «+ Запросити» щоб поділитися посиланням</Text>
              </View>
            );
          }

          if (section.type === 'requests') {
            return (
              <View style={[styles.card, styles.cardRequest]}>
                <View style={[styles.avatar, styles.avatarRequest]}>
                  <Text style={styles.avatarText}>{(item.sender?.username || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.sender?.username}</Text>
                  <Text style={styles.cardSub}>Хоче додати тебе в друзі</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                    <Text style={styles.acceptText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item.id)}>
                    <Text style={styles.declineText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('FriendProfile', {
                friendId: item.id,
                friendshipId: item.friendshipId,
                username: item.username,
              })}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.username}</Text>
                <Text style={styles.cardSub}>Переглянути профіль →</Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1b5e20' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  feedBtn: {
    width: 40, height: 36, borderRadius: 18,
    backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center',
  },
  feedBtnText: { fontSize: 18 },
  inviteBtn: {
    backgroundColor: '#2e7d32', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, minWidth: 110, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  inviteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 20, marginBottom: 6, gap: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitleRequest: { color: '#e65100' },
  sectionBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#e53935', justifyContent: 'center', alignItems: 'center',
  },
  sectionBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    padding: 14, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardRequest: { borderLeftWidth: 3, borderLeftColor: '#ff8f00' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#c8e6c9', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarRequest: { backgroundColor: '#ffe0b2' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#2e7d32' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#222' },
  cardSub: { fontSize: 12, color: '#bbb', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center',
  },
  acceptText: { color: '#2e7d32', fontSize: 16, fontWeight: '700' },
  declineBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fce4ec', justifyContent: 'center', alignItems: 'center',
  },
  declineText: { color: '#e53935', fontSize: 14, fontWeight: '700' },
  removeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fce4ec', justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  removeText: { color: '#e53935', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});