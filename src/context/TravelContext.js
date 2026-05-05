import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { loadMeta, saveMeta, META_KEYS, loadData, saveData, KEYS } from '../utils/storage';
import { sendAchievementNotification } from '../utils/notifications';
import { ACHIEVEMENTS } from '../data/achievements';
import CountryRepository from '../repositories/CountryRepository';
import AchievementRepository from '../repositories/AchievementRepository';
import { useAuth } from './AuthContext';

const TravelContext = createContext(null);

const countryRepo = new CountryRepository();
const achievementRepo = new AchievementRepository();
countryRepo.onSyncComplete = null;

export function TravelProvider({ children }) {
  const { user } = useAuth();
  const [visited, setVisited] = useState([]);
  const [dream, setDream] = useState([]);
  const [regions, setRegions] = useState({});
  const [loaded, setLoaded] = useState(false);

  const [notifiedAchievements, setNotifiedAchievements] = useState([]);
  const [pendingToast, setPendingToast] = useState(null);
  const toastQueue = useRef([]);

  // ============================================================
  // Початкове завантаження (локалка) — один раз
  // ============================================================
  useEffect(() => {
    (async () => {
      await migrateLegacyData();
      const allCountries = await countryRepo.getAll();
      setVisited(allCountries.filter(c => c.visited).map(toLegacy));
      setDream(allCountries.filter(c => c.isDream).map(toLegacy));
      const rawRegions = await loadData(KEYS.REGIONS, {});
      setRegions(normalizeRegions(rawRegions));
      const n = await loadMeta(META_KEYS.NOTIFIED_ACHIEVEMENTS, []);
      setNotifiedAchievements(n);
      setLoaded(true);
    })();
  }, []);

  // ============================================================
  // Pull з Supabase при логіні
  // ============================================================
  useEffect(() => {
    if (!user || !loaded) return;
    (async () => {
      try {
        await countryRepo.pullFromServer();
        const all = await countryRepo.getAll();
        setVisited(all.filter(c => c.visited).map(toLegacy));
        setDream(all.filter(c => c.isDream).map(toLegacy));
      } catch (e) {
        console.warn('Pull from server failed:', e.message);
      }
    })();
  }, [user, loaded]);

  useEffect(() => { if (loaded) saveData(KEYS.REGIONS, regions); }, [regions, loaded]);
  useEffect(() => { if (loaded) saveMeta(META_KEYS.NOTIFIED_ACHIEVEMENTS, notifiedAchievements); }, [notifiedAchievements, loaded]);

  const showNextToast = () => {
    if (toastQueue.current.length > 0) setPendingToast(toastQueue.current.shift());
  };

  const hideToast = () => {
    setPendingToast(null);
    setTimeout(showNextToast, 300);
  };

  const queueToast = (achievement) => {
    toastQueue.current.push(achievement);
    if (!pendingToast) showNextToast();
  };

  const checkAchievements = (newVisited) => {
    for (const ach of ACHIEVEMENTS) {
      if (notifiedAchievements.includes(ach.id)) continue;
      if (ach.check(newVisited)) {
        setNotifiedAchievements(prev => [...prev, ach.id]);
        sendAchievementNotification(ach).catch(() => {});
        queueToast(ach);
      }
    }
  };

  const toggleRegion = (countryId, regionName) => {
    setRegions(prev => {
      const current = prev[countryId] || [];
      const exists = current.find(r => r.name === regionName);
      return {
        ...prev,
        [countryId]: exists
          ? current.filter(r => r.name !== regionName)
          : [...current, { name: regionName, note: '', photos: [] }],
      };
    });
  };

  const updateRegionNote = (countryId, regionName, note) => {
    setRegions(prev => ({
      ...prev,
      [countryId]: (prev[countryId] || []).map(r =>
        r.name === regionName ? { ...r, note } : r
      ),
    }));
  };

  const addRegionPhoto = (countryId, regionName, uri) => {
    setRegions(prev => ({
      ...prev,
      [countryId]: (prev[countryId] || []).map(r =>
        r.name === regionName ? { ...r, photos: [...(r.photos || []), uri] } : r
      ),
    }));
  };

  const removeRegionPhoto = (countryId, regionName, uri) => {
    setRegions(prev => ({
      ...prev,
      [countryId]: (prev[countryId] || []).map(r =>
        r.name === regionName ? { ...r, photos: r.photos.filter(p => p !== uri) } : r
      ),
    }));
  };

  const updateStateFromRepo = async () => {
    countryRepo.onSyncComplete = updateStateFromRepo;
    const all = await countryRepo.getAll();
    const newVisited = all.filter(c => c.visited).map(toLegacy);
    setVisited(newVisited);
    setDream(all.filter(c => c.isDream).map(toLegacy));
    checkAchievements(newVisited);
  };

  const toggleVisited = async (id, name) => {
    const existing = await countryRepo.getById(id);
    if (existing?.visited) { await countryRepo.delete(id); await updateStateFromRepo(); return; }
    await countryRepo.save({ id, name, continent: existing?.continent || '', visited: true, isDream: false, dateVisited: new Date(), note: '', photos: [], syncStatus: 'pending' });
    await updateStateFromRepo();
  };

  const toggleDream = async (id, name) => {
    const existing = await countryRepo.getById(id);
    if (existing?.isDream) { await countryRepo.delete(id); await updateStateFromRepo(); return; }
    await countryRepo.save({ id, name, continent: existing?.continent || '', visited: false, isDream: true, dateVisited: null, note: '', photos: [], syncStatus: 'pending' });
    await updateStateFromRepo();
  };

  const updateNote = async (listType, id, note) => {
    const existing = await countryRepo.getById(id);
    if (!existing) return;
    await countryRepo.save({ ...existing, note, syncStatus: 'pending' });
    await updateStateFromRepo();
  };

  const addCountryPhoto = async (id, uri) => {
    let existing = await countryRepo.getById(id);
    if (!existing) {
      existing = { id, name: 'Unknown', continent: '', visited: true, isDream: false, dateVisited: new Date(), note: '', photos: [], syncStatus: 'pending' };
      await countryRepo.save(existing);
    }
    await countryRepo.save({ ...existing, photos: [...(existing.photos || []), uri], syncStatus: 'pending' });
    await updateStateFromRepo();
  };

  const removeCountryPhoto = async (id, uri) => {
    const existing = await countryRepo.getById(id);
    if (!existing) return;
    await countryRepo.save({ ...existing, photos: (existing.photos || []).filter(p => p !== uri), syncStatus: 'pending' });
    await updateStateFromRepo();
  };

  const resetAll = async () => {
    const all = await countryRepo.getAll();
    for (const c of all) {
      await countryRepo.delete(c.id);
    }
    setVisited([]);
    setDream([]);
    setRegions({});
    setNotifiedAchievements([]);
    toastQueue.current = [];
    setPendingToast(null);
  };

  const syncPending = async () => {
    try {
      const result = await countryRepo.syncPending();
      // Після push - ще раз pull, щоб підхопити можливі зміни з інших пристроїв
      await countryRepo.pullFromServer();
      await updateStateFromRepo();
      return result;
    } catch (e) {
      console.warn('syncPending error:', e.message);
      return { synced: 0, failed: 0 };
    }
  };

  return (
    <TravelContext.Provider value={{
      visited, dream, regions, loaded,
      pendingToast, hideToast,
      toggleVisited, toggleDream, updateNote,
      toggleRegion, updateRegionNote, addRegionPhoto, removeRegionPhoto,
      addCountryPhoto, removeCountryPhoto, resetAll,
      syncPending,
    }}>
      {children}
    </TravelContext.Provider>
  );
}

export function useTravel() {
  const ctx = useContext(TravelContext);
  if (!ctx) throw new Error('useTravel must be used inside TravelProvider');
  return ctx;
}

function toLegacy(country) {
  return {
    id: country.id,
    name: country.name,
    note: country.note || '',
    photos: country.photos || [],
    ...(country.visited && country.dateVisited ? { date: country.dateVisited.toISOString ? country.dateVisited.toISOString() : country.dateVisited } : {}),
  };
}

function normalizeRegions(raw) {
  const result = {};
  for (const countryId in raw) {
    result[countryId] = raw[countryId].map(r =>
      typeof r === 'string'
        ? { name: r, note: '', photos: [] }
        : { name: r.name, note: r.note || '', photos: r.photos || [] }
    );
  }
  return result;
}

async function migrateLegacyData() {
  try {
    const existing = await countryRepo.getAll();
    if (existing.length > 0) return;
    const oldVisited = await loadData(KEYS.VISITED, []);
    const oldDream = await loadData(KEYS.DREAM, []);
    for (const v of oldVisited) {
      await countryRepo.save({ id: v.id, name: v.name, continent: '', visited: true, isDream: false, dateVisited: new Date(), note: v.note || '', photos: [], syncStatus: 'synced' });
    }
    for (const d of oldDream) {
      await countryRepo.save({ id: d.id, name: d.name, continent: '', visited: false, isDream: true, dateVisited: null, note: d.note || '', photos: [], syncStatus: 'synced' });
    }
  } catch (e) {
    console.warn('Migration failed:', e.message);
  }
}