/**
 * src/api/friendsApi.js  ← ЗАМЕНИТЬ
 *
 * Виправлено:
 * 1. Прибрані JOIN через FK (Supabase не бачить зв'язку без міграції)
 *    — замість цього робимо два окремих запити і з'єднуємо вручну
 * 2. Інвайт-посилання генерується у форматі Expo Go tunnel
 */

import { supabase } from './supabaseClient';
import { nanoid } from 'nanoid/non-secure';
import * as Linking from 'expo-linking';

// ─── Профіль ────────────────────────────────────────────────

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUsername(username) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ─── Допоміжна: отримати профілі по масиву id ───────────────

async function fetchProfilesByIds(ids) {
  if (!ids || ids.length === 0) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ids);
  if (error) return {};
  return Object.fromEntries((data || []).map(p => [p.id, p.username]));
}

// ─── Друзі ──────────────────────────────────────────────────

/** Список прийнятих друзів */
export async function getFriends() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const friendIds = data.map(row =>
    row.user_id === user.id ? row.friend_id : row.user_id
  );

  const profileMap = await fetchProfilesByIds(friendIds);

  return data.map(row => {
    const friendId = row.user_id === user.id ? row.friend_id : row.user_id;
    return {
      friendshipId: row.id,
      id: friendId,
      username: profileMap[friendId] || 'Користувач',
    };
  });
}

/** Вхідні запити (я — friend_id, статус pending) */
export async function getPendingRequests() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, created_at')
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const senderIds = data.map(row => row.user_id);
  const profileMap = await fetchProfilesByIds(senderIds);

  return data.map(row => ({
    id: row.id,
    created_at: row.created_at,
    sender: {
      id: row.user_id,
      username: profileMap[row.user_id] || 'Користувач',
    },
  }));
}

/** Прийняти запит */
export async function acceptFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  if (error) throw error;
}

/** Відхилити / видалити */
export async function declineFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) throw error;
}

// ─── Інвайти ────────────────────────────────────────────────

/**
 * Генерує токен і повертає посилання яке працює в Expo Go.
 * Expo Go не відкриває кастомну схему travelmap:// через Share —
 * тому використовуємо Linking.createURL() який повертає
 * правильний exp://... URL для поточного середовища.
 */
export async function createInviteToken() {
  const { data: { user } } = await supabase.auth.getUser();
  const token = nanoid(10).toUpperCase();

  const { error } = await supabase
    .from('invite_tokens')
    .insert({ token, created_by: user.id });

  if (error) throw error;

  // В Expo Go: exp://owsxozu-lesiebarbie-8081.exp.direct/--/invite/TOKEN
  // В production build: travelmap://invite/TOKEN
  const link = Linking.createURL(`invite/${token}`);

  return { token, link };
}

/** Прийняти інвайт за токеном */
export async function acceptInviteToken(token) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invite, error: findError } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('token', token.toUpperCase())
    .maybeSingle();

  if (findError) throw findError;
  if (!invite) throw new Error('Токен не знайдено');
  if (invite.used_by) throw new Error('Цей токен вже використаний');
  if (new Date(invite.expires_at) < new Date()) throw new Error('Токен прострочений');
  if (invite.created_by === user.id) throw new Error('Не можна додати самого себе');

  const { data: existing } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(user_id.eq.${invite.created_by},friend_id.eq.${user.id}),` +
      `and(user_id.eq.${user.id},friend_id.eq.${invite.created_by})`
    )
    .maybeSingle();

  if (existing) throw new Error('Ви вже друзі');

  const { error: friendError } = await supabase
    .from('friendships')
    .insert({
      user_id: invite.created_by,
      friend_id: user.id,
      status: 'accepted',
    });

  if (friendError) throw friendError;

  await supabase
    .from('invite_tokens')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('token', token.toUpperCase());

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', invite.created_by)
    .maybeSingle();

  return senderProfile;
}