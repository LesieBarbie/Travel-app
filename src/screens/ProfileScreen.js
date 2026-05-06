import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  TextInput, Switch, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { useTravel } from '../context/TravelContext';
import { useAuth } from '../context/AuthContext';
import { TOTAL_COUNTRIES, CONTINENT_COUNTS, getCountryById } from '../data/countries';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../data/achievements';
import UserProfile from '../models/UserProfile';
import { getMyProfile, updateUsername, acceptInviteToken } from '../api/friendsApi';
import { biometricManager } from '../utils/BiometricManager';
import DeepLinkRouter from '../navigation/DeepLinkRouter';

// Правильні пресети — ID країн числові (world-atlas), маршрути відповідають поточній навігації
const DEEPLINK_PRESETS = [
  { label: '🏠 Головна (карта)',         url: 'travelmap://home' },
  { label: '🇩🇪 Країна — Німеччина',     url: 'travelmap://country/276' },
  { label: '🇫🇷 Країна — Франція',       url: 'travelmap://country/250' },
  { label: '🇺🇦 Країна — Україна',       url: 'travelmap://country/804' },
  { label: '📋 Каталог',                 url: 'travelmap://catalog' },
  { label: '✅ Каталог (відвідані)',      url: 'travelmap://catalog?filter=visited' },
  { label: '💭 Каталог (мрії)',          url: 'travelmap://catalog?filter=dream' },
  { label: '🏆 Досягнення',             url: 'travelmap://achievements' },
  { label: '👥 Друзі',                   url: 'travelmap://friends' },
  { label: '📡 Стрічка друзів',          url: 'travelmap://live' },
  { label: '👤 Профіль',                 url: 'travelmap://profile' },
  { label: '🎁 Запрошення (тест)',       url: 'travelmap://invite/ABC123' },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { visited, dream, resetAll } = useTravel();
  const { user, signOut } = useAuth();
  const unlocked = getUnlockedAchievements(visited, dream);

  const [signingOut, setSigningOut]     = useState(false);
  const [username, setUsername]         = useState('');
  const [editingName, setEditingName]   = useState(false);
  const [nameInput, setNameInput]       = useState('');
  const [savingName, setSavingName]     = useState(false);

  const [bioEnabled, setBioEnabled]     = useState(false);
  const [bioInfo, setBioInfo]           = useState({ available: false, label: '' });

  const [inviteToken, setInviteToken]   = useState('');
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const [showDeeplinks, setShowDeeplinks] = useState(false);
  const [dlUrl, setDlUrl]               = useState('travelmap://home');
  const [dlParseResult, setDlParseResult] = useState(null);

  const router = useMemo(() => {
    const r = new DeepLinkRouter();
    r.setNavigation(navigation);
    return r;
  }, [navigation]);

  useEffect(() => {
    getMyProfile().then(p => { if (p?.username) setUsername(p.username); }).catch(() => {});
    biometricManager.checkAvailability().then(info => setBioInfo(info));
    biometricManager.isEnabledByUser().then(val => setBioEnabled(val));
  }, []);

  const profile = useMemo(() => {
    const percent = (visited.length / TOTAL_COUNTRIES) * 100;
    return new UserProfile(
      username || 'Мандрівник', visited.length, dream.length,
      parseFloat(percent.toFixed(1)), unlocked.length, true, new Date()
    );
  }, [visited.length, dream.length, unlocked.length, username]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateUsername(nameInput.trim());
      setUsername(nameInput.trim());
      setEditingName(false);
    } catch (e) { Alert.alert('Помилка', e.message); }
    finally { setSavingName(false); }
  };

  const toggleBio = async (val) => {
    setBioEnabled(val);
    await biometricManager.setEnabled(val);
  };

  const handleAcceptInvite = async () => {
    const trimmed = inviteToken.trim();
    if (!trimmed) { Alert.alert('Помилка', 'Введи посилання або токен'); return; }
    let token = trimmed;
    const match = trimmed.match(/invite\/([A-Z0-9]+)/i);
    if (match) token = match[1].toUpperCase();
    setAcceptingInvite(true);
    try {
      const sender = await acceptInviteToken(token);
      setInviteToken('');
      Alert.alert('🎉 Друг доданий!', `Ти тепер друзі з ${sender?.username || 'користувачем'}!`);
    } catch (e) { Alert.alert('Не вдалося', e.message); }
    finally { setAcceptingInvite(false); }
  };

  const handleDlOpen = () => {
    if (!dlUrl.trim()) { Alert.alert('Введіть URL'); return; }
    const ok = router.handle(dlUrl.trim());
    if (!ok) Alert.alert('Невідомий URL', 'DeepLinkRouter не зміг розпізнати цей URL.');
  };

  const handleDlParse = () => setDlParseResult(router.parseURL(dlUrl.trim()));

  const handleDlShare = async () => {
    try { await Share.share({ message: dlUrl, url: dlUrl }); }
    catch (e) { Alert.alert('Помилка', e.message); }
  };

  const confirmReset = () => {
    Alert.alert('Скинути все?', 'Це видалить усі позначки. Дію не можна скасувати.', [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Видалити все', style: 'destructive', onPress: resetAll },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Вийти з акаунту?', 'Локальні дані залишаться, але для перегляду треба буде увійти знову.', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Вийти', style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try { await signOut(); }
          catch (e) { Alert.alert('Помилка', e.message); }
          finally { setSigningOut(false); }
        },
      },
    ]);
  };

  const perContinent = {};
  for (const v of visited) {
    const c = getCountryById(v.id);
    if (c) perContinent[c.continent] = (perContinent[c.continent] || 0) + 1;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Шапка */}
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>🧭</Text></View>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput} value={nameInput} onChangeText={setNameInput}
                placeholder="Введи ім'я" autoFocus returnKeyType="done" onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity style={[styles.saveNameBtn, savingName && { opacity: 0.6 }]} onPress={handleSaveName} disabled={savingName}>
                {savingName ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveNameTxt}>Зберегти</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={styles.cancelNameBtn}>
                <Text style={styles.cancelNameTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={() => { setNameInput(username); setEditingName(true); }}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.nameEditHint}>✏️</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.rank}>{profile.getRank()}</Text>
          <Text style={styles.subtitle}>{profile.visitedCount} країн • {profile.worldPercent}% світу</Text>
        </View>

        {/* Акаунт */}
        {user && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Акаунт</Text>
            <Row label="Email" value={user.email} />
            <Row label="ID" value={user.id?.slice(0, 8) + '...'} />
            <TouchableOpacity style={[styles.signOutBtn, signingOut && styles.disabled]} onPress={handleSignOut} disabled={signingOut}>
              {signingOut ? <ActivityIndicator color="#c62828" /> : <Text style={styles.signOutTxt}>🚪 Вийти з акаунту</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Безпека */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒 Безпека</Text>
          <View style={styles.bioRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bioLabel}>Біометричний вхід</Text>
              <Text style={styles.bioSub}>
                {bioInfo.available ? `${bioInfo.label} — запитувати при відкритті` : 'Недоступна на цьому пристрої'}
              </Text>
            </View>
            <Switch value={bioEnabled} onValueChange={toggleBio} disabled={!bioInfo.available} trackColor={{ true: '#2e7d32' }} />
          </View>
        </View>

        {/* Додати друга */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎁 Додати друга</Text>
          <Text style={styles.hint}>Встав посилання або токен з запрошення</Text>
          <TextInput
            style={styles.tokenInput} value={inviteToken}
            onChangeText={t => setInviteToken(t.toUpperCase())}
            placeholder="travelmap://invite/... або токен"
            placeholderTextColor="#bbb" autoCapitalize="characters" autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.actionBtn, (!inviteToken.trim() || acceptingInvite) && styles.disabled]}
            onPress={handleAcceptInvite} disabled={!inviteToken.trim() || acceptingInvite}
          >
            {acceptingInvite ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnTxt}>✅ Додати в друзі</Text>}
          </TouchableOpacity>
        </View>

        {/* Статистика */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Статистика</Text>
          <Row label="Відвідано країн" value={profile.visitedCount} />
          <Row label="У мріях" value={profile.dreamCount} />
          <Row label="Досягнень" value={`${profile.achievementsUnlocked} / ${ACHIEVEMENTS.length}`} />
        </View>

        {/* По континентах */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌍 За континентами</Text>
          {Object.keys(CONTINENT_COUNTS).map(continent => (
            <Row key={continent} label={continent} value={`${perContinent[continent] || 0} / ${CONTINENT_COUNTS[continent]}`} />
          ))}
        </View>

        {/* Відвідані */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Відвідані країни</Text>
          {visited.length === 0
            ? <Text style={styles.empty}>Познач першу країну на мапі!</Text>
            : visited.map(c => <Text key={c.id} style={styles.listItem}>• {c.name}</Text>)}
        </View>

        {/* Мрії */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💭 Мрії</Text>
          {dream.length === 0
            ? <Text style={styles.empty}>Додай країни до списку мрій.</Text>
            : dream.map(c => <Text key={c.id} style={styles.listItem}>• {c.name}</Text>)}
        </View>

        {/* Тестер діплинків */}
        <TouchableOpacity style={styles.dlToggle} onPress={() => { setShowDeeplinks(v => !v); setDlParseResult(null); }}>
          <Text style={styles.dlToggleTxt}>🔗 Тестер діплинків {showDeeplinks ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDeeplinks && (
          <View style={styles.card}>
            <Text style={styles.hint}>Введи URL і натисни «Відкрити» — симулює перехід за посиланням</Text>
            <TextInput
              style={styles.dlInput} value={dlUrl} onChangeText={setDlUrl}
              placeholder="travelmap://..." autoCapitalize="none" autoCorrect={false}
            />
            <View style={styles.dlBtnRow}>
              <TouchableOpacity style={styles.dlPrimaryBtn} onPress={handleDlOpen}>
                <Text style={styles.dlPrimaryTxt}>▶ Відкрити</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dlSecBtn} onPress={handleDlParse}>
                <Text style={styles.dlSecTxt}>🔍 Розібрати</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dlSecBtn} onPress={handleDlShare}>
                <Text style={styles.dlSecTxt}>📤</Text>
              </TouchableOpacity>
            </View>
            {dlParseResult !== null && (
              <View style={styles.dlResult}>
                <Text style={styles.dlResultLabel}>Результат parseURL():</Text>
                <Text style={styles.dlCode}>
                  {dlParseResult ? JSON.stringify(dlParseResult, null, 2) : 'null (URL не розпізнано)'}
                </Text>
              </View>
            )}
            <Text style={[styles.hint, { marginTop: 12 }]}>Готові приклади:</Text>
            {DEEPLINK_PRESETS.map(p => (
              <TouchableOpacity key={p.url} style={styles.preset} onPress={() => { setDlUrl(p.url); setDlParseResult(null); }}>
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={styles.presetUrl}>{p.url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.resetBtn} onPress={confirmReset}>
          <Text style={styles.resetTxt}>Скинути все</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0f2f1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTxt: { fontSize: 40 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '700' },
  nameEditHint: { fontSize: 14, color: '#999' },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  nameInput: { flex: 1, borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 16, backgroundColor: '#f9f9f9' },
  saveNameBtn: { backgroundColor: '#2e7d32', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  saveNameTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelNameBtn: { padding: 6 },
  cancelNameTxt: { color: '#999', fontSize: 16 },
  rank: { fontSize: 16, fontWeight: '500', color: '#2e7d32', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  card: { backgroundColor: '#fff', margin: 10, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#555', fontSize: 14 },
  rowValue: { color: '#111', fontWeight: '600', fontSize: 14 },
  bioRow: { flexDirection: 'row', alignItems: 'center' },
  bioLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
  bioSub: { fontSize: 13, color: '#888', marginTop: 2 },
  hint: { fontSize: 13, color: '#888', marginBottom: 10 },
  tokenInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, color: '#333', backgroundColor: '#fafafa', marginBottom: 10, letterSpacing: 1 },
  actionBtn: { backgroundColor: '#2e7d32', padding: 13, borderRadius: 10, alignItems: 'center' },
  actionBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { color: '#999', fontStyle: 'italic' },
  listItem: { fontSize: 14, paddingVertical: 3, color: '#333' },
  disabled: { opacity: 0.4 },
  signOutBtn: { marginTop: 12, padding: 12, backgroundColor: '#ffebee', borderRadius: 10, alignItems: 'center' },
  signOutTxt: { color: '#c62828', fontWeight: '700' },
  dlToggle: { marginHorizontal: 10, marginTop: 4, marginBottom: 2, padding: 14, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  dlToggleTxt: { fontSize: 15, fontWeight: '600', color: '#555' },
  dlInput: { backgroundColor: '#f7f7f7', padding: 12, borderRadius: 8, fontSize: 13, fontFamily: 'monospace', borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  dlBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dlPrimaryBtn: { flex: 2, backgroundColor: '#5f5df8', padding: 12, borderRadius: 8, alignItems: 'center' },
  dlPrimaryTxt: { color: '#fff', fontWeight: '700' },
  dlSecBtn: { flex: 1, backgroundColor: '#e0e0e0', padding: 12, borderRadius: 8, alignItems: 'center' },
  dlSecTxt: { color: '#333', fontWeight: '600', fontSize: 13 },
  dlResult: { marginTop: 8 },
  dlResultLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 4 },
  dlCode: { fontFamily: 'monospace', fontSize: 12, backgroundColor: '#f7f7f7', padding: 10, borderRadius: 6, color: '#333' },
  preset: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  presetLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  presetUrl: { fontSize: 11, fontFamily: 'monospace', color: '#5f5df8', marginTop: 2 },
  resetBtn: { margin: 16, padding: 14, backgroundColor: '#ffebee', borderRadius: 10, alignItems: 'center' },
  resetTxt: { color: '#c62828', fontWeight: '600' },
});