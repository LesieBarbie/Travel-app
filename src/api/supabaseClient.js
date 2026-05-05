import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase Client.
 *
 * Підключається до бекенду на Supabase (PostgreSQL + Auth).
 * Сесія зберігається в AsyncStorage.
 *
 * + Глобальний прапорець "Демо-офлайн": коли він увімкнений, усі запити
 *   падають з помилкою як ніби немає інтернету. Це дозволяє показати,
 *   як працює offline-first без потреби вмикати справжній авіарежим.
 */

const SUPABASE_URL = 'https://vhnqxulobzyaawqsjoqf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sXQj5LDL1ZcsbDFabKN5eA_Tya40eWW';

// =====================================================
// Глобальний прапорець "Демо-офлайн"
// =====================================================
let demoOffline = false;
const offlineListeners = [];

export function setDemoOffline(value) {
  demoOffline = !!value;
  offlineListeners.forEach((cb) => {
    try { cb(demoOffline); } catch {}
  });
}

export function getDemoOffline() {
  return demoOffline;
}

export function subscribeDemoOffline(cb) {
  offlineListeners.push(cb);
  return () => {
    const idx = offlineListeners.indexOf(cb);
    if (idx >= 0) offlineListeners.splice(idx, 1);
  };
}

// =====================================================
// Власний fetch, який падає коли demoOffline=true
// =====================================================
const offlineAwareFetch = (url, options) => {
  if (demoOffline) {
    return Promise.reject(new Error('Demo offline mode'));
  }
  return fetch(url, options);
};

// =====================================================
// Supabase client
// =====================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: offlineAwareFetch,
  },
});